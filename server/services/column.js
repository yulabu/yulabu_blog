// 专栏域的服务层：计数聚合（判据①）与三处多表写（判据②，都带事务）。
const { Op } = require('sequelize');
const { sequelize, Column, ColumnPost } = require('@models');

// 各专栏的文章数（GROUP BY 聚合）→ { column_id: count }。
// 控制器按「一组专栏」批量取，避免每行一次查询
async function countPostsByColumn(columns) {
  const ids = columns.map(c => c.column_id);
  if (!ids.length) return {};

  const rows = await ColumnPost.findAll({
    where: { column_id: { [Op.in]: ids } },
    attributes: ['column_id', [sequelize.fn('COUNT', sequelize.col('post_id')), 'cnt']],
    group: ['column_id'],
    raw: true
  });

  const countMap = {};
  for (const row of rows) countMap[row.column_id] = Number(row.cnt);
  return countMap;
}

// 删除专栏：连带清掉专栏-文章关联行（同一事务，判据②）
async function deleteWithPosts(columnId) {
  await sequelize.transaction(async (t) => {
    await ColumnPost.destroy({ where: { column_id: columnId }, transaction: t });
    await Column.destroy({ where: { column_id: columnId }, transaction: t });
  });
}

// 把文章放进专栏：先跨专栏去重（一篇文章只属于一个专栏），再追加到末尾。
// 取 max(sort_order) 与插入必须在同一事务里，否则并发添加会拿到同一个序号
async function movePostToColumn(columnId, postId) {
  await sequelize.transaction(async (t) => {
    await ColumnPost.destroy({ where: { post_id: postId }, transaction: t });
    const max = await ColumnPost.max('sort_order', { where: { column_id: columnId }, transaction: t });
    await ColumnPost.create({
      column_id: columnId,
      post_id: postId,
      sort_order: (max || 0) + 1
    }, { transaction: t });
  });
}

// 按数组序重写专栏内顺序（拖拽保存）；整体一个事务，避免半新半旧
async function reorderPosts(columnId, postIds) {
  await sequelize.transaction(async (t) => {
    for (let i = 0; i < postIds.length; i++) {
      await ColumnPost.update(
        { sort_order: i + 1 },
        { where: { column_id: columnId, post_id: postIds[i] }, transaction: t }
      );
    }
  });
}

module.exports = { countPostsByColumn, deleteWithPosts, movePostToColumn, reorderPosts };
