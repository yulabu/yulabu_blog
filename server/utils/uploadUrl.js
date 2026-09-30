// /uploads/ URL 契约的纯函数唯一出处：
//   - 拼接（响应里的图片 URL）→ vo/image.vo.js 用 toUploadUrl
//   - 剥离（业务表存的 URL → image.storage_path）→ services/image/derive.js 用 storagePathFromPathname
// 两侧必须永远认识同一个前缀，所以字面量只在这里出现一次（改前散在 4 处：vo、两个控制器手拼、派生层剥离）。
// 属 utils/：无 I/O、无 DB、无副作用（纯度由 scripts/check-layers.js 断言④ 把关）
const UPLOAD_URL_PREFIX = '/uploads/'

// storage_path → 对外 URL（空值透传，供可空字段用）
function toUploadUrl(storagePath) {
  return storagePath ? UPLOAD_URL_PREFIX + storagePath : null
}

// URL 的 pathname → storage_path；不是本系统的 /uploads/ 路径则返回 null
function storagePathFromPathname(pathname) {
  if (!pathname || !pathname.startsWith(UPLOAD_URL_PREFIX)) return null
  return decodeURIComponent(pathname.slice(UPLOAD_URL_PREFIX.length)) || null
}

module.exports = { UPLOAD_URL_PREFIX, toUploadUrl, storagePathFromPathname }
