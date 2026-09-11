## 每日统计（daily_stat）后端方案

### 目标
新增一天一行的站点级聚合表 `daily_stat(stat_date, pv, uv)`，进程内每 10 分钟从 `visit_log` 全量重算（幂等、自愈），图表与历史总量只读 `daily_stat`；`visit_log` 收缩为「写入 + 明细列表 + 今日实时 + 90 天 GC」。首次启动自动回填日志尚存的最多 90 天，此后永久留存。

核心安全点：聚合只 UPSERT `visit_log` 中仍存在的日期，从不写 0 行、从不删除 `daily_stat` 行 → 原始日志过期被删后，该天统计不会被重算覆盖成 0。

### 改动清单
新增：`server/models/DailyStat.js`、`server/utils/dailyStat.js`、`server/utils/date.js`
修改：`server/models/index.js`、`server/scripts/sync-schema.js`、`server/utils/visitGc.js`、`server/app.js`、`server/controllers/adminController.js`、`server/controllers/visitController.js`
不动：所有 DTO/VO、`recordVisit` 写入路径、前端全部、生产库既有表结构（纯增量，零迁移风险）

### 关键实现
1. **模型** `DailyStat`：`stat_date`(DATEONLY, 自然主键) + `pv` + `uv` + timestamps；`sync-schema.js` 追加幂等 CREATE TABLE 分支。
2. **聚合** `utils/dailyStat.js`：`SELECT DATE(created_at), COUNT(*), COUNT(DISTINCT ip_address) FROM visit_log GROUP BY 1`（无 WHERE）→ `DailyStat.bulkCreate(..., { updateOnDuplicate: ['pv','uv'] })`；导出 `aggregateDailyStats`，支持 `node utils/dailyStat.js` 直跑。
3. **北京日 helper** `utils/date.js`：`beijingDateStr` / `shiftDateStr` / `beijingDayStart` —— 修复生产 Node 为 UTC 时「今天」与 `DATE(created_at)` 错开 8 小时的既有隐患，后端只此一处判定日期。
4. **`visitGc.js`**：cutoff 改为保留含今天在内的 90 个完整自然日（自然日对齐是重算幂等成立的前提）。
5. **`app.js`**：聚合任务启动跑一次 + 每 10 分钟一次（`STAT_INTERVAL_MS = 10 * 60 * 1000`）；24h 的 GC 任务内部改为「先聚合再清理」。
6. **图表**：`getDashboardCharts` 的 visitsByDate 改查 `DailyStat`（`stat_date` between 序列，缺日补 0），`dateSeq`/边界改北京日；响应结构与字段名零变化。`range` 白名单扩为 7/30/90/365 天，未知回落 7（前端 7/30 行为不变）。
7. **总量口径**：`totalPV = SUM(pv)`、`totalUV = SUM(uv)`（按天去重求和，已确认接受虚高）；`todayPV/todayUV` 保持实时读 `visit_log` 并修正今日零点时区；`clearAllVisits` 行为不变但补注释（清空日志不再重置总量）。

### 部署
合并代码 → 服务器 `git pull` → `pm2 restart blog-server`（无新依赖）；启动即建表 + 回填。回滚 `git revert` + 重启，表留着无害。建议上线前先备份。

### 验证
- `node utils/dailyStat.js` 与直连 SQL 逐行对数；`TZ=UTC` 再跑一遍验证不依赖进程时区；连跑两遍验证幂等。
- 历史保护实测：改错值 + 删该天日志 + 重跑 → 不被覆盖；补回日志重跑 → 修正。
- 接口：`/api/admin/dashboard/charts?range=7days` 与 `/api/admin/visits/stats` 数值与表一致。

### 已知边界
- 首次上线只能回填最近 90 天，更早历史已物理删除无法找回。
- 跨天 UV 相加会重复计入长期读者（已确认接受）。
- 前端零改动，故「总独立访客」标签暂名不副实，建议后续单独确认改为「累计访客」。