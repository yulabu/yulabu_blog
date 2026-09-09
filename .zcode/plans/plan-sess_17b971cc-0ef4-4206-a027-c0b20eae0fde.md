# 补回发文数柱状图 + 修复悬停闪烁

只改 `frontend/admin/src/components/admin/DashboardTrendChart.vue` 一个文件。

## 闪烁根因
`tooltip.trigger: 'axis'` 下，光标扫过柱子时 echarts 会反复切换柱子的 emphasis 高亮态（高亮→还原→再高亮），每次都触发重绘动画，看起来就是闪烁。项目里饼图已经在用 `emphasis: { disabled: true }` 禁用悬停高亮（现成惯例），柱状图照做即可，**无需拆成两个图表**。

## 具体改动
1. 标题改回「发文与访问趋势」
2. 恢复"发文数"柱状图 series + 左轴（发文数，`minInterval: 1` 保证整数刻度），右轴保持"访问量"，legend 恢复三项，x 轴数据源恢复 `postsByDate`
3. 柱子配色用**浅绿半透明** `rgba(99, 149, 86, 0.35)`（主题主绿的淡化版，写死色值——canvas 不解析 CSS 变量）：柱子作背景衬托，两条实线（主绿 PV / 青绿 UV）叠加其上互不干扰；若柱子也用 0.8 实色绿会和 PV 折线几乎同色难区分
4. 防闪烁双保险：
   - 柱子 series 加 `emphasis: { disabled: true }`（与饼图一致）
   - tooltip 指示器从 `cross` 改为 `shadow`（柱状图惯例：悬浮显示整列阴影区，不存在逐柱高亮切换）
5. 两条折线保持上一轮的主题配色不变

## 验证
`cd frontend/admin && npm run build`（含 vue-tsc）通过；悬停效果建议 `npm run dev` 后到工作台实际滑一遍确认不闪。