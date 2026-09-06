const AppError = require('@middleware/AppError');
const { Diary } = require('@models');
const { createDiaryDTO, updateDiaryDTO, diaryIdDTO } = require('@dto/diary.dto');
const { diaryDetail, diaryList } = require('@vo/diary.vo');
const { resolveImageIdByUrl } = require('@utils/image');

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
  const payload = { content: data.content };

  // images[0] 即封面：URL → image_id 派生（外链/无效 URL 为 null）
  if (data.images !== undefined) {
    payload.images = data.images;
    payload.cover_image_id = await resolveImageIdByUrl(data.images[0]);
  }

  const diary = await Diary.create(payload);
  res.status(201).json({ id: diary.diary_id, message: '创建成功' });
};

exports.updateDiary = async (req, res) => {
  const id = diaryIdDTO(req.params);
  const diary = await Diary.findByPk(id);
  if (!diary) throw new AppError(404, '日记不存在');
  const data = updateDiaryDTO(req.body);

  // 封面变更后旧图失去引用，由 GC 对账回收
  if (data.images !== undefined) {
    data.cover_image_id = await resolveImageIdByUrl(data.images[0]);
  }

  await diary.update(data);
  res.json({ id: diary.diary_id, message: '更新成功' });
};

exports.deleteDiary = async (req, res) => {
  const id = diaryIdDTO(req.params);
  const diary = await Diary.findByPk(id);
  if (!diary) throw new AppError(404, '日记不存在');

  // cover_image_id 引用随行消失，物理文件由 GC 对账宽限后回收
  await diary.destroy();

  res.json({ id: diary.diary_id, message: '删除成功' });
};
