// 图片「引用类型」的唯一出处：类型由引用方（业务表）决定，这里只登记类型的**名字**。
//
// 为什么收成一个文件：改前这个名字被手写了三份，且已经互相漂移——
//   ① dto/image.dto.js 的 HTTP 白名单（漏了 diary）
//   ② services/image/refs.js 的 REFERENCE_SOURCES.filterType（正确，含 diary）
//   ③ services/image/refs.js 的 attachReferences 展示标签（把日记封面写成 'cover'）
// 后果：只作日记封面的图在「封面」里筛不到、type=diary 被 400、反查标签又说它是封面。
// 现在三处都从这里取；展示标签另由 refs.js 的 FILTER_TYPE_BY_TABLE（从账本派生）给出。
//
// 新增持图业务 = ① 若确实是新类型，先在这里登记 ② 去 services/image/refs.js 的
// REFERENCE_SOURCES 加一行（表 → 类型）。
//
// 属 utils/：纯常量，无 I/O、无 DB、无副作用（纯度由 scripts/check-layers.js 断言④ 把关）。
// 住这里而不是 config/ 的原因：它是内部领域词汇、外部不能配（config 只收「外部能定的值」）；
// 而 dto 与 services 两层都要用它，utils 是二者唯一可共用的纯内核。
const REF_TYPE = Object.freeze({
  POST_CONTENT: 'post_content', // 文章正文内嵌图（post_image 关联表）
  COVER: 'cover',               // 1:1 封面列（文章 / 专栏）
  DIARY: 'diary'                // 日记封面（diary.cover_image_id）
});

// 顺序即 HTTP 白名单与后台筛图 tab 的顺序
const REF_TYPES = Object.values(REF_TYPE);

// 伪类型：描述的不是「谁引用了它」而是「没人引用」——只用于筛孤儿与删除守卫
const ORPHAN_TYPE = 'other';

// GET /api/admin/images 的 type 参数全集
const IMAGE_LIST_TYPES = [...REF_TYPES, ORPHAN_TYPE];

module.exports = { REF_TYPE, REF_TYPES, ORPHAN_TYPE, IMAGE_LIST_TYPES };
