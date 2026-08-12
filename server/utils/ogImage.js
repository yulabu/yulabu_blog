const TIMEOUT_MS = 8000;

function normalizeImageUrl(imageUrl, pageUrl) {
  try {
    return new URL(imageUrl, pageUrl).href;
  } catch {
    return null;
  }
}

function extractFromHtml(html, pageUrl) {
  // og:image / og:image:url
  const ogMatch = html.match(
    /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url)["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|og:image:url)["']/i
  );
  if (ogMatch) {
    return normalizeImageUrl(ogMatch[1], pageUrl);
  }

  // og:image:secure_url
  const secureMatch = html.match(
    /<meta[^>]+(?:property|name)=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image:secure_url["']/i
  );
  if (secureMatch) {
    return normalizeImageUrl(secureMatch[1], pageUrl);
  }

  // favicon 兜底
  const iconMatch = html.match(
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i
  ) || html.match(
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i
  );
  if (iconMatch) {
    return normalizeImageUrl(iconMatch[1], pageUrl);
  }

  return null;
}

async function fetchOgImage(targetUrl) {
  let pageUrl;
  try {
    pageUrl = new URL(targetUrl);
    if (pageUrl.protocol !== 'http:' && pageUrl.protocol !== 'https:') {
      return null;
    }
  } catch {
    return null;
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

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return null;
    }

    const html = await response.text();
    return extractFromHtml(html, pageUrl.href);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchOgImage };
