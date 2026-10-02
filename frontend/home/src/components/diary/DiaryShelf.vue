<template>
  <section class="shelf" :aria-label="`日记书架，共 ${total} 篇`">
    <div class="shelf__case">
      <div class="shelf__plaque">
        <AppIcon icon="mdi:notebook" class="shelf__plaque-icon" />
        <span class="shelf__plaque-name">日记</span>
        <span class="shelf__plaque-sep" aria-hidden="true">·</span>
        <span class="shelf__plaque-count">共 {{ total }} 篇</span>
        <!-- 篇数多了就是"多几架"：铭牌直接告诉你现在看的是第几架，
             比另起一行说明更省地方，也让"换架"这件事有个落点 -->
        <template v-if="totalPages > 1">
          <span class="shelf__plaque-rule" aria-hidden="true"></span>
          <span class="shelf__plaque-slot">第 {{ page }} / {{ totalPages }} 架</span>
        </template>
      </div>

      <div class="shelf__back" aria-hidden="true"></div>

      <ul class="shelf__rows">
        <li v-for="(row, ri) in rows" :key="ri" class="shelf-row">
          <ul class="shelf-row__slots">
            <li v-for="(diary, ci) in row" :key="diary.id" class="shelf-row__slot">
              <DiaryBook :diary="diary" @open="onOpen(ri * COLS + ci, $event)" />
            </li>
          </ul>
          <!-- 没摆满的那层收一个书挡，把留白解释清楚（满层由架体侧板收边） -->
          <span
            v-if="row.length < COLS"
            class="shelf-row__bookend"
            :style="{ left: `${(row.length / COLS) * 100}%` }"
            aria-hidden="true"
          ></span>
          <span class="shelf-row__plank" aria-hidden="true"></span>
        </li>
      </ul>

      <slot />
    </div>

    <!-- 壁挂托架：让"挂在墙上"这件事有据可依（落地架不需要它） -->
    <span class="shelf__bracket" aria-hidden="true" style="left: 18%"></span>
    <span class="shelf__bracket" aria-hidden="true" style="left: 82%"></span>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import DiaryBook from '@/components/diary/DiaryBook.vue'

// 一层架子几本书：常量而不是按视口算——书架在构建期预渲染，切分方式必须与客户端
// 完全一致，否则水合错位；窄屏靠书变小而不是靠减少本数。
// 每页 20 篇 → 恒为 3 层（7/7/6），层数不随日记总数增长，再多就是"多几架"（翻页）
const COLS = 7

const props = defineProps({
  diaries: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 }
})

const emit = defineEmits(['open'])

const rows = computed(() => {
  const list = props.diaries || []
  const out = []
  for (let i = 0; i < list.length; i += COLS) {
    out.push(list.slice(i, i + COLS))
  }
  return out
})

// 行内列号换算成整架序号：日记本里「翻到上/下一篇」要的是全局序
function onOpen(globalIndex, payload) {
  emit('open', { ...payload, index: globalIndex })
}
</script>

<style scoped>
.shelf {
  /* 书架一屏 = 一层 7 本；20 篇正好 7 / 7 / 6 三层 */
  --shelf-cols: 7;
  --book-h: clamp(132px, 21vw, 190px);
  position: relative;
  width: 100%;
  max-width: 700px;
}

/* 墙面上的光：架体背后一团暖光，书架像"挂在这面墙上"而不是站在地上。
   强度走 --shelf-glow：暗色主题下它是 transparent（暖光压在深底上会变成脏雾） */
.shelf::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: -52px;
  right: -8%;
  bottom: -40px;
  left: -5%;
  pointer-events: none;
  background: radial-gradient(58% 46% at 34% 26%, var(--shelf-glow, transparent), transparent 72%);
}

/* 架体。木纹 = 一层噪声(软光) + 两组细线 + 底色渐变，全部纯 CSS / 内联 SVG，不引图片 */
.shelf__case {
  position: relative;
  z-index: 1;
  padding: 30px 18px 8px;
  border-radius: 7px 7px 4px 4px;
  background-color: var(--shelf-wood-2);
  /* 架体只上颗粒，不上周期细线：任何"规则密纹"都会读成拉丝金属（实踩）。
     真正的木纹线只放在层板上——那是木头断面该有纹理的地方 */
  background-image:
    var(--shelf-noise),
    linear-gradient(180deg, var(--shelf-wood-1), var(--shelf-wood-2) 46%, var(--shelf-wood-2));
  background-blend-mode: soft-light, normal;
  background-size: 140px 140px, auto;
  /* 影子的读法决定"站着"还是"挂着"：贴着墙一圈窄影（架体自身厚度）
     + 一点向下的扩散，没有落地大投影 */
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.14),
    inset -1px 0 0 rgba(0, 0, 0, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 3px 5px -2px rgba(0, 0, 0, 0.22),
    0 16px 28px -22px rgba(0, 0, 0, 0.45);
}

/* 顶檐：受光面 + 下沿阴影 */
.shelf__case::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 10px;
  border-radius: 7px 7px 0 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), transparent);
  box-shadow: 0 6px 10px -6px rgba(0, 0, 0, 0.5);
}

/* 背板：架体再暗一档，四面都有内影，读作"凹进去的格子" */
.shelf__back {
  position: absolute;
  z-index: 0;
  top: 26px;
  right: 7px;
  bottom: 6px;
  left: 7px;
  border-radius: 2px;
  background: var(--shelf-wood-3);
  box-shadow:
    inset 0 14px 22px -10px rgba(0, 0, 0, 0.62),
    inset 0 -12px 20px -12px rgba(0, 0, 0, 0.45),
    inset 12px 0 18px -12px rgba(0, 0, 0, 0.42),
    inset -12px 0 18px -12px rgba(0, 0, 0, 0.42);
}

