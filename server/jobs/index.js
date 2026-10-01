// 定时任务注册表：谁、多久跑一次、启动是否先跑、谁依赖谁成功。
//
// 为什么要有它：改前这些散在 app.js 里（间隔常量 + runGCSafe/runStatSafe/runVisitGcSafe 三个包装），
// 于是「访问日志清理必须先聚合成功」这条业务约束藏在进程入口的错误兜底里，任务本身没有 CLI，
// 手工触发只能靠 pm2 restart（重启即跑 GC）。现在入口只调 startJobs()，顺序与依赖在这里一眼可读。
//
// 任务对象的约定：
//   run()        自己的进度/失败日志在里面（失败不抛），返回 true/false 表示本次是否成功
//   requires     执行前先跑另一个任务；对方返回 false 则跳过本次（并打 onDependencyFailed 的话）
//   intervalMs   本任务的间隔常量（外部不能定 → 不进 config/，与 GC 保留期同一判据）
//
// 失败隔离：一个任务挂掉不影响 HTTP 服务、也不影响其它任务（register 只调度，异常在任务内被吞并记日志）。
// 刻意不引调度库/任务状态表：任务是幂等自愈的（全量重算 / 三态对账），停机漏跑一次即补上。
const { runImageGc } = require('@jobs/imageGc')
const { runDailyStat } = require('@jobs/dailyStat')
const { runVisitGc } = require('@jobs/visitGc')
const { warnTagLine } = require('@utils/log')

const GC_INTERVAL_MS = 24 * 60 * 60 * 1000
// 每日统计聚合间隔：比 GC 频繁得多，让图表当天数据接近实时
const STAT_INTERVAL_MS = 10 * 60 * 1000

const JOBS = [
  {
    name: 'image-gc',
    intervalMs: GC_INTERVAL_MS,
    run: runImageGc
  },
  {
    name: 'daily-stat',
    intervalMs: STAT_INTERVAL_MS,
    run: runDailyStat
  },
  {
    name: 'visit-gc',
    intervalMs: GC_INTERVAL_MS,
    run: runVisitGc,
    // 清理前必须先聚合当日统计：聚合失败就跳过本次清理，宁可不清理也不能用半截数据覆盖历史行
    requires: 'daily-stat',
    onDependencyFailed: () => console.warn(warnTagLine('visit-gc', '聚合未成功，跳过本次清理'))
  }
]

// 启动所有任务：每个都先跑一次（部署完立刻生效，也让 pm2 日志给出「跑过没跑过」的痕迹），再进周期
function startJobs() {
  for (const job of JOBS) {
    const runSafely = async () => {
      if (job.requires) {
        const dependency = JOBS.find(j => j.name === job.requires)
        if (!(await dependency.run())) return job.onDependencyFailed()
      }
      await job.run()
    }
    runSafely()
    setInterval(runSafely, job.intervalMs)
  }
}

module.exports = { startJobs, JOBS, GC_INTERVAL_MS, STAT_INTERVAL_MS }
