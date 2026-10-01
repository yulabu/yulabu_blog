// 出站抓取的 SSRF 守卫（2026-10 加固）。
// 抓取目标来自管理员填的友链 URL，但「管理员可控」不等于可以任打内网：本机跑着
// Nginx/SSR/MariaDB，云上还有元数据地址——所以目标必须是公网，且**每一跳**都要重新校验。
const { warnTagLine } = require('@utils/log');
const dns = require('node:dns').promises;
const ipaddr = require('ipaddr.js');

const TIMEOUT_MS = 8000;
// 响应体积上限：OG 元信息都在 <head> 里，正常页面远小于它；超了说明不是页面或有人在喂大文件
const MAX_BODY_BYTES = 512 * 1024;
// 重定向最多跟几跳（每跳都要重新做 DNS + 私网校验）
const MAX_REDIRECTS = 3;

// 非公网地址段（ipaddr.js 的 range() 取值）。用库而不是手写段表：它覆盖完整，
// 且能正确处理 IPv4-mapped IPv6（::ffff:127.0.0.1 是手写判定最常漏的绕过口）
const BLOCKED_RANGES = new Set([
  'unspecified', 'broadcast', 'multicast', 'linkLocal',
  'loopback', 'private', 'reserved', 'carrierGradeNat', 'uniqueLocal'
]);

// 单地址判定；解析不了的一律当不安全
function isBlockedAddress(ip) {
  try {
    let addr = ipaddr.parse(ip);
    if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
      addr = addr.toIPv4Address();
    }
    return BLOCKED_RANGES.has(addr.range());
  } catch {
    return true;
  }
}

// 解析 host 的全部地址并逐个判定：任一是非公网就拒绝（防 DNS 同时给出公网与内网地址）
async function assertPublicHost(url) {
  const host = url.hostname.replace(/^\[|\]$/g, '');   // IPv6 字面量带方括号
  let addresses;
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    throw new Error(`域名解析失败：${host}`);
  }
  const blocked = addresses.find(a => isBlockedAddress(a.address));
  if (blocked) {
    throw new Error(`目标解析到非公网地址（${blocked.address}），已拒绝`);
  }
}

// 流式读 body 并限制体积（不把大文件整块读进内存）
async function readBodyLimited(response, limit) {
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      throw new Error(`响应超过体积上限（${Math.round(limit / 1024)}KB）`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// 逐跳抓取：redirect:'manual' 让每一跳都过一遍「协议 + 公网地址」校验；
// 改前是 redirect:'follow'，302 一跳就能把请求带去内网
async function fetchPage(startUrl, signal) {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current);

    const response = await fetch(current.href, {
      signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogFriendLinkBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error(`重定向缺少 Location（HTTP ${response.status}）`);
      let next;
      try {
        next = new URL(location, current);
      } catch {
        throw new Error(`重定向地址非法：${location}`);
      }
      if (next.protocol !== 'http:' && next.protocol !== 'https:') {
        throw new Error(`重定向到非 http(s) 协议：${next.protocol}`);
      }
      current = next;
      continue;
    }

    if (!response.ok) throw new Error(`目标返回 HTTP ${response.status}`);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error(`响应不是 HTML（content-type: ${contentType || '未提供'}）`);
    }

    const html = await readBodyLimited(response, MAX_BODY_BYTES);
    return { html, finalUrl: current.href };
  }
  throw new Error(`重定向超过 ${MAX_REDIRECTS} 跳`);
}

// 失败时的空结果（与「页面确实没有图」同形，调用方不必分支）
function emptyMeta() {
  return { title: null, description: null, image: null };
}

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
  // og:image / og:image:url（两种属性顺序）→ 背景图
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

  // favicon → 头像：apple-touch-icon（通常 180px）优先于 shortcut icon（16px 观感差）
  const iconMatch = html.match(
    /<link[^>]+rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i
  ) || html.match(
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i
  ) || html.match(
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i
  ) || html.match(
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i
  );

  let image = null;
  if (ogMatch) {
    image = normalizeImageUrl(ogMatch[1], pageUrl);
  } else if (secureMatch) {
    image = normalizeImageUrl(secureMatch[1], pageUrl);
  }

  let favicon = null;
  if (iconMatch) {
    const iconUrl = normalizeImageUrl(iconMatch[1], pageUrl);
    if (iconUrl && !iconUrl.startsWith('data:')) {
      favicon = iconUrl;
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
    image,
    favicon
  };
}

// 抓取页面 OG 元信息（og:title / og:description / og:image，favicon 兜底）
async function fetchOgMeta(targetUrl) {
  let startUrl;
  try {
    startUrl = new URL(targetUrl);
  } catch {
    console.warn(warnTagLine('og-image', `目标不是合法 URL：${targetUrl}`));
    return emptyMeta();
  }
  if (startUrl.protocol !== 'http:' && startUrl.protocol !== 'https:') {
    console.warn(warnTagLine('og-image', `只支持 http(s) 目标，收到 ${startUrl.protocol}`));
    return emptyMeta();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const { html, finalUrl } = await fetchPage(startUrl, controller.signal);
    // base 用**最终跳**的 URL：初始 URL 经过 302 之后往往不是页面真实地址，相对 og:image 会解析错
    return extractMeta(html, finalUrl);
  } catch (err) {
    // 抓图失败必须留痕：以前这里静默返回全空 meta，与「页面确实没有图」不可区分，
    // 后台点「抓图」没有任何反应时无处可查（AGENTS 写着抓图类错误看 pm2 --err，实际一条都没有）
    const reason = err.name === 'AbortError' ? `请求超时（${TIMEOUT_MS}ms）` : `${err.name || 'Error'}: ${err.message}`;
    console.warn(warnTagLine('og-image', `抓取失败 ${startUrl.href} :: ${reason}`));
    return emptyMeta();
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchOgMeta, isBlockedAddress };