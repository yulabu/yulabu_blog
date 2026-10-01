const AppError = require('@errors/AppError');
const { createTagDTO, updateTagDTO, tagIdDTO } = require('@dto/tag.dto');
const { Post, Tag } = require('@models');
const { tagDetail, tagList } = require('@vo/tag.vo');
// 聚合查询在 service（判据①）：控制器只做 取参 → 调 service → 组装 vo
const { listTagsWithPostCounts } = require('@services/tag');

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
  if(await Tag.findOne({ where: { tag_name: data.tag_name } })) {
    throw new AppError(400, '分类名称已存在');
  }
  const tag = await Tag.create(data);
  res.status(201).json({ id: tag.tag_id, message: '创建成功' });
}

exports.updateTag = async (req, res) => {
  const tagId = tagIdDTO(req.params);
  const tag = await Tag.findByPk(tagId);
  if (!tag) throw new AppError(404, '分类不存在');
  const data = updateTagDTO(req.body);
  await tag.update(data);
  res.json({ id: tag.tag_id, message: '更新成功' });
}

exports.deleteTag = async (req, res) => {
  const tagId = tagIdDTO(req.params);
  const tag = await Tag.findByPk(tagId);
  if (!tag) throw new AppError(404, '分类不存在');
  const postsCount = await Post.count({ where: { post_category_id: tagId } });
  if (postsCount > 0) throw new AppError(400, `该分类下存在${postsCount}篇文章，无法删除`);
  await tag.destroy();
  res.json({ id: tag.tag_id, message: '删除成功' });
}