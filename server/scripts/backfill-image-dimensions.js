// 回填 image.width / image.height（历史图）：新上传已由 services/image/store.js 写入，
// 老图从这里按磁盘原图补。幂等：只处理缺尺寸/尺寸为 0 的行，可反复执行。
//
// 尺寸口径是 EXIF 旋转后的实际像素：上传时 .rotate() 已把方向写进像素，
// 这里读的是已落盘的 WebP，metadata 即最终尺寸。
require('../bootstrap');
const path = require('path');
const sharp = require('sharp');
const { Op } = require('sequelize');
const { sequelize } = require('@config/database');
const { Image } = require('@models');
const { UPLOAD_DIR } = require('@config/image');
const { infoLine, warnTagLine, errTagLine } = require('@utils/log');
const syncSchema = require('./sync-schema');

async function readSize(rel) {
  if (!rel) return null;
  try {
    const meta = await sharp(path.join(UPLOAD_DIR, rel)).metadata();
    if (meta.width > 0 && meta.height > 0) {
      return { width: meta.width, height: meta.height };
    }
  } catch (e) {
    // 文件可能已被 GC 回收；交给调用处记 warn，不阻断整批回填
  }
  return null;
}

async function backfillImageDimensions() {
  // 老库的列由同一条幂等结构同步补齐（与 app.js 启动时同一函数）
  await syncSchema();

  const rows = await Image.findAll({
    where: {
      [Op.or]: [{ width: null }, { height: null }, { width: 0 }, { height: 0 }]
    },
    order: [['image_id', 'ASC']]
  });

  let filled = 0;
  let missing = 0;
  for (const image of rows) {
    const dims = await readSize(image.storage_path);
    if (!dims) {
      missing += 1;
      console.warn(warnTagLine('image-dimensions', `原图缺失或不可读: image_id=${image.image_id}`));
      continue;
    }
    await image.update(dims);
    filled += 1;
  }

  return { scanned: rows.length, filled, missing };
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      const result = await backfillImageDimensions();
      console.log(
        infoLine(
          'image-dimensions',
          `完成：扫描 ${result.scanned}，回填 ${result.filled}，缺文件 ${result.missing}`
        )
      );
      await sequelize.close();
    } catch (e) {
      console.error(errTagLine('image-dimensions', `失败: ${e.message}`));
      process.exit(1);
    }
  })();
}

module.exports = backfillImageDimensions;
