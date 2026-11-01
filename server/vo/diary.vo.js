const { toUploadUrl } = require('@utils/uploadUrl');

function diaryDetail(diary) {
  return {
    id: diary.diary_id,
    content: diary.content,
    images: diary.images || [],
    created_at: diary.createdAt,
    updated_at: diary.updatedAt,
    // 封面缩略图（400px）：照片卡的冲印图与日记本过渡封面都用它，原图留给展开的
    // 日记本内页与灯箱。取不到时为 null（外链封面、没有 image 记录的老数据，以及未
    // include coverImage 的查询），前端一律 `coverThumb || images[0]` 回退。
    // URL 前缀的唯一出处是 utils/uploadUrl（护栏断言⑦ 守着「别处不许手拼 /uploads/」）
    coverThumb: diary.coverImage ? toUploadUrl(diary.coverImage.thumb_path) : null,
    // 封面原图像素（EXIF 旋转后）：只作 img 的 width/height 预留（照片卡按列宽缩放、
    // 不裁切）；老图未回填/未 include coverImage 时为 null，前端按图片自身比例撑开
    coverWidth: diary.coverImage ? diary.coverImage.width : null,
    coverHeight: diary.coverImage ? diary.coverImage.height : null
  };
}

function diaryList(diaries) {
  return diaries.map(diaryDetail);
}

module.exports = { diaryDetail, diaryList };
