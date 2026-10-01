// 删图（判据②：多步写 + 引用守卫）。
//
// 顺序是刻意的：**先在一个事务里删记录行，再删磁盘文件**。
// 改前 controller 是「先删文件、再删行」——DB 那步失败就会留下「记录还在、文件已没」的断链，
// 前端拿到 404 的图片；反过来的残留（文件在、记录没了）只是磁盘垃圾，且绝不会造成断链。
// 文件删除失败只记日志（GC 也管不到无记录的孤儿文件，但那属于可接受的代价）。
const { Op } = require('sequelize');
const { Image } = require('@models');
const AppError = require('@errors/AppError');
const { ORPHAN_TYPE } = require('@utils/imageRefTypes');
const { findReferencedImageIds } = require('@services/image/refs');
const { deleteImageFiles } = require('@services/image/store');
const { errTagLine } = require('@utils/log');

// 删除给定的图片 id（任一被引用则整体拒绝）；返回删除张数。
// 单张与批量的差别只在控制器的响应形状（{id,message} vs {count,message}）
async function deleteUnreferencedImages(ids) {
  const images = await Image.findAll({ where: { image_id: { [Op.in]: ids } } });
  if (images.length === 0) {
    throw new AppError(404, '图片不存在');
  }

  const referenced = await findReferencedImageIds(ORPHAN_TYPE);
  const bound = images.filter(img => referenced.includes(Number(img.image_id)));
  if (bound.length > 0) {
    throw new AppError(400, images.length === 1
      ? '该图片仍被引用，无法删除'
      : `有 ${bound.length} 张图片仍被引用，无法删除`);
  }

  await Image.destroy({ where: { image_id: { [Op.in]: images.map(img => img.image_id) } } });

  for (const image of images) {
    try {
      await deleteImageFiles(image.storage_path, image.thumb_path);
    } catch (err) {
      // deleteImageFiles 内部已忽略 ENOENT；这里兜底其它异常，避免「删了行却报 500」
      console.error(errTagLine('image-remove', `文件删除失败（记录已删）: ${image.storage_path} :: ${err.message}`));
    }
  }

  return images.length;
}

module.exports = { deleteUnreferencedImages };
