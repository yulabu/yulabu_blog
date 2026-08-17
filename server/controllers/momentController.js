const path = require('path')
const AppError = require('@middleware/AppError');
const { Op } = require('sequelize');
const { Moment } = require('@models');
const { createMomentDTO, updateMomentDTO, momentIdDTO, listMomentsDTO } = require('@dto/moment.dto');
const { momentDetail, momentList } = require('@vo/moment.vo');
const { saveImage, deleteMomentImages } = require('@utils/image');
const { UPLOAD_DIR } = require('@config/upload');

exports.getPublicMoments = async (req, res) => {
  const { page, limit, offset } = listMomentsDTO(req.query);

  const { rows: moments, count: total } = await Moment.findAndCountAll({
    where: { moment_status: 'show' },
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  res.json({ moments: momentList(moments), total, page, totalPages: Math.ceil(total / limit) });
};

exports.getAdminMoments = async (req, res) => {
  const { page, limit, offset, q } = listMomentsDTO(req.query);

  const where = {};
  if (q) where.moment_content = { [Op.like]: `%${q}%` };

  const { rows: moments, count: total } = await Moment.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  res.json({ moments: momentList(moments), total, page, totalPages: Math.ceil(total / limit) });
};

exports.getMomentById = async (req, res) => {
  const id = momentIdDTO(req.params);
  const moment = await Moment.findByPk(id);
  if (!moment) throw new AppError(404, '碎碎念不存在');
  res.json(momentDetail(moment));
};

exports.createMoment = async (req, res) => {
  const data = createMomentDTO(req.body);
  const moment = await Moment.create(data);
  res.status(201).json({ id: moment.moment_id, message: '创建成功' });
};

exports.updateMoment = async (req, res) => {
  const id = momentIdDTO(req.params);
  const moment = await Moment.findByPk(id);
  if (!moment) throw new AppError(404, '碎碎念不存在');
  const data = updateMomentDTO(req.body);
  await moment.update(data);
  res.json({ id: moment.moment_id, message: '更新成功' });
};

exports.deleteMoment = async (req, res) => {
  const id = momentIdDTO(req.params);
  const moment = await Moment.findByPk(id);
  if (!moment) throw new AppError(404, '碎碎念不存在');
  await moment.destroy();
  await deleteMomentImages(id);
  res.json({ id: moment.moment_id, message: '删除成功' });
};

exports.uploadImage = async (req, res) => {
  const id = momentIdDTO(req.params);
  const moment = await Moment.findByPk(id);
  if (!moment) throw new AppError(404, '碎碎念不存在');
  if (!req.file) throw new AppError(400, '没有上传文件');

  // 一条碎碎念只保留一张配图，先清旧图避免孤儿文件
  await deleteMomentImages(id);

  const targetDir = path.join(UPLOAD_DIR, 'moments', String(id));
  const finalName = await saveImage(req.file.buffer, targetDir, req.file.originalname);
  const image = `/uploads/moments/${id}/${finalName}`;

  await moment.update({ moment_image: image });
  res.json({ image, message: '配图上传成功' });
};

exports.removeImage = async (req, res) => {
  const id = momentIdDTO(req.params);
  const moment = await Moment.findByPk(id);
  if (!moment) throw new AppError(404, '碎碎念不存在');

  await deleteMomentImages(id);
  await moment.update({ moment_image: null });
  res.json({ message: '配图已删除' });
};
