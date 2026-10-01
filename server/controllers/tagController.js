const AppError = require('@errors/AppError');
const { createTagDTO, updateTagDTO, tagIdDTO } = require('@dto/tag.dto');
const { Post, Tag } = require('@models');
const { tagDetail, tagList } = require('@vo/tag.vo');
// 聚合查询与删除守卫在 service（判据①①②）：控制器只做 取参 → 调 service → 组装 vo
const { listTagsWithPostCounts, deleteTagWithGuard } = require('@services/tag');

exports.getTagslist = async (req, res) => {
  res.json(tagList(await listTagsWithPostCounts()));
};

exports.getTagById = async (req, res) => {
  const tagId = tagIdDTO(req.params);
  const tag = await Tag.findByPk(tagId, {include: { model: Post, as: 'posts', attributes: ['post_id', 'post_title'] }});
  if (!tag) throw new AppError(404, '分类不存在');
  res.json(tagDetail(tag));
}

exports.createTag = async (req, res) => {
  const data = createTagDTO(req.body);
  // 唯一性预检：回 409 + 具体文案（并发兜底是 DB 唯一约束 → 翻译表统一 409；两条路状态码必须一致）
  if(await Tag.findOne({ where: { tag_name: data.tag_name } })) {
    throw new AppError(409, '分类名称已存在');
  }
  const tag = await Tag.create(data);
  res.status(201).json({ id: tag.tag_id, message: '创建成功' });
}

exports.updateTag = async (req, res) => {
  const tagId = tagIdDTO(req.params);
  const tag = await Tag.findByPk(tagId);
  if (!tag) throw new AppError(404, '分类不存在');
  const data = updateTagDTO(req.body);

  // 只在新名字确实变了时查重（改成自己原来的名字不算冲突），状态码与创建路径一致为 409
  if (data.tag_name !== undefined && data.tag_name !== tag.tag_name) {
    if (await Tag.findOne({ where: { tag_name: data.tag_name } })) {
      throw new AppError(409, '分类名称已存在');
    }
  }

  await tag.update(data);
  res.json({ id: tag.tag_id, message: '更新成功' });
}

// 删除分类：守卫（分类下还有文章则拒）在 services/tag.js（判据①②）
exports.deleteTag = async (req, res) => {
  const tagId = tagIdDTO(req.params);
  const tag = await deleteTagWithGuard(tagId);
  res.json({ id: tag.tag_id, message: '删除成功' });
}