// 友链域的领域规则：抓图结果的合并策略（2026-10 从 friendLinkController 下沉，判据④领域派生）。
//
// 规则（与改前逐字一致，只是搬了家）：
//   - og:image（背景图）：抓到就覆盖写 —— 「重新抓图」就是刷新背景图的手段
//   - favicon（头像）：仅当前为空时填；手填值不覆盖（清空后可重抓）
//   - name / description：仅当前为空时用 og:title / og:description 填，按字段上限截断
//   - **没有可写入的图时整段跳过**（不自动填名字/简介），只回报抓取结果
// 返回结构化结果，响应文案由 vo/friendLink.vo.js 的 previewResultVO 组装（服务不认识 HTTP）。
const { fetchOgMeta } = require('@services/ogImage');

// 截断上限与 friend_link 的列宽、DTO 校验同源（name STRING(32) / description STRING(128)）
const NAME_MAX = 32;
const DESC_MAX = 128;

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) : str;
}

// 抓取并应用（失败不抛：抓不到只影响提示文案，接口仍是 200 的成功语义——前端照旧刷新列表）。
// keptAvatar = 抓到了 favicon 但头像已有手填值（用于提示「清空后可重抓」）
async function applyPreview(link) {
  const meta = await fetchOgMeta(link.url);
  const avatarFilled = Boolean(meta.favicon) && !link.avatar;
  const filledPreview = Boolean(meta.image);
  const keptAvatar = Boolean(meta.favicon) && !avatarFilled;

  if (!filledPreview && !avatarFilled) {
    return {
      ok: meta.ok,
      reason: meta.reason,
      title: null,
      description: null,
      avatar: link.avatar || null,
      previewImage: link.preview_image || null,
      filledAvatar: false,
      filledPreview: false,
      keptAvatar
    };
  }

  const title = meta.title ? truncate(meta.title.trim(), NAME_MAX) : null;
  const description = meta.description ? truncate(meta.description.trim(), DESC_MAX) : null;

  const updateData = {};
  if (filledPreview) updateData.preview_image = meta.image;
  if (avatarFilled) updateData.avatar = meta.favicon;
  if (!link.name && title) updateData.name = title;
  if (!link.description && description) updateData.description = description;
  await link.update(updateData);

  return {
    ok: meta.ok,
    reason: meta.reason,
    title,
    description,
    avatar: link.avatar || null,
    previewImage: link.preview_image || null,
    filledAvatar: avatarFilled,
    filledPreview,
    keptAvatar
  };
}

module.exports = { applyPreview };
