<template>
  <div class="card">
    <div class="header">
      <Icon icon="material-symbols:campaign-outline" class="icon" />
      <h4 class="title">公告</h4>
      <span class="count" v-if="notices.length">共 {{ notices.length }} 条</span>
    </div>
    <div class="body">
      <div v-if="!notices.length" class="empty">
        <Icon icon="material-symbols:notifications-off-outline" class="empty-icon" />
        <span>暂无公告</span>
      </div>
      <div v-else v-for="item in notices" :key="item.notice_id" class="notice">
        <div class="notice-left">
          <span class="dot"></span>
        </div>
        <div class="notice-right">
          <div class="notice-head">
            <span class="notice-title">{{ item.notice_title }}</span>
            <span class="notice-date">{{ item.notice_created_at }}</span>
          </div>
          <p class="notice-content">{{ item.notice_content }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { Icon } from '@iconify/vue'

const notices = [
  { notice_id: 1, notice_title: '博客上线', notice_content: '欢迎访问我的个人博客！文章会持续更新，敬请关注。', notice_created_at: '2026-07-15', notice_status: 'show' },
  { notice_id: 2, notice_title: '登录功能已开放', notice_content: '管理后台登录功能已上线，管理员可以通过右上角登录按钮进入后台管理文章和公告。', notice_created_at: '2026-07-18', notice_status: 'show' },
  { notice_id: 3, notice_title: '更多功能开发中', notice_content: '评论区、搜索、分类标签等功能正在开发中，敬请期待。', notice_created_at: '2026-07-20', notice_status: 'show' },
]
</script>
<style scoped>
.card {
  width: 100%;
  padding: 24px 20px;
  border-radius: 5%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .6),
      rgba(255, 255, 255, .3),
      rgba(255, 255, 255, .2));
  backdrop-filter: blur(16px);
}

.header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(80, 140, 134, .25);
  margin-bottom: 16px;
}

.icon {
  color: rgb(99, 149, 86);
  font-size: 22px;
}

.title {
  font-family: '华文琥珀', 'STHupo', sans-serif;
  font-weight: 400;
  color: rgb(99, 149, 86);
  font-size: 20px;
  margin: 0;
  letter-spacing: 2px;
}

.count {
  margin-left: auto;
  font-size: 12px;
  color: rgb(65, 110, 105);
  background: rgba(80, 140, 134, .12);
  padding: 2px 8px;
  border-radius: 10px;
}

.body {
  display: flex;
  flex-direction: column;
}

.active {
  display: flex;
  flex-direction: column;
}

.active>:last-child {
  display: none;
}

.notice {
  display: flex;
  gap: 10px;
  padding: 10px 0;
}

.notice:not(:last-child) {
  border-bottom: 1px dashed rgba(80, 140, 134, .15);
}

.notice-left {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 6px;
}

.dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(99, 149, 86);
  box-shadow: 0 0 6px rgba(99, 149, 86, .4);
}

.notice-right {
  flex: 1;
  min-width: 0;
}

.notice-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.notice-title {
  font-family: '微软雅黑', sans-serif;
  font-weight: 900;
  font-size: 14px;
  color: rgb(99, 149, 86);
}

.notice-date {
  margin-left: auto;
  font-size: 11px;
  color: rgb(65, 110, 105);
  opacity: .65;
  white-space: nowrap;
  flex-shrink: 0;
}

.notice-content {
  margin: 0;
  font-family: '微软雅黑', sans-serif;
  font-size: 12px;
  color: rgb(99, 118, 94);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  color: rgb(65, 110, 105);
  opacity: .45;
  font-size: 13px;
  gap: 8px;
}

.empty-icon {
  font-size: 32px;
}
</style>