const TIMEOUT_MS = 8000;

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

module.exports = { fetchOgMeta };