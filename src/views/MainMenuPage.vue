<template>
  <PhoneFrame :parallax="false">
    <div class="menu">
      <header class="menu__topbar">
        <button
          type="button"
          class="menu__cog"
          aria-label="Настройки"
          @click="goSettings"
        >
          <Icon icon="mdi:cog" />
        </button>

        <div class="menu__top-pills">
          <span class="m3-top-pill" :title="`Звёзды: ${totalStars}`">
            <span class="m3-top-pill__icon m3-top-pill__icon--star" aria-hidden="true">
              <Icon icon="mdi:star" />
            </span>
            {{ totalStars }}
          </span>
          <span class="m3-top-pill" :title="`Монеты: ${coins}`">
            <span class="m3-top-pill__icon m3-top-pill__icon--coin" aria-hidden="true">
              <Icon icon="mdi:cash" />
            </span>
            {{ coins }}
          </span>
        </div>
      </header>

      <h1 class="menu__title">три&nbsp;в&nbsp;ряд</h1>
      <p class="menu__subtitle">Собирай тройки. Бей рекорды.</p>

      <div class="menu__cards">
        <MenuCardButton
          color="orange"
          icon="mdi:gamepad-variant"
          :title="playLabel"
          :subLabel="`Уровень ${highestUnlocked}`"
          actionLabel="ИГРАТЬ"
          @click="playNext"
        />

        <MenuCardButton
          color="purple"
          icon="mdi:map-outline"
          title="Уровни"
          :subLabel="`${completedCount} из ${totalLevels}`"
          actionLabel="ОТКРЫТЬ"
          @click="goLevels"
        />

        <MenuCardButton
          color="green"
          icon="mdi:help-circle-outline"
          title="Как играть"
          subLabel="Инструкция"
          actionLabel="ЧИТАТЬ"
          @click="goHowToPlay"
        />

      </div>
    </div>
  </PhoneFrame>
</template>

<script setup>
defineOptions({ name: 'MainMenuPage' })

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PhoneFrame from '@/components/PhoneFrame.vue'
import MenuCardButton from '@/components/MenuCardButton.vue'
import { useMatch3ProgressStore } from '@/stores/match3Progress'
import { Icon } from '@iconify/vue'

const router = useRouter()
const progress = useMatch3ProgressStore()
const {
  highestUnlocked,
  totalStars,
  totalLevels,
  completedCount,
  coins,
} = storeToRefs(progress)

const playLabel = computed(() =>
  progress.completedCount > 0 ? 'Продолжить' : 'Играть',
)

function playNext() {
  // Первый запуск: сначала учебный уровень.
  const id = progress.needsTutorial ? 1 : highestUnlocked.value
  router.push({ name: 'play', params: { id } })
}
function goLevels() {
  router.push({ name: 'levels' })
}
function goHowToPlay() {
  router.push({ name: 'how-to-play' })
}
function goSettings() {
  router.push({ name: 'settings' })
}
</script>

<style scoped>
.menu {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 0.85rem 1rem;
  box-sizing: border-box;
  color: var(--m3-text);
}

.menu__topbar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  padding: max(0.6rem, env(safe-area-inset-top, 0px)) 0.1rem 0.4rem;
}
.menu__cog {
  flex-shrink: 0;
  width: 2.4rem;
  height: 2.4rem;
  border: 3px solid var(--m3-border-dark);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--m3-go-1) 0%, var(--m3-go-2) 100%);
  color: #6e3911;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    inset 0 -2px 0 rgba(110, 57, 17, 0.35),
    0 3px 0 rgba(110, 57, 17, 0.55);
}
.menu__cog :deep(svg) {
  width: 1.2rem;
  height: 1.2rem;
}
.menu__cog:active {
  transform: translateY(2px);
}
.menu__top-pills {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.menu__title {
  margin: 1.6rem 0 0.35rem;
  text-align: center;
  font-size: clamp(2.6rem, 13vw, 3.4rem);
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  font-family: 'Segoe UI', system-ui, sans-serif;
  text-shadow:
    -2px 0 0 #6e3911,
    2px 0 0 #6e3911,
    0 -2px 0 #6e3911,
    0 2px 0 #6e3911,
    -2px -2px 0 #6e3911,
    2px -2px 0 #6e3911,
    -2px 2px 0 #6e3911,
    2px 2px 0 #6e3911,
    0 5px 0 rgba(110, 57, 17, 0.6),
    0 0 18px rgba(255, 226, 122, 0.7);
}
.menu__title::first-letter {
  color: #ffd84a;
}
.menu__subtitle {
  margin: 0 0 1.4rem;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.05em;
  text-shadow:
    -1px 0 0 #6e3911,
    1px 0 0 #6e3911,
    0 -1px 0 #6e3911,
    0 1px 0 #6e3911,
    0 2px 0 rgba(110, 57, 17, 0.5);
}

.menu__cards {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: auto;
}
</style>
