export interface ImageRef {
  full: string
  rawPath: string
  alt: string
  start: number
  end: number
}

// 提取markdown文档中有关image的语法
export function extractLocalImageRefs(markdown: string): ImageRef[] {
  const regex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  const refs: ImageRef[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(markdown)) !== null) {
    const full = match[0]
    const alt = match[1] || ''
    const rawPath = match[2] || ''
    // 过滤空路径和外链，只保留本地相对路劲
    if (!rawPath || /^[a-z][a-z0-9+.-]*:/i.test(rawPath)) continue
    const start = match.index ?? 0
    // 记录开始和结束的位置
    refs.push({
      full,
      rawPath,
      alt,
      start,
      end: start + full.length
    })
  }

  return refs
}

export function matchImagesByFilename(
  refs: ImageRef[],
  files: FileList | File[]
) {
  const list = Array.from(files).filter((f) =>
    /\.(jpe?g|png|webp)$/i.test(f.name)
  )

  const byName: Record<string, File[]> = {}
  for (const f of list) {
    const arr = byName[f.name] ?? []
    arr.push(f)
    byName[f.name] = arr
  }

  const matched: Array<{ ref: ImageRef; file: File }> = []
  const unmatched: ImageRef[] = []
  const conflicted: ImageRef[] = []

  for (const ref of refs) {
    const decoded = decodeURIComponent(ref.rawPath)
    const basename = decoded.split('/').pop() || decoded
    const candidates = byName[basename] ?? []

    if (candidates.length === 0) {
      unmatched.push(ref)
      continue
    }

    if (candidates.length === 1) {
      matched.push({ ref, file: candidates[0]! })
      continue
    }

    const normalizedRef = decoded.replace(/\\/g, '/')
    const found = candidates.find((f) => {
      const p = (f.webkitRelativePath || f.name).replace(/\\/g, '/')
      return p.endsWith(normalizedRef)
    })

    if (found) {
      matched.push({ ref, file: found })
    } else {
      conflicted.push(ref)
    }
  }

  return { matched, unmatched, conflicted }
}

export function buildMarkdownWithImageUrls(
  markdown: string,
  replacements: Array<{ ref: ImageRef; url: string }>
): string {
  const sorted = [...replacements].sort((a, b) => b.ref.start - a.ref.start)
  let result = markdown

  for (const { ref, url } of sorted) {
    const newFull = ref.full.replace(ref.rawPath, url)
    result = result.slice(0, ref.start) + newFull + result.slice(ref.end)
  }

  return result
}
