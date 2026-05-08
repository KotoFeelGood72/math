<template>
  <PhoneFrame :parallax="false">
    <div class="stats">
      <header class="stats__top">
        <button
          type="button"
          class="stats__back"
          aria-label="Назад"
          @click="goBack"
        >
          <Icon icon="mdi:chevron-left" />
        </button>
        <h1 class="stats__title">Статистика</h1>
        <div class="stats__top-spacer" />
      </header>

      <Swiper
        class="stats__swiper"
        :modules="swiperModules"
        direction="vertical"
        :slidesPerView="'auto'"
        :freeMode="{ enabled: true, sticky: false }"
        :mousewheel="{ forceToAxis: true, releaseOnEdges: true }"
      >
        <SwiperSlide class="stats__slide">
          <section class="stats__panel stats__panel--lead m3-modal-panel">
            <p class="stats__lead">Накапливается с каждым ходом.</p>
          </section>
        </SwiperSlide>

        <SwiperSlide class="stats__slide">
          <section class="stats__panel m3-modal-panel" aria-labelledby="stats-progression-h">
            <h2 id="stats-progression-h" class="stats__panel-title">Прогрессия</h2>
            <div class="stats__grid">
              <article
                v-for="row in primaryRows"
                :key="row.key"
                class="stats__card"
              >
                <div class="stats__card-label">{{ row.label }}</div>
                <div class="stats__card-value">{{ row.value }}</div>
              </article>
            </div>
          </section>
        </SwiperSlide>

        <SwiperSlide class="stats__slide">
          <section class="stats__panel m3-modal-panel" aria-labelledby="stats-activity-h">
            <h2 id="stats-activity-h" class="stats__panel-title">
              Игровая активность
            </h2>
            <div class="stats__grid">
              <article
                v-for="row in activityRows"
                :key="row.key"
                class="stats__card"
              >
                <div class="stats__card-label">{{ row.label }}</div>
                <div class="stats__card-value">{{ row.value }}</div>
              </article>
            </div>
          </section>
        </SwiperSlide>

        <SwiperSlide class="stats__slide">
          <section class="stats__panel m3-modal-panel" aria-labelledby="stats-records-h">
            <h2 id="stats-records-h" class="stats__panel-title">Рекорды</h2>
            <div class="stats__grid">
              <article
                v-for="row in recordRows"
                :key="row.key"
                class="stats__card"
              >
                <div class="stats__card-label">{{ row.label }}</div>
                <div class="stats__card-value">{{ row.value }}</div>
              </article>
            </div>
          </section>
        </SwiperSlide>
      </Swiper>

      <footer class="stats__bottom-bar">
        <MenuActionButton
          variant="hero"
          class="stats__bottom-back"
          @click="goBack"
        >
          Назад
        </MenuActionButton>
      </footer>
    </div>
  </PhoneFrame>
</template>

<script setup>
defineOptions({ name: 'StatisticsPage' })

import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PhoneFrame from '@/components/PhoneFrame.vue'
import MenuActionButton from '@/components/MenuActionButton.vue'
import { Icon } from '@iconify/vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { FreeMode, Mousewheel } from 'swiper'
import { useMatch3StatsStore } from '@/stores/match3Stats'
import { useMatch3ProgressStore } from '@/stores/match3Progress'

const router = useRouter()
const stats = useMatch3StatsStore()
const progress = useMatch3ProgressStore()
const {
  totalMoves,
  totalMatches,
  totalScore,
  bestSingleLevelScore,
  longestCombo,
  longestCascade,
  levelsPlayed,
  levelsWon,
} = storeToRefs(stats)
const { totalStars, completedCount, totalLevels } = storeToRefs(progress)

const swiperModules = [FreeMode, Mousewheel]

const primaryRows = computed(() => [
  {
    key: 'cleared',
    label: 'Уровней пройдено',
    value: `${completedCount.value} / ${totalLevels.value}`,
  },
  {
    key: 'stars',
    label: 'Звёзд получено',
    value: `${totalStars.value} / ${totalLevels.value * 3}`,
  },
])

const activityRows = computed(() => [
  { key: 'started', label: 'Запусков', value: levelsPlayed.value },
  { key: 'won', label: 'Побед', value: levelsWon.value },
  { key: 'moves', label: 'Всего ходов', value: totalMoves.value },
  { key: 'matches', label: 'Совпадений', value: totalMatches.value },
])

const recordRows = computed(() => [
  { key: 'best', label: 'Рекорд за уровень', value: bestSingleLevelScore.value },
  { key: 'totalScore', label: 'Очков всего', value: totalScore.value },
  { key: 'combo', label: 'Лучшее комбо', value: longestCombo.value },
  { key: 'cascade', label: 'Длинный каскад', value: longestCascade.value },
])

function goBack() {
  router.push({ name: 'settings' })
}

function onEscape(e) {
  if (e.key === 'Escape') goBack()
}
onMounted(() => window.addEventListener('keydown', onEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', onEscape))
</script>

<style scoped>
.stats {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  color: var(--m3-text);
}

/* Шапка — как на экране настроек */
.stats__top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.35rem 0.45rem;
  padding: max(0.6rem, env(safe-area-inset-top, 0px)) 0.7rem 0.45rem;
  flex-shrink: 0;
}

.stats__back {
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
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    inset 0 -2px 0 rgba(110, 57, 17, 0.3),
    0 3px 0 rgba(110, 57, 17, 0.55);
}

.stats__back:active {
  transform: translateY(2px);
}

.stats__back :deep(svg) {
  width: 1.12rem;
  height: 1.12rem;
}

.stats__title {
  margin: 0;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #fff;
  text-shadow:
    -1px 0 0 #6e3911,
    1px 0 0 #6e3911,
    0 -1px 0 #6e3911,
    0 1px 0 #6e3911,
    0 2px 0 rgba(110, 57, 17, 0.5);
  min-width: 0;
}

.stats__top-spacer {
  width: 2.4rem;
}

.stats__swiper {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 0.75rem 0.7rem 0.6rem;
  box-sizing: border-box;
}

.stats__swiper :deep(.swiper-slide:not(:last-child)) {
  margin-bottom: 0.65rem;
}

.stats__slide {
  height: auto;
  display: flex;
  flex-direction: column;
}

.stats__panel {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.85rem 1rem 1rem;
  width: 100%;
  box-sizing: border-box;
}

.stats__panel--lead {
  padding: 0.7rem 1rem 0.8rem;
}

.stats__panel-title {
  margin: 0 0 0.15rem;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #6e3911;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.65);
}

.stats__lead {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.45;
  color: #4a2810;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}

.stats__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.stats__card {
  margin: 0;
  padding: 0.55rem 0.65rem 0.6rem;
  border-radius: 16px;
  border: 3px solid rgba(110, 57, 17, 0.32);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.72) 0%,
    rgba(230, 215, 185, 0.48) 100%
  );
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  min-width: 0;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    0 2px 0 rgba(110, 57, 17, 0.15);
}

.stats__card-label {
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6e3911;
  opacity: 0.88;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.stats__card-value {
  font-size: 1.28rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: #c67612;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
  line-height: 1.15;
}

.stats__bottom-bar {
  flex-shrink: 0;
  padding: 0.55rem 0.7rem max(0.65rem, env(safe-area-inset-bottom, 0px));
  background: linear-gradient(
    180deg,
    #b9e3fa 0%,
    #6ec4ea 100%
  );
  border-top: 2px solid rgba(110, 57, 17, 0.2);
}

.stats__bottom-back {
  width: 100%;
  max-width: none;
}
</style>
