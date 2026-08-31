<template>
  <GlassPanel class="profile-card">
    <div class="profile-cover">
      <span class="cover-label">YULABU / PROFILE</span>
      <Icon icon="material-symbols:auto-awesome" class="cover-spark" />
      <span class="cover-orbit cover-orbit--outer"></span>
      <span class="cover-orbit cover-orbit--inner"></span>
    </div>

    <!-- 头像独立于封面（cover overflow:hidden 会裁掉溢出部分）：
         作为卡片直接子元素跨界定位，保证完整显示且不被内容区遮挡 -->
    <div class="avatar-frame">
      <img src="@/assets/img/Personal_img.jpg" alt="Yulabu 的头像" class="avatar" />
    </div>

    <div class="profile-content">
      <div class="profile-heading">
        <div>
          <span class="profile-kicker">PERSONAL JOURNAL</span>
          <h2 class="name">Yulabu</h2>
        </div>
        <span class="profile-status">
          <i></i>
          记录中
        </span>
      </div>
      <p class="tagline">记录学习，分享生活。</p>
      <div class="profile-rule"><span></span></div>
      <div class="profile-footer">
        <span>
          <Icon icon="material-symbols:edit-note" />
          持续记录
        </span>
        <span class="footer-mark">MORE ON HOVER</span>
      </div>

      <div class="profile-more">
        <div class="more-heading">
          <span>ABOUT THE AUTHOR</span>
          <i></i>
        </div>
        <p class="more-text">
          一名喜欢纳西妲的开发者，胡乱写些小文章，分享生活与技术，持续更新中～
        </p>
        <div class="more-tags">
          <span>随机昏迷一下</span>
          <span>胡乱吃到撑死</span>
          <span>保存一些图片</span>
        </div>
      </div>
    </div>
  </GlassPanel>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
</script>

<style scoped>
.profile-card {
  position: relative;
  width: 100%;
  max-width: 300px;
  height: 330px;
  overflow: hidden;
  border-radius: 24px;
  transition: height .45s cubic-bezier(.2, .7, .2, 1), transform .25s ease, box-shadow .25s ease;
}

.profile-card:hover {
  height: 440px;
  transform: translateY(-3px);
  box-shadow: 0 12px 26px var(--shadow-color);
}

.profile-cover {
  position: relative;
  isolation: isolate;
  height: 148px;
  overflow: hidden;
  background:
    radial-gradient(circle at 78% 20%, rgba(255, 255, 255, .42), transparent 25%),
    linear-gradient(135deg, var(--bg-personal-top), rgba(var(--color-accent-rgb), .42));
}

.profile-cover::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: .32;
  background-image: linear-gradient(rgba(255, 255, 255, .25) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, .25) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(135deg, black, transparent 72%);
}

.profile-cover::after {
  content: '';
  position: absolute;
  right: -34px;
  bottom: -58px;
  width: 180px;
  height: 180px;
  border: 1px solid rgba(255, 255, 255, .38);
  border-radius: 50%;
}

.cover-label {
  position: absolute;
  top: 16px;
  left: 18px;
  color: rgba(255, 255, 255, .78);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .16em;
}

.cover-spark {
  position: absolute;
  top: 15px;
  right: 18px;
  color: rgba(255, 255, 255, .78);
  font-size: 18px;
}

.cover-orbit {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, .42);
  border-radius: 50%;
  transform: rotate(-22deg);
}

.cover-orbit--outer {
  top: 18px;
  right: 18px;
  width: 126px;
  height: 74px;
}

.cover-orbit--inner {
  top: 30px;
  right: 32px;
  width: 96px;
  height: 54px;
  opacity: .55;
}

.avatar-frame {
  position: absolute;
  /* 与 .profile-cover 高度（148px）耦合：148 - 38 = 110，保持"半挂"溢出 38px */
  top: 110px;
  left: 50%;
  z-index: 3;
  width: 94px;
  height: 94px;
  padding: 5px;
  border: 1px solid rgba(255, 255, 255, .72);
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(255, 255, 255, .92), rgba(255, 255, 255, .35));
  box-shadow: 0 8px 18px rgba(36, 83, 56, .22);
  transform: translateX(-50%);
  transition: transform .4s cubic-bezier(.2, .7, .2, 1), box-shadow .4s ease;
}

.profile-card:hover .avatar-frame {
  box-shadow: 0 10px 22px rgba(36, 83, 56, .28);
  transform: translateX(-50%) scale(1.04);
}

.avatar {
  width: 100%;
  height: 100%;
  border: 3px solid var(--bg-card-strong);
  border-radius: 50%;
  object-fit: cover;
}

.profile-content {
  position: relative;
  z-index: 1;
  padding: 52px 20px 17px;
}

.profile-content::before {
  content: '';
  position: absolute;
  top: -44px;
  left: 50%;
  z-index: 0;
  width: 86px;
  height: 86px;
  border: 1px solid rgba(255, 255, 255, .62);
  border-radius: 50%;
  background: var(--bg-card-strong);
  box-shadow: 0 3px 10px rgba(36, 83, 56, .1);
  transform: translateX(-50%);
}

.profile-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.profile-kicker {
  display: block;
  margin-bottom: 5px;
  color: var(--color-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .16em;
}

.name {
  margin: 0;
  color: var(--color-heading);
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.profile-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border: 1px solid rgba(var(--color-primary-rgb), .16);
  border-radius: 10px;
  color: var(--color-primary);
  font-size: 10px;
  white-space: nowrap;
}

.profile-status i {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), .12);
}

.tagline {
  margin: 8px 0 0;
  color: var(--color-text);
  font-size: 13px;
}

.profile-rule {
  height: 1px;
  margin: 17px 0 13px;
  background: var(--border-divider);
}

.profile-rule span {
  display: block;
  width: 42px;
  height: 2px;
  background: var(--color-primary);
  transform: translateY(-1px);
}

.profile-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-muted);
  font-size: 10px;
  letter-spacing: .04em;
}

.profile-footer span:first-child {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.profile-footer :deep(svg) {
  color: var(--color-primary);
  font-size: 15px;
}

.footer-mark {
  font-family: Georgia, serif;
  letter-spacing: .12em;
}

.profile-more {
  max-height: 0;
  margin-top: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateY(8px);
  transition: max-height .45s ease, margin-top .45s ease, opacity .3s ease, transform .45s ease;
}

.profile-card:hover .profile-more {
  max-height: 112px;
  margin-top: 16px;
  opacity: 1;
  transform: translateY(0);
}

.more-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-primary);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .15em;
}

.more-heading i {
  display: block;
  flex: 1;
  height: 1px;
  background: var(--border-divider);
}

.more-text {
  margin: 8px 0 10px;
  color: var(--color-text);
  font-size: 12px;
  line-height: 1.65;
}

.more-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.more-tags span {
  padding: 4px 8px;
  border: 1px solid rgba(var(--color-primary-rgb), .13);
  border-radius: 7px;
  background: rgba(var(--color-primary-rgb), .08);
  color: var(--color-muted);
  font-size: 10px;
}

@media (hover: none) {
  .profile-card {
    height: 440px;
  }

  .profile-more {
    max-height: 112px;
    margin-top: 16px;
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 1024px) {
  .profile-card {
    max-width: none;
  }
}
</style>
