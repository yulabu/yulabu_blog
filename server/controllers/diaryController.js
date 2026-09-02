const AppError = require('@middleware/AppError');
const { Diary } = require('@models');
const { createDiaryDTO, updateDiaryDTO, diaryIdDTO } = require('@dto/diary.dto');
const { diaryDetail, diaryList } = require('@vo/diary.vo');
const { markDiaryImagesOrphan } = require('@utils/image');

exports.getPublicDiaries = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;

  const { count, rows } = await Diary.findAndCountAll({
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  res.json({
    diaries: diaryList(rows),
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize)
  });
};

exports.getAdminDiaries = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;

  const { count, rows } = await Diary.findAndCountAll({
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  res.json({
    diaries: diaryList(rows),
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize)
  });
};

exports.getDiaryById = async (req, res) => {
  const id = diaryIdDTO(req.params);
  const diary = await Diary.findByPk(id);
  if (!diary) throw new AppError(404, '日记不存在');
  res.json(diaryDetail(diary));
};

exports.createDiary = async (req, res) => {
  const data = createDiaryDTO(req.body);
  const diary = await Diary.create(data);
  res.status(201).json({ id: diary.diary_id, message: '创建成功' });
};

exports.updateDiary = async (req, res) => {
  const id = diaryIdDTO(req.params);
  const diary = await Diary.findByPk(id);
  if (!diary) throw new AppError(404, '日记不存在');
  const data = updateDiaryDTO(req.body);
  await diary.update(data);
  res.json({ id: diary.diary_id, message: '更新成功' });
};

exports.deleteDiary = async (req, res) => {
  const id = diaryIdDTO(req.params);
  const diary = await Diary.findByPk(id);
  if (!diary) throw new AppError(404, '日记不存在');

  await markDiaryImagesOrphan(id);
  await diary.destroy();

  res.json({ id: diary.diary_id, message: '删除成功' });
};
