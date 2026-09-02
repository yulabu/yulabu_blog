// 本地相对路径拼 /uploads/ 前缀；http 外链原样输出
function imageUrl(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `/uploads/${url}`;
}

function diaryDetail(diary) {
  return {
    id: diary.diary_id,
    content: diary.content,
    images: (diary.images || []).map(imageUrl),
    created_at: diary.createdAt,
    updated_at: diary.updatedAt
  };
}

function diaryList(diaries) {
  return diaries.map(diaryDetail);
}

module.exports = { diaryDetail, diaryList };
