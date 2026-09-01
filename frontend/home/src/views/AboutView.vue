<template>
  <SitePageFrame :show-typing="false" subtitle="个人树">
    <section class="about-intro">
      <GlassPanel as="div" class="intro-card">
        <p class="intro-text">
          大家好，我是 Yulabu。这里是我记录技术学习、生活随笔和个人想法的小天地。下面这条小径，带你看看我在世界里行走的样子。
        </p>
      </GlassPanel>
    </section>

    <section class="about-map">
      <div class="map-line" />
      <AboutNode
        v-for="(node, index) in nodes"
        :key="node.title"
        :title="node.title"
        :summary="node.summary"
        :image="node.image"
        :icon="node.icon"
        :side="index % 2 === 0 ? 'left' : 'right'"
        class="about-node-item"
      >
        <template v-if="node.detail">
          {{ node.detail }}
        </template>
      </AboutNode>
    </section>

    <section class="about-outro">
      <GlassPanel as="div" class="outro-card">
        <blockquote class="outro-quote">
          “愿每一段旅程，都有值得记录的风景。”
        </blockquote>
        <div class="social-links">
          <a href="https://github.com/yulabu" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="GitHub">
            <Icon icon="mdi:github" class="social-icon" />
          </a>
          <a href="mailto:hello@yulabu.cn" class="social-link" aria-label="Email">
            <Icon icon="mdi:email" class="social-icon" />
          </a>
        </div>
      </GlassPanel>
    </section>
  </SitePageFrame>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import SitePageFrame from '@/components/common/SitePageFrame.vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
import AboutNode from '@/components/about/AboutNode.vue'
import avatarImg from '@/assets/img/about_avatar.jpg'
import skillsImg from '@/assets/img/about_skills.jpg'
import blogImg from '@/assets/img/about_blog.jpg'
import contactImg from '@/assets/img/about_contact.jpg'

const nodes = [
  {
    title: '你好，我是 Yulabu',
    icon: 'mdi:account-heart',
    summary: '一名热爱技术与生活的开发者，喜欢折腾新鲜事物，偶尔写点东西记录成长。',
    image: avatarImg,
    detail: '我偏爱用代码解决生活中的小麻烦，也喜欢把遇到的坑和学到的东西整理成笔记。如果你也对编程、开源和有趣的小工具有兴趣，我们应该会聊得来。'
  },
  {
    title: '技能树',
    icon: 'mdi:school',
    summary: '在 Vue 3、Node.js、TypeScript 和 MySQL 的世界里挖呀挖。',
    image: skillsImg,
    detail: '前端重心在 Vue 3 生态，后端用 Node.js + Express 维持日常需求；数据库用的是 MariaDB/MySQL。习惯 TypeScript，偶尔折腾点原生脚本和性能优化。'
  },
  {
    title: '关于本站',
    icon: 'mdi:notebook',
    summary: "Yulabu's Blog 是一个用于记录学习笔记、技术探索和日常碎碎念的个人空间。",
    image: blogImg,
    detail: '我会在这里持续更新：前端/后端实践的踩坑记录、一些生活见闻、读书思考，以及自己写的小工具。站的内容慢慢丰富，就像一座自建的花园。'
  },
  {
    title: '联系我',
    icon: 'mdi:message-text',
    summary: '如果你有任何想法或建议，欢迎通过 GitHub 或 Email 与我交流。',
    image: contactImg,
    detail: '留言、建议或者只是想聊聊技术、分享一个好玩的项目，都可以用下面的方式找到我。看到消息我会尽快回复。'
  }
]
</script>

<style scoped>
.about-intro {
  max-width: 720px;
  margin: 32px auto;
  padding: 0 var(--page-padding);
}

.intro-card {
  padding: 24px 28px;
  border-radius: 18px;
}

.intro-text {
  font-size: 15px;
  color: var(--color-text);
  line-height: 1.8;
  margin: 0;
}

.about-map {
  position: relative;
  max-width: 1100px;
  margin: 0 auto 60px;
  padding: 32px 0;
}

.map-line {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 3px;
  transform: translateX(-50%);
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(var(--color-primary-rgb), 0.5),
    rgba(var(--color-primary-rgb), 0.5),
    transparent
  );
  pointer-events: none;
}

.about-node-item {
  margin: 36px 0;
}

.about-outro {
  max-width: 760px;
  margin: 0 auto 80px;
  padding: 0 var(--page-padding);
}

.outro-card {
  padding: 32px;
  border-radius: 18px;
  text-align: center;
}

.outro-quote {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  color: var(--color-heading);
  margin: 0 0 20px;
  line-height: 1.8;
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
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

@media (max-width: 900px) {
  .map-line {
    left: 20px;
    width: 2px;
    transform: none;
  }
}

@media (max-width: 640px) {
  .about-intro {
    margin: 24px auto;
    padding: 0 16px;
  }

  .intro-card {
    padding: 20px;
  }

  .about-map {
    padding: 20px 0;
    max-width: 100%;
  }

  .map-line {
    left: 8px;
  }

  .about-node-item {
    margin: 26px 0;
  }

  .about-outro {
    margin-bottom: 60px;
    padding: 0 16px;
  }

  .outro-card {
    padding: 24px 20px;
  }

  .outro-quote {
    font-size: 16px;
  }
}
</style>
