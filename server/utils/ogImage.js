const TIMEOUT_MS = 8000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function normalizeImageUrl(imageUrl, pageUrl) {
  try {
    return new URL(imageUrl, pageUrl).href;
  } catch {
    return null;
  }
}

// 基础 HTML 实体解码（标题/描述常用）
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractMeta(html, pageUrl) {
  // og:image / og:image:url（两种属性顺序）
  const ogMatch = html.match(
    /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url)["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|og:image:url)["']/i
  );

  // og:image:secure_url
  const secureMatch = html.match(
    /<meta[^>]+(?:property|name)=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image:secure_url["']/i
  );

  // favicon 兜底（含 apple-touch-icon，忽略 data: URI）
  const iconMatch = html.match(
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i
  ) || html.match(
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i
  ) || html.match(
    /<link[^>]+rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i
  ) || html.match(
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i
  );

  let image = null;
  if (ogMatch) {
    image = normalizeImageUrl(ogMatch[1], pageUrl);
  } else if (secureMatch) {
    image = normalizeImageUrl(secureMatch[1], pageUrl);
  } else if (iconMatch) {
    const iconUrl = normalizeImageUrl(iconMatch[1], pageUrl);
    if (iconUrl && !iconUrl.startsWith('data:')) {
      image = iconUrl;
    }
  }

  const titleMatch = html.match(
    /<meta[^>]+(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:title["']/i
  );

  const descMatch = html.match(
    /<meta[^>]+(?:property|name)=["']og:description["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:description["']/i
  );

  return {
    title: titleMatch ? decodeEntities(titleMatch[1]).trim() : null,
    description: descMatch ? decodeEntities(descMatch[1]).trim() : null,
    image
  };
}

// 抓取页面 OG 元信息（og:title / og:description / og:image，favicon 兜底）
async function fetchOgMeta(targetUrl) {
  let pageUrl;
  try {
    pageUrl = new URL(targetUrl);
    if (pageUrl.protocol !== 'http:' && pageUrl.protocol !== 'https:') {
      return { title: null, description: null, image: null };
    }
  } catch {
    return { title: null, description: null, image: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(pageUrl.href, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogFriendLinkBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    if (!response.ok) return { title: null, description: null, image: null };

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return { title: null, description: null, image: null };
    }

    const html = await response.text();
    return extractMeta(html, pageUrl.href);
  } catch {
    return { title: null, description: null, image: null };
  } finally {
    clearTimeout(timer);
  }
}

// 下载图片为 buffer（content-type 校验 + 大小限制）
async function downloadImage(imageUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogFriendLinkBot/1.0)'
      }
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('image/')) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_SIZE) return null;

    return { buffer, mimeType: contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// 下载后的 buffer 格式分流：统一转成 png（或原样返回标准格式），供 saveImageFile 落盘
// - png/jpg/jpeg/webp：原样返回
// - svg：sharp 原生支持，直接转 png（限宽 800，favicon 一般很小，防超大 svg 转码开销）
// - ico：sharp 不支持，用 icojs 解码取最大帧 png
// - 其他/不可读：null
async function decodeImageBuffer(buffer) {
  const sharp = require('sharp');

  let format = null;
  try {
    const meta = await sharp(buffer).metadata();
    format = meta.format;
  } catch {
    format = null;
  }

  if (['jpeg', 'jpg', 'png', 'webp'].includes(format)) {
    return buffer;
  }

  if (format === 'svg') {
    return sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .png()
      .toBuffer();
  }

  if (format === null) {
    // ico 头魔数校验（00 00 01 00）
    if (buffer.length >= 4 && buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 1 && buffer[3] === 0) {
      const icojs = require('icojs');
      try {
        const images = await icojs.decodeIco(buffer);
        if (!images || images.length === 0) return null;
        const largest = images.reduce((a, b) => (a.width >= b.width ? a : b));
        return Buffer.from(largest.buffer);
      } catch {
        return null;
      }
    }
  }

  return null;
}

module.exports = { fetchOgMeta, downloadImage, decodeImageBuffer };