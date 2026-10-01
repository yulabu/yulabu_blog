// 定时任务注册表：谁、多久跑一次、启动是否先跑、谁依赖谁成功。
//
// 为什么要有它：改前这些散在 app.js 里（间隔常量 + runGCSafe/runStatSafe/runVisitGcSafe 三个包装），
// 于是「访问日志清理必须先聚合成功」这条业务约束藏在进程入口的错误兜底里，任务本身没有 CLI，
// 手工触发只能靠 pm2 restart（重启即跑 GC）。现在入口只调 startJobs()，顺序与依赖在这里一眼可读。
//
// 任务对象的约定：
//   run()        自己的进度/失败日志在里面（失败不抛），返回 true/false 表示本次是否成功
//   requires     执行前先跑另一个任务；对方失败则跳过本次（并打 onDependencyFailed 的话）
//   intervalMs   本任务的间隔常量（外部不能定 → 不进 config/，与 GC 保留期同一判据）
//   warnAfterMs  单轮耗时超过它补一行 warn（只告警不强杀：JS 里无法安全取消在途 I/O，硬停会留半截状态）
//
// 失败隔离：一个任务挂掉不影响 HTTP 服务、也不影响其它任务（register 只调度，异常在任务内被吞并记日志）。
// 刻意不引调度库/任务状态表：任务是幂等自愈的（全量重算 / 三态对账），停机漏跑一次即补上。
//
// 防护（2026-10 加，见 runGuarded）：
//   ① 重入守卫——同一任务在途时，定时器再触发就跳过并告警；**依赖方调用则复用同一轮结果**。
//      改前 visit-gc 的依赖调用与 daily-stat 的首跑会各起一次全量聚合（每次进程启动必双跑）
//   ② 连续失败计数——连续失败 ≥2 次补一行 warn，恢复时补一行 info（失败本身仍由任务自己记）
//   ③ 依赖名保护——requires 指向不存在的任务时记 [err] 跳过（改前会在 JOBS.find 处 TypeError）
//   ④ 任务抛异常兜底——契约规定 run() 不抛；真抛了也在这里转成 false + [err]，不把 API 进程带走
const { runImageGc } = require('@jobs/imageGc')
const { runDailyStat } = require('@jobs/dailyStat')
const { runVisitGc } = require('@jobs/visitGc')
const { infoLine, warnTagLine, errTagLine } = require('@utils/log')

const GC_INTERVAL_MS = 24 * 60 * 60 * 1000
// 每日统计聚合间隔：比 GC 频繁得多，让图表当天数据接近实时
const STAT_INTERVAL_MS = 10 * 60 * 1000

const JOBS = [
  {
    name: 'image-gc',
    intervalMs: GC_INTERVAL_MS,
    // 全表对账 + 逐张删文件 + 逐草稿事务；正常情况下远小于它，超了说明数据量或 IO 异常
    warnAfterMs: 30 * 60 * 1000,
    run: runImageGc
  },
  {
    name: 'daily-stat',
    intervalMs: STAT_INTERVAL_MS,
    // 全表 GROUP BY；阈值取间隔的 1/5，超了就可能在下一轮开始前还没结束
    warnAfterMs: 2 * 60 * 1000,
    run: runDailyStat
  },
  {
    name: 'visit-gc',
    intervalMs: GC_INTERVAL_MS,
    warnAfterMs: 60 * 1000,
    run: runVisitGc,
    // 清理前必须先聚合当日统计：聚合失败就跳过本次清理，宁可不清理也不能用半截数据覆盖历史行
    requires: 'daily-stat',
    onDependencyFailed: () => console.warn(warnTagLine('visit-gc', '聚合未成功，跳过本次清理'))
  }
]

// 每个任务的运行态：在途 promise（重入守卫）+ 连续失败次数（可观测性）。
// 惰性建条目：验证脚本会往 JOBS 里临时塞桩任务，模块加载时不存在它们
const state = new Map()

function stateOf(job) {
  if (!state.has(job.name)) state.set(job.name, { inflight: null, failures: 0 })
  return state.get(job.name)
}

// 跑一轮任务（带全部防护）。
// asDependency=true 时表示「被另一个任务当作前置」：复用依赖的在途轮次且不把跳过当异常。
// 返回 Promise<boolean>；同一任务在途期间重复调用返回的是同一个 promise。
function runGuarded(job, { asDependency = false } = {}) {
  const s = stateOf(job)

  if (s.inflight) {
    if (!asDependency) {
      console.warn(warnTagLine(job.name, '上一轮尚未结束，跳过本轮（单轮耗时已超过间隔）'))
    }
    return s.inflight
  }

  s.inflight = (async () => {
    if (job.requires) {
      const dependency = JOBS.find(j => j.name === job.requires)
      if (!dependency) {
        console.error(errTagLine(job.name, `依赖任务 ${job.requires} 不存在，跳过本轮`))
        return false
      }
      if (!(await runGuarded(dependency, { asDependency: true }))) {
        job.onDependencyFailed?.()
        return false
      }
    }

    const startedAt = Date.now()
    let ok = false
    try {
      ok = await job.run()
    } catch (err) {
      // 契约规定 run() 自己吞异常；真抛了也不让它变成进程级未捕获异常
      console.error(`${errTagLine(job.name, '任务抛出了异常（契约规定不抛，请修任务）')}\n${err.stack || ''}`)
      ok = false
    }
    const elapsedMs = Date.now() - startedAt

    if (ok === false) {
      s.failures += 1
      if (s.failures >= 2) {
        console.warn(warnTagLine(job.name, `已连续失败 ${s.failures} 次`))
      }
    } else if (s.failures > 0) {
      console.log(infoLine(job.name, `已恢复正常（此前连续失败 ${s.failures} 次）`))
      s.failures = 0
    }

    if (job.warnAfterMs && elapsedMs > job.warnAfterMs) {
      console.warn(warnTagLine(job.name, `单轮耗时 ${Math.round(elapsedMs / 1000)}s，超过预警阈值 ${Math.round(job.warnAfterMs / 1000)}s（不中断，供排查）`))
    }

    return ok
  })().finally(() => {
    s.inflight = null
  })

  return s.inflight
}

// 启动所有任务：每个都先跑一次（部署完立刻生效，也让 pm2 日志给出「跑过没跑过」的痕迹），再进周期
function startJobs() {
  for (const job of JOBS) {
    const onTimer = () => runGuarded(job)
    onTimer()
    setInterval(onTimer, job.intervalMs)
  }
}

// runGuarded 是对外导出的一部分：验证脚本靠它驱动任务而不起定时器
module.exports = { startJobs, runGuarded, JOBS, GC_INTERVAL_MS, STAT_INTERVAL_MS }
