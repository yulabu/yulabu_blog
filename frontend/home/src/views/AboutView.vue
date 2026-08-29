<template>
  <SitePageFrame :show-typing="false" subtitle="关于我">
    <div class="about-layout">
      <GlassPanel as="aside" class="profile-card">
        <div class="avatar-wrap">
          <img src="@/assets/img/Personal_img.jpg" alt="avatar" class="avatar" />
        </div>
        <h2 class="name">Yulabu</h2>
        <p class="tagline">记录学习，分享生活。</p>
        <div class="social-links">
          <a href="#" class="social-link" title="GitHub">
            <Icon icon="mdi:github" class="social-icon" />
          </a>
          <a href="#" class="social-link" title="Email">
            <Icon icon="mdi:email" class="social-icon" />
          </a>
        </div>
      </GlassPanel>

      <GlassPanel as="main" class="content-card">
        <section class="section">
          <h3 class="section-title">
            <Icon icon="mdi:account" class="title-icon" />
            个人简介
          </h3>
          <p class="section-text">
            一名热爱技术与生活的开发者，喜欢折腾新鲜事物，偶尔写点东西记录成长。
          </p>
        </section>

        <section class="section">
          <h3 class="section-title">
            <Icon icon="mdi:information" class="title-icon" />
            关于本站
          </h3>
          <p class="section-text">
            Yulabu's Blog 是一个用于记录学习笔记、技术探索和日常碎碎念的个人空间。
          </p>
        </section>

        <section class="section">
          <h3 class="section-title">
            <Icon icon="mdi:code-tags" class="title-icon" />
            技术栈
          </h3>
          <div class="tech-tags">
            <span class="tech-tag">Vue 3</span>
            <span class="tech-tag">Node.js</span>
            <span class="tech-tag">Express</span>
            <span class="tech-tag">MySQL</span>
            <span class="tech-tag">TypeScript</span>
          </div>
        </section>

        <section class="section">
          <h3 class="section-title">
            <Icon icon="mdi:email" class="title-icon" />
            联系我
          </h3>
          <p class="section-text">
            如果你有任何想法或建议，欢迎通过 GitHub 或 Email 与我交流。
          </p>
        </section>
      </GlassPanel>
    </div>
  </SitePageFrame>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
import SitePageFrame from '@/components/common/SitePageFrame.vue'
</script>

<style scoped>
.about-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px var(--page-padding) 60px;
}

.profile-card,
.content-card {
  border-radius: 16px;
}

.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;
  height: fit-content;
  position: sticky;
  top: 96px;
  align-self: start;
}

.avatar-wrap {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  padding: 4px;
  background: linear-gradient(135deg, var(--color-primary), rgba(var(--color-primary-rgb), 0.6));
  box-shadow: 0 4px 14px rgba(var(--color-primary-rgb), 0.3);
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--bg-card-strong);
}

.name {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-heading);
  margin: 20px 0 8px;
}

.tagline {
  font-size: 14px;
  color: var(--color-muted);
  text-align: center;
  margin: 0;
}

.social-links {
  display: flex;
  gap: 16px;
  margin-top: 20px;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
  transition: background 0.2s, transform 0.2s;
}

.social-link:hover {
  background: rgba(var(--color-primary-rgb), 0.25);
  transform: translateY(-2px);
}

.social-icon {
  font-size: 22px;
}

.content-card {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border-divider);
}

.title-icon {
  font-size: 22px;
}

.section-text {
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.8;
  margin: 0;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tech-tag {
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-text);
  font-size: 13px;
  transition: background 0.2s;
}

.tech-tag:hover {
  background: rgba(var(--color-primary-rgb), 0.22);
}

@media (max-width: 768px) {
  .about-layout {
    grid-template-columns: 1fr;
  }

  .profile-card {
    position: static;
  }
}

@media (max-width: 480px) {
  .content-card {
    padding: 24px;
  }

  .name {
    font-size: 22px;
  }

  .section-title {
    font-size: 16px;
  }
}
</style>
