function diaryDetail(diary) {
  return {
    id: diary.diary_id,
    content: diary.content,
    images: diary.images || [],
    created_at: diary.createdAt,
    updated_at: diary.updatedAt,
    // 封面缩略图（400px）：日记书架的书脊纹理与抽出的封面卡都用它，原图留给展开的
    // 日记本内页。取不到时为 null（外链封面、没有 image 记录的老数据，以及未 include
    // coverImage 的查询），前端一律 `coverThumb || images[0]` 回退。
    coverThumb:
      diary.coverImage && diary.coverImage.thumb_path
        ? `/uploads/${diary.coverImage.thumb_path}`
        : null
  };
}

function diaryList(diaries) {
  return diaries.map(diaryDetail);
}

module.exports = { diaryDetail, diaryList };
