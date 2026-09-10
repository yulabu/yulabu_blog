/**
 * 岛内「构建期烘焙数据」的水合后对账。
 *
 * 列表页是预渲染的：页面 frontmatter 在 build 阶段取数并经 props 注入岛，
 * 宿主 HTML 里已经带真实内容。但烘焙数据会随发文过期，而本项目约定
 * 「发新文章无需重新构建」，所以岛挂载后再静默取一次最新数据：
 *
 *   指纹一致 → 完全不动 DOM（零闪烁；绝大多数访问都走这条路径）
 *   指纹不同 → 交给 apply 替换（新文章已出现）
 *   取数失败 → 静默吞掉，烘焙数据仍然可读
 *
 * 指纹按值比较，因此新增/删除/排序变化都能察觉，而与列表数据无关的变化
 * （例如仅 updatedAt 变了）不会触发无谓重绘。
 */

/** 把若干片段拼成指纹；null/undefined 归一为空串 */
export function fingerprint(...parts: unknown[]): string {
  return parts.map((p) => (p == null ? '' : String(p))).join('|')
}

/**
 * 列表指纹：id 序列 + 总数。
 * 需要感知字段级变化时（例如标签的文章数），不要用本函数，在调用处自行拼指纹。
 */
export function listFingerprint(
  list: { id?: number | string }[] | null | undefined,
  total?: number,
): string {
  const ids = (list ?? []).map((item) => item?.id ?? '').join(',')
  return fingerprint(ids, total)
}

interface SilentSyncOptions<T> {
  /** 构建期烘焙数据的指纹；没有烘焙数据时应走正常的加载态分支，别调本函数 */
  baked: string
  /** 客户端取数 */
  load: () => Promise<T | null | undefined>
  /** 从数据算指纹 */
  key: (data: T) => string
  /** 数据确实变了才调用 */
  apply: (data: T) => void
}

/**
 * 创建一个静默对账函数，由组件在 onMounted 里调用。
 * 这里是唯一实现「烘焙数据 + 水合对账」契约的地方，新增预渲染列表页请复用它。
 */
export function createSilentSync<T>(options: SilentSyncOptions<T>) {
  let last = options.baked

  return async function sync(): Promise<void> {
    try {
      const data = await options.load()
      if (data == null) return
      const next = options.key(data)
      if (next === last) return
      last = next
      options.apply(data)
    } catch {
      // 静默：烘焙数据仍可读，不打扰用户（重试交给下次导航或手动刷新）
    }
  }
}
