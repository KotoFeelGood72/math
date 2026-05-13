<template>
  <Teleport to="body">
    <Transition name="reward-pop">
      <div
        v-if="visible"
        class="reward-pop"
        role="status"
        aria-live="polite"
      >
        <div class="reward-pop__confetti" aria-hidden="true">
          <span
            v-for="p in confetti"
            :key="p.id"
            class="reward-pop__confetti-piece"
            :style="p.style"
          />
        </div>
        <div class="reward-pop__card">
          <img
            v-if="payload.imageUrl"
            :src="payload.imageUrl"
            class="reward-pop__ico"
            alt=""
            draggable="false"
          />
          <Icon
            v-else-if="payload.icon"
            :icon="payload.icon"
            class="reward-pop__ico reward-pop__ico--svg"
            aria-hidden="true"
          />
          <div class="reward-pop__title">{{ payload.title }}</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'

/**
 * Краткий центральный фидбэк после получения rewarded-награды.
 * Виден ~500мс, разноцветное конфети + иконка/картинка и подпись.
 *
 * Использование:
 *   const popupRef = ref(null)
 *   popupRef.value?.show({ title: '+5 ходов', icon: 'mdi:foot-print' })
 */

const DEFAULT_DURATION_MS = 500
const CONFETTI_COUNT = 18
const CONFETTI_COLORS = [
  '#ffd166',
  '#ef476f',
  '#06d6a0',
  '#118ab2',
  '#f78c6b',
  '#a06cd5',
]

const visible = ref(false)
const payload = ref({
  title: '',
  icon: '',
  imageUrl: '',
})
let hideTimer = 0

const confetti = computed(() => {
  if (!visible.value) return []
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / CONFETTI_COUNT
    const radius = 90 + Math.random() * 60
    const dx = Math.cos(angle) * radius
    const dy = Math.sin(angle) * radius - 20
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    const rot = Math.round((Math.random() - 0.5) * 540)
    return {
      id: i,
      style: {
        '--dx': `${dx.toFixed(1)}px`,
        '--dy': `${dy.toFixed(1)}px`,
        '--rot': `${rot}deg`,
        background: color,
      },
    }
  })
})

/**
 * @param {{ title: string, icon?: string, imageUrl?: string, durationMs?: number }} next
 */
function show(next) {
  if (!next || typeof next.title !== 'string') return
  payload.value = {
    title: next.title,
    icon: next.icon || '',
    imageUrl: next.imageUrl || '',
  }
  visible.value = true
  if (hideTimer) clearTimeout(hideTimer)
  const dur = Math.max(150, next.durationMs ?? DEFAULT_DURATION_MS)
  hideTimer = window.setTimeout(() => {
    visible.value = false
    hideTimer = 0
  }, dur)
}

function hideNow() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = 0
  }
  visible.value = false
}

defineExpose({ show, hideNow })
</script>

<style scoped>
.reward-pop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 1000;
}

.reward-pop__card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  animation: reward-pop-card 500ms cubic-bezier(0.22, 1.2, 0.36, 1) both;
}

.reward-pop__ico {
  width: 96px;
  height: 96px;
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.55));
}

.reward-pop__ico--svg {
  font-size: 88px;
  color: #ffd166;
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.55));
}

.reward-pop__title {
  font-size: 2rem;
  line-height: 1.1;
  text-align: center;
  color: #ffd166;
  /* Многоконтурная тень — читаемо на любом фоне без плашки. */
  text-shadow:
    0 0 1px #6e3911,
    -2px 0 0 #6e3911,
    2px 0 0 #6e3911,
    0 -2px 0 #6e3911,
    0 2px 0 #6e3911,
    -2px -2px 0 #6e3911,
    2px -2px 0 #6e3911,
    -2px 2px 0 #6e3911,
    2px 2px 0 #6e3911,
    0 4px 6px rgba(0, 0, 0, 0.55);
}

.reward-pop__confetti {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.reward-pop__confetti-piece {
  position: absolute;
  width: 10px;
  height: 14px;
  border-radius: 2px;
  transform: translate(0, 0) rotate(0);
  animation: reward-pop-confetti 500ms ease-out forwards;
}

@keyframes reward-pop-card {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes reward-pop-confetti {
  0% {
    transform: translate(0, 0) rotate(0);
    opacity: 1;
  }
  100% {
    transform: translate(var(--dx), var(--dy)) rotate(var(--rot));
    opacity: 0;
  }
}

.reward-pop-enter-active,
.reward-pop-leave-active {
  transition: opacity 160ms ease-out;
}
.reward-pop-enter-from,
.reward-pop-leave-to {
  opacity: 0;
}
</style>
