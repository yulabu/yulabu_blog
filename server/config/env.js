// 后端唯一读 process.env 的文件（护栏：scripts/check-layers.js。前端 home 的 SSR 另有自己的
// process.env.API_BASE_URL，属另一个包，不在此契约内）。
// 它是 config/ 三层结构的最底层，只做一件事：把环境变量变成「有类型、有默认值」的原始值。
// 刻意不碰业务语义——不 resolve 路径、不派生子目录、不认识时区，那些在 config/<domain>.js 里做；
// 消费者只用 @config/<domain>，不直接 require 本文件（例外仅两处：app.js 的 PORT、seed.js 的初始
// 管理员——它们的「域」就是进程本身）。
//
// 求值时机：所有值在 require 期冻结，所以每个进程入口必须先做
// require('module-alias/register') + require('dotenv').config()，再 require 任何 @config/*；
// 反过来（先 require 业务模块、后设 env）不生效——scripts/check-errors.js 靠注入占位值依赖这条契约。
//
// 必填项缺失直接在这里抛错：配置缺失要表现为「启动失败并说清缺什么」，而不是运行期伪装成别的故障
// （改前缺 JWT_SECRET 时：登录 500，其余后台接口一律回 401「token 无效或已过期」）
function required(key) {
  const raw = process.env[key]
  if (!raw) throw new Error(`缺少必填环境变量 ${key}（对照 server/.env_example）`)
  return raw
}

function str(key, fallback) {
  return process.env[key] || fallback
}

// 数字项口径与改造前逐字一致：Number(x) || fallback（未设、空串、非法值都退化为默认值）
function num(key, fallback) {
  return Number(process.env[key]) || fallback
}

module.exports = {
  // 进程
  port: num('PORT', 3000),

  // 数据库（config/database.js 消费；dump 也用，见那里的 dbConfig）
  db: {
    name: required('DB_NAME'),
    user: required('DB_USER'),
    // 允许空密码：本机开发就是空的（MariaDB root 走 unix_socket），故不设为必填
    password: str('DB_PASSWORD', ''),
    host: str('DB_HOST', '127.0.0.1'),
    // 端口原样透传字符串（不做 Number 转换）：改造前 Sequelize 收到的就是字符串，mysql2 两种都接受
    port: str('DB_PORT', '3306')
  },

  // JWT（config/auth.js 消费）
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: str('JWT_EXPIRES_IN', '7d')
  },

  // 上传与图片（config/image.js 消费）
  image: {
    thumbWidth: num('THUMB_WIDTH', 400),
    quality: num('IMAGE_QUALITY', 85),
    maxFileSize: num('UPLOAD_MAX_SIZE', 5 * 1024 * 1024),
    maxTotalSize: num('UPLOAD_MAX_TOTAL_SIZE', 20 * 1024 * 1024),
    maxFiles: num('UPLOAD_MAX_FILES', 50)
  },

  // 目录类 env 只存原始值（可能 undefined）：解析成绝对路径与默认目录是业务语义，交给各域模块
  paths: {
    uploadDir: process.env.UPLOAD_DIR,
    backupDir: process.env.BACKUP_DIR
  },

  // 备份（config/backup.js 消费）
  backup: {
    keep: num('BACKUP_KEEP', 30)
  },

  // 音乐歌单（config/music.js 消费）——歌单 ID 列表与可选 token，都属「运维经 env 定」
  music: {
    // 逗号分隔的歌单 ID（歌单页 URL 里的 playlist?id=XXXXX）；空 = 音乐功能整体关闭
    playlistIds: str('NETEASE_PLAYLIST_IDS', ''),
    // 可选：MUSIC_U cookie。公开歌单不需要它；填了才能读私有歌单、解析 VIP 曲目直链。
    // 属账号凭据：只出现在这里，不进日志、不进响应、不进错误文案
    cookie: str('NETEASE_COOKIE', ''),
    // 网易云 API 根地址。留作预案：官方接口变更或改走自建 NeteaseCloudMusicApi 实例时改这里
    apiBase: str('NETEASE_API_BASE', 'https://music.163.com'),
    // 可选：固定用这个 IP 充当 X-Real-IP（默认空 = 转发访客真实 IP，见 services/music/netease.js）
    regionIp: str('NETEASE_REGION_IP', '')
  },

  // 初始管理员（seed.js 消费）
  seed: {
    name: str('SEED_ADMIN_NAME', 'yulabu'),
    password: str('SEED_ADMIN_PASSWORD', 'yulabu123')
  }
}
