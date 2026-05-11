<template>
  <PhoneFrame :parallax="false">
    <div class="lvl-page" data-allow-browser-scroll>
      <header class="lvl-page__top">
        <button
          type="button"
          class="lvl-page__back"
          aria-label="Назад"
          @click="goBack"
        >
          <Icon icon="mdi:chevron-left" />
        </button>
        <span class="m3-top-pill lvl-page__top-pill">
          <span class="m3-top-pill__icon m3-top-pill__icon--star" aria-hidden="true">
            <Icon icon="mdi:star" />
          </span>
          {{ totalStars }}
        </span>
      </header>

      <div class="lvl-page__panel m3-wood-panel">
        <span class="m3-ribbon lvl-page__ribbon">Выбор уровня</span>
        <div v-for="(page, idx) in levelPages" :key="idx" class="lvl-page__grid-wrap">
          <div class="lvl-page__grid">
            <button
              v-for="lv in page"
              :key="lv"
              type="button"
              class="lvl-tile"
              :class="{
                'lvl-tile--locked': !progress.isUnlocked(lv),
                'lvl-tile--current':
                  progress.isUnlocked(lv) && lv === progress.highestUnlocked,
              }"
              :disabled="!progress.isUnlocked(lv)"
              @click="play(lv)"
            >
              <span class="lvl-tile__num">{{ lv }}</span>
              <StarRow
                :value="progress.getLevel(lv).stars"
                :max="3"
                size="sm"
                class="lvl-tile__stars"
              />
              <span
                v-if="!progress.isUnlocked(lv)"
                class="lvl-tile__lock"
                aria-hidden="true"
              >
                <Icon icon="mdi:lock" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </PhoneFrame>
</template>

<script setup>
defineOptions({ name: 'LevelSelectPage' })

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PhoneFrame from '@/components/PhoneFrame.vue'
import StarRow from '@/components/StarRow.vue'
import { Icon } from '@iconify/vue'
import { useMatch3ProgressStore } from '@/stores/match3Progress'

const router = useRouter()
const progress = useMatch3ProgressStore()
const { totalLevels, totalStars } = storeToRefs(progress)

const LEVELS_PER_PAGE = 20
const allLevels = computed(() =>
  Array.from({ length: totalLevels.value }, (_, i) => i + 1),
)
const levelPages = computed(() => {
  const out = []
  for (let i = 0; i < allLevels.value.length; i += LEVELS_PER_PAGE) {
    out.push(allLevels.value.slice(i, i + LEVELS_PER_PAGE))
  }
  return out
})

function play(lv) {
  if (!progress.isUnlocked(lv)) return
  router.push({ name: 'play', params: { id: lv } })
}
function goBack() {
  router.push({ name: 'menu' })
}
</script>

<style scoped>
.lvl-page {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 0.75rem 1rem;
  box-sizing: border-box;
  color: var(--m3-text);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.lvl-page__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: max(0.6rem, env(safe-area-inset-top, 0px)) 0.1rem 0.7rem;
}
.lvl-page__back {
  width: 2.4rem;
  height: 2.4rem;
  border: 3px solid var(--m3-border-dark);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--m3-go-1) 0%, var(--m3-go-2) 100%);
  color: #6e3911;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: 900;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    inset 0 -2px 0 rgba(110, 57, 17, 0.3),
    0 3px 0 rgba(110, 57, 17, 0.55);
}
.lvl-page__back :deep(svg) {
  width: 1.55rem;
  height: 1.55rem;
  display: block;
}
.lvl-page__back:active {
  transform: translateY(2px);
}

.lvl-page__panel {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  padding: 1rem 0.7rem 0.85rem;
  margin-top: 1rem;
}
.lvl-page__ribbon {
  position: relative;
  align-self: center;
  margin: 0.2rem 0 0.8rem;
  font-size: 1rem;
}

.lvl-page__grid-wrap + .lvl-page__grid-wrap {
  margin-top: 0.85rem;
}

.lvl-page__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.7rem;
}

/* === Плитка уровня — жёлтая чанковая кнопка === */
.lvl-tile {
  position: relative;
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.35rem 0.2rem;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  border-radius: 14px;
  border: 3px solid var(--m3-border-dark);
  background: linear-gradient(
    180deg,
    #b6e15a 0%,
    #7cc232 60%,
    #4d8e1a 100%
  );
  color: #fff;
  text-shadow:
    -1px 0 0 var(--m3-ribbon-border),
    1px 0 0 var(--m3-ribbon-border),
    0 -1px 0 var(--m3-ribbon-border),
    0 1px 0 var(--m3-ribbon-border),
    0 2px 0 rgba(45, 91, 14, 0.6);
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.5),
    inset 0 -3px 0 rgba(45, 91, 14, 0.35),
    0 4px 0 rgba(45, 91, 14, 0.6);
  transition: transform 0.1s ease;
}
.lvl-tile:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.4),
    inset 0 -2px 0 rgba(45, 91, 14, 0.3),
    0 1px 0 rgba(45, 91, 14, 0.5);
}
.lvl-tile--current {
  background: linear-gradient(
    180deg,
    #ffe27a 0%,
    #ffae22 60%,
    #d97a14 100%
  );
  text-shadow:
    -1px 0 0 #6e3911,
    1px 0 0 #6e3911,
    0 -1px 0 #6e3911,
    0 1px 0 #6e3911,
    0 2px 0 rgba(110, 57, 17, 0.55);
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.6),
    inset 0 -3px 0 rgba(110, 57, 17, 0.35),
    0 4px 0 rgba(110, 57, 17, 0.6),
    0 0 14px rgba(255, 226, 122, 0.6);
}
.lvl-tile--locked {
  cursor: not-allowed;
  background: linear-gradient(
    180deg,
    #d6d2c6 0%,
    #a39d8d 60%,
    #6f6a5e 100%
  );
  text-shadow:
    -1px 0 0 #4a4538,
    1px 0 0 #4a4538,
    0 -1px 0 #4a4538,
    0 1px 0 #4a4538;
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.4),
    inset 0 -3px 0 rgba(0, 0, 0, 0.25),
    0 4px 0 rgba(60, 55, 45, 0.5);
}
.lvl-tile__num {
  font-size: 1.6rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.lvl-tile__stars {
  height: 0.8rem;
}
.lvl-tile__lock {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.6rem;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.5));
  opacity: 0.85;
}
.lvl-tile--locked .lvl-tile__num,
.lvl-tile--locked .lvl-tile__stars {
  opacity: 0.4;
}

</style>
