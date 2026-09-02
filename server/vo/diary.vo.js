function diaryDetail(diary) {
  return {
    id: diary.diary_id,
    content: diary.content,
    images: diary.images || [],
    created_at: diary.createdAt,
    updated_at: diary.updatedAt
  };
}

function diaryList(diaries) {
  return diaries.map(diaryDetail);
}

module.exports = { diaryDetail, diaryList };
