<template>
  <PhoneFrame :parallax="false">
    <div class="result" :class="`result--${result}`">
      <div class="result__panel m3-modal-panel">
        <span class="m3-ribbon result__ribbon">
          <template v-if="result === 'won'">
            <span class="m3-ribbon__line">Уровень</span>
            <span class="m3-ribbon__line">пройден</span>
          </template>
          <template v-else>
            <span class="m3-ribbon__line">Игра окончена</span>
          </template>
        </span>

        <div class="result__stars-row">
          <svg
            v-for="i in 3"
            :key="i"
            class="result__big-star"
            :class="{ 'result__big-star--off': i > stars, 'result__big-star--mid': i === 2 }"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 2.5l2.94 6.34 6.86.78-5.1 4.78 1.46 6.85L12 17.78 5.84 21.25l1.46-6.85L2.2 9.62l6.86-.78L12 2.5z"
            />
          </svg>
        </div>

        <div class="result__lines">
          <div class="result__line">
            <span class="result__line-label">Очки:</span>
            <span class="result__line-value">{{ score }}</span>
          </div>
          <div class="result__line">
            <span class="result__line-label">Лучший счёт:</span>
            <span class="result__line-value">{{ bestScore }}</span>
          </div>
          <div v-if="result === 'won'" class="result__line">
            <span class="result__line-label">Монеты:</span>
            <span class="result__line-value">+{{ coins }}</span>
          </div>
        </div>

        <div class="result__actions m3-modal-actions">
          <button
            type="button"
            class="m3-round-icon-btn"
            aria-label="В меню"
            @click="goMenu"
          >
            <Icon icon="mdi:menu" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="m3-round-icon-btn"
            aria-label="Ещё раз"
            @click="retry"
          >
            <Icon icon="mdi:replay" aria-hidden="true" />
          </button>
          <button
            v-if="result === 'won' && hasNext"
            type="button"
            class="m3-round-icon-btn m3-round-icon-btn--green"
            aria-label="Следующий уровень"
            @click="goNext"
          >
            <Icon icon="mdi:play" aria-hidden="true" />
          </button>
          <button
            v-else
            type="button"
            class="m3-round-icon-btn m3-round-icon-btn--green"
            aria-label="Готово"
            @click="goMenu"
          >
            <Icon icon="mdi:check" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </PhoneFrame>
</template>

<script setup>
defineOptions({ name: 'LevelResultPage' })

import { computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import confetti from '@hiseb/confetti'
import PhoneFrame from '@/components/PhoneFrame.vue'
import { Icon } from '@iconify/vue'
import { useMatch3ProgressStore } from '@/stores/match3Progress'

const route = useRoute()
const router = useRouter()
const progress = useMatch3ProgressStore()
const { totalLevels } = storeToRefs(progress)

const level = computed(() => parseInt(route.query.level, 10) || 1)
const stars = computed(() => parseInt(route.query.stars, 10) || 0)
const score = computed(() => parseInt(route.query.score, 10) || 0)
const coins = computed(() => parseInt(route.query.coins, 10) || 0)
const result = computed(() =>
  route.query.result === 'won' ? 'won' : 'lost',
)
const hasNext = computed(() => level.value + 1 <= totalLevels.value)
const bestScore = computed(() => {
  const lv = progress.getLevel(level.value)
  return Math.max(lv?.bestScore || 0, score.value)
})

function celebrationFxAllowed() {
  if (typeof window === 'undefined') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function fireWinConfetti() {
  if (!celebrationFxAllowed()) return
  const w = window.innerWidth
  const h = window.innerHeight
  confetti({
    position: { x: w / 2, y: h * 0.28 },
    count: 140,
    size: 1.05,
    velocity: 220,
    fade: false,
  })
}

watch(
  result,
  (r) => {
    if (r !== 'won') return
    nextTick(() => fireWinConfetti())
  },
  { immediate: true },
)

function retry() {
  router.replace({ name: 'play', params: { id: level.value } })
}
function goNext() {
  router.replace({ name: 'play', params: { id: level.value + 1 } })
}
function goMenu() {
  router.replace({ name: 'menu' })
}
</script>

<style scoped>
.result {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem max(0.85rem, env(safe-area-inset-left, 0px))
    max(1rem, env(safe-area-inset-bottom, 0px));
  color: var(--m3-text);
}

.result__panel {
  position: relative;
  width: min(100%, 320px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 2rem 1.1rem 1.1rem;
}
.result__ribbon {
  position: absolute;
  top: -1.1rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1rem;
  z-index: 2;
}

/* === Звёзды (большие, как в референсе: меньше — больше — меньше) === */
.result__stars-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.95rem;
  padding: 0.45rem 0;
}
.result__big-star {
  width: 3rem;
  height: 3rem;
  fill: #ffcd2c;
  stroke: #6e3911;
  stroke-width: 1.4;
  filter: drop-shadow(0 3px 0 rgba(110, 57, 17, 0.55))
    drop-shadow(0 0 10px rgba(255, 205, 74, 0.55));
  transition: transform 0.2s ease;
}
.result__big-star--mid {
  width: 3.8rem;
  height: 3.8rem;
}
.result__big-star--off {
  fill: #b6a98e;
  filter: drop-shadow(0 3px 0 rgba(60, 40, 20, 0.45));
}

/* === Лист с очками === */
.result__lines {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.45rem 0.6rem;
}
.result__line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-weight: 800;
  color: var(--m3-text-on-wood);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
  font-size: 0.95rem;
}
.result__line-label {
  letter-spacing: 0.05em;
}
.result__line-value {
  font-variant-numeric: tabular-nums;
  color: #6e3911;
}


</style>
