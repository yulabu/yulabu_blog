/**
 * 复制文本到剪贴板（组件级行为，无共享状态）。
 *
 * 唯一实现：此前只有 FriendsView 一处内联写法，分享海报的「复制链接」接棒后按
 * 惯例收口到这里，两处共用。navigator.clipboard 只在安全上下文可用（本站全站
 * HTTPS、本地 dev 是 localhost），与 FriendsView 原实现一致，不做 execCommand 兜底。
 * 成功与否交给调用方决定 toast 文案。
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
