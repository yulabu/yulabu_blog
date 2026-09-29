// multer（文件上传）错误 → 中文文案。
// multer 的全部错误码见 multer/lib/multer-error.js（共 8 个）。本项目只挂
// upload.array('images', N) 与 upload.single('image')，正常流程只会命中前三个；
// LIMIT_FIELD_KEY / LIMIT_FIELD_VALUE / LIMIT_FIELD_COUNT / LIMIT_PART_COUNT 只有异常
// multipart 才可能触发，不逐码映射，统一落到最后那句中文通用文案（旧实现这里回的是
// multer 的英文原文，例 "Field value too long"）。
const { MulterError } = require('multer');
const { UPLOAD_MAX_FILE_SIZE, UPLOAD_MAX_FILES } = require('@config/image');

// 把字节上限写成「5MB」这类文案，避免提示里只有一句「超过限制」让人不知道上限是多少
function mbText(bytes) {
  return `${Math.round((bytes / (1024 * 1024)) * 100) / 100}MB`;
}

function translateMulterError(err) {
  if (!(err instanceof MulterError)) return null;

  if (err.code === 'LIMIT_FILE_SIZE') {
    return { status: 413, message: `单张图片不能超过 ${mbText(UPLOAD_MAX_FILE_SIZE)}` };
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return { status: 413, message: `单次最多上传 ${UPLOAD_MAX_FILES} 张图片` };
  }
  // 文件字段名不对（或 upload.single 收到多张）。具体字段名各接口不同（images / image），提示里不写死
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return { status: 400, message: '上传字段名不正确，请从页面上传入口重新上传' };
  }
  return { status: 400, message: '上传数据不符合要求，请重新上传' };
}

module.exports = translateMulterError;
