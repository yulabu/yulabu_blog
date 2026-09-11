/**
 * 刊头（WelcomeBanner）打字机文案表。
 *
 * 维护入口就在这个文件：想改哪一页的文案，改对应 key 的数组即可，
 * 增删句子都可以（数组长度不限，3~5 句观感最好）。
 *
 * 约定：**每个数组的第一句 = 该页原先的静态副标题**。
 * 首帧（SSR / 无 JS）显示的就是第一句，打字机由 Vue 挂载后才接管，
 * 所以爬虫与无 JS 访客读到的仍是「文章归档」这类页面标签，不会是一片空白。
 *
 * 写作约束：**每句控制在 16 个汉字以内**。副标题容器高度固定 1.3em，
 * 超长会在中等宽度下换行并溢出去压到下边的内容。
 *
 * 新增页面：这里加一个 key，调用处传 variant="<key>"（见 components/astro/PageFrame.astro
 * 与 components/common/SitePageFrame.vue）。忘了传就落到 home 那组。
 */
export type BannerVariant =
  | 'home'
  | 'archive'
  | 'diary'
  | 'about'
  | 'friends'
  | 'columns'
  | 'column-detail'
  | 'post-detail'

export const BANNER_TEXTS: Record<BannerVariant, readonly string[]> = {
  // 首页（HomeHero）
  home: ['欢迎来到鱼辣不的小窝', '记录生活，分享图片', '愿每一次思考都有思考'],

  // /archive
  archive: ['我写了很多东西吧，你要看看吗？', '时间真快啊', '回头看看，啥也没干，啥也干了', '我想把生活过成宏伟的篇'],

  // /diary
  diary: ['你要看我的日记？给你了', '今天也有好好生活呢', '有点累，但很充实', '不必深刻，真实就好'],

  // /about
  about: ['你想了解我吗？', '一个喜欢折腾纳西妲的人', '睡多了就写点东西', '这是我真实的一部分'],

  // /friends
  friends: ['你想认识我的朋友吗？', '他们都很有趣', '我也想认识你呢', '我们都是有趣的人……大概'],
  // /columns
  columns: ['来看看我的专栏', '我收录了一些文章', '我应该好好分类了吧', '不成体系地讲不清楚一件事'],

  // /columns/[id]
  'column-detail': ['你真进来看了啊', '一段可以慢慢走完的长路', '你可以从第一篇开始读'],

  // /post/[id]
  'post-detail': ['愿你有所得', '慢一点读，不着急', '读到这里……就读到这里吧'],
}

export const DEFAULT_BANNER_VARIANT: BannerVariant = 'home'

/** variant 取文案；未知或空值落到首页那组，保证永远有内容可渲染 */
export function resolveBannerTexts(variant?: string | null): readonly string[] {
  const texts = variant ? BANNER_TEXTS[variant as BannerVariant] : undefined
  return texts?.length ? texts : BANNER_TEXTS[DEFAULT_BANNER_VARIANT]
}