/* 铭牌：原「汇总卡」的信息换个载体。
   z-index 必须低于 .shelf__rows —— 抽出的封面在 rows 这个层叠上下文里，
   铭牌只要比 rows 高，展开时就会被它压住（实踩） */
.shelf__plaque {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  margin: 0 auto 20px;
  padding: 5px 14px;
  border-radius: 3px;
  background: linear-gradient(180deg, var(--shelf-plate), var(--shelf-wood-3));
  color: var(--shelf-plate-text);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    inset 0 -1px 0 rgba(0, 0, 0, 0.28),
    0 2px 4px -1px rgba(0, 0, 0, 0.4);
}

.shelf__plaque-icon {
  font-size: 15px;
  opacity: 0.85;
}

.shelf__plaque-name {
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.shelf__plaque-sep {
  font-size: 12px;
  opacity: 0.5;
}

.shelf__plaque-count {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 12px;
  letter-spacing: 0.02em;
  opacity: 0.88;
}

.shelf__plaque-rule {
  width: 1px;
  height: 12px;
  background: currentColor;
  opacity: 0.32;
}

.shelf__plaque-slot {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 12px;
  letter-spacing: 0.02em;
  opacity: 0.72;
}

.shelf__rows {
  position: relative;
  /* 书架内容层要压过铭牌与背板：书抽出来时是"在整面架子前面"，
     这一层若低于铭牌，抽出的封面就会被铭牌挡住 */
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 16px;
  list-style: none;
}

.shelf-row {
  position: relative;
  /* 下沿留给层板：书正好站在板上 */
  padding-bottom: 12px;
}

/* 上一块层板投在背板上的影：格子才有深度，书才像"插在里面" */
.shelf-row::before {
  content: '';
  position: absolute;
  right: -6px;
  left: -6px;
  top: -16px;
  height: 18px;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.34), transparent);
}

.shelf-row__slots {
  display: grid;
  grid-template-columns: repeat(var(--shelf-cols), minmax(0, 1fr));
  align-items: end;
  list-style: none;
}

.shelf-row__slot {
  min-width: 0;
}

/* 层板：纹理走板长方向（横向），前沿受光、板下压影 */
.shelf-row__plank {
  position: absolute;
  right: -14px;
  bottom: 0;
  left: -14px;
  height: 12px;
  border-radius: 2px;
  background-color: var(--shelf-wood-2);
  /* 层板的纹理走板长方向：一细一粗两组，模拟纤维与年轮 */
  background-image:
    var(--shelf-noise),
    repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0 1px, transparent 1px 4px),
    repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0 1px, transparent 1px 13px),
    linear-gradient(180deg, var(--shelf-wood-1), var(--shelf-wood-2) 42%, var(--shelf-wood-3));
  background-blend-mode: soft-light, normal, normal, normal;
  background-size: 140px 140px, auto, auto, auto;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3),
    0 8px 12px -7px rgba(0, 0, 0, 0.6);
}

/* 书挡：斜靠着的薄板 */
.shelf-row__bookend {
  position: absolute;
  bottom: 12px;
  width: 8px;
  height: calc(var(--book-h) * 0.76);
  margin-left: -6px;
  border-radius: 2px 1px 1px 2px;
  background: linear-gradient(100deg, rgba(255, 255, 255, 0.2), transparent 42%), var(--shelf-wood-3);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.32),
    0 10px 14px -8px rgba(0, 0, 0, 0.5);
  transform: perspective(240px) rotateY(-24deg);
  transform-origin: right center;
}

/* 壁挂托架：架体底下两片金属角撑（右三角是它正面的剪影） */
.shelf__bracket {
  position: absolute;
  z-index: 0;
  bottom: -13px;
  width: 26px;
  height: 14px;
  transform: translateX(-50%);
  background: linear-gradient(200deg, rgb(212, 210, 202), rgb(158, 156, 148) 55%, rgb(126, 124, 117));
  clip-path: polygon(0 0, 100% 0, 0 100%);
  border-radius: 0 0 0 2px;
  box-shadow: 0 4px 6px -3px rgba(0, 0, 0, 0.5);
}

.shelf__bracket::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 5px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(40, 38, 34, 0.45);
}

@media (max-width: 768px) {
  .shelf {
    --book-h: clamp(122px, 25vw, 158px);
  }

  .shelf__case {
    padding: 24px 12px 7px;
  }

  .shelf__plaque {
    margin-bottom: 16px;
  }

  .shelf__rows {
    gap: 13px;
  }

  .shelf-row::before {
    top: -13px;
    height: 15px;
  }

  .shelf-row__plank {
    right: -9px;
    left: -9px;
  }

  .shelf-row__bookend {
    width: 7px;
  }

  .shelf__bracket {
    width: 20px;
    height: 11px;
    bottom: -10px;
  }
}

@media (max-width: 480px) {
  .shelf {
    --book-h: 124px;
  }

  .shelf__case {
    padding: 20px 9px 6px;
    border-radius: 6px 6px 3px 3px;
  }

  .shelf__plaque {
    margin-bottom: 13px;
    padding: 4px 11px;
  }

  .shelf__rows {
    gap: 11px;
  }

  .shelf-row {
    padding-bottom: 9px;
  }

  .shelf-row::before {
    top: -11px;
    height: 13px;
  }

  .shelf-row__plank {
    right: -6px;
    left: -6px;
    height: 9px;
  }

  .shelf-row__bookend {
    bottom: 9px;
  }
}
</style>
