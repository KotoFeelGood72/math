<template>
  <button
    type="button"
    class="m3cell"
    :class="[
      `m3cell--kind-${kind}`,
      {
        'm3cell--selected': selected,
        'm3cell--dragging': !!dragOffset,
        'm3cell--stone': stoneLayers > 0,
        'm3cell--tutorial': tutorialHighlight,
        'm3cell--tutorial-from': tutorialHighlight && tutorialRole === 'from',
        'm3cell--tutorial-to': tutorialHighlight && tutorialRole === 'to',
      },
    ]"
    :style="rootStyle"
    :aria-label="ariaLabel"
    tabindex="-1"
  >
    <span
      class="m3cell__anim"
      :class="{
        'm3cell__anim--empty': value < 0,
        'm3cell__anim--matching': matching,
        'm3cell__anim--spawning': spawning && value >= 0,
      }"
      :style="cellStyle"
    >
      <img
        v-if="iconSrc"
        class="m3cell__shape"
        :class="{
          'm3cell__shape--hint': hintShake,
          'm3cell__shape--hidden': stoneLayers > 0,
        }"
        :src="iconSrc"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      <template v-if="stoneLayers <= 0">
        <span v-if="specialIcon" class="m3cell__overlay" aria-hidden="true">
          <Icon
            :icon="specialIcon"
            class="m3cell__overlay-ico"
            :style="specialIconStyle"
          />
        </span>
      </template>
    </span>
    <img
      v-if="stoneLayers > 0 && stoneIconSrc"
      class="m3cell__stone-img"
      :src="stoneIconSrc"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { COLOR_PALETTE } from '@/game/levelGenerator.js'
import {
  getBoardChipIconUrl,
  getRainbowChipIconUrl,
  getStoneIconUrl,
} from '@/game/chipIcons.js'
import { getColor, getKind } from '@/game/match3Engine.js'

const props = defineProps({
  value: { type: Number, required: true },
  /** Слои камня под фишкой (визуал + урон в сторе). */
  stoneLayers: { type: Number, default: 0 },
  selected: { type: Boolean, default: false },
  matching: { type: Boolean, default: false },
  spawning: { type: Boolean, default: false },
  dragOffset: { type: Object, default: null },
  /** Подсказка: циклически покачивать картинку фишки. */
  hintShake: { type: Boolean, default: false },
  /** Учебник: подсветка конкретной фишки. */
  tutorialHighlight: { type: Boolean, default: false },
  /** Учебник: роль ('from'|'to') — чтобы слегка различать подсветку. */
  tutorialRole: { type: String, default: null },
})

const colorIdx = computed(() => getColor(props.value))
const kind = computed(() => getKind(props.value))

const color = computed(() => {
  const i = colorIdx.value
  if (i < 0 || i >= COLOR_PALETTE.length) return null
  return COLOR_PALETTE[i]
})

const cellStyle = computed(() => ({
  '--cell-color': color.value?.cssVar || '#ffffff',
}))

const iconSrc = computed(() => {
  if (props.value < 0) return null
  if (kind.value === 'rainbow') return getRainbowChipIconUrl()
  const idx = colorIdx.value
  return getBoardChipIconUrl(idx)
})

const stoneIconSrc = computed(() => getStoneIconUrl())

const specialIcon = computed(() => {
  if (props.stoneLayers > 0) return null
  if (kind.value === 'lineH') return 'mdi:rocket'
  if (kind.value === 'lineV') return 'mdi:rocket'
  if (kind.value === 'bomb') return 'mdi:bomb'
  return null
})

const specialIconStyle = computed(() => {
  if (!specialIcon.value) return null
  // Для вертикальной ракеты просто поворачиваем иконку.
  if (kind.value === 'lineV') return { transform: 'rotate(-90deg)' }
  return null
})

const rootStyle = computed(() => {
  if (!props.dragOffset) return null
  return {
    transform: `translate(${props.dragOffset.x}px, ${props.dragOffset.y}px)`,
    zIndex: 5,
  }
})

const ariaLabel = computed(() => {
  if (props.value < 0) return 'Пусто'
  if (kind.value === 'rainbow') return 'Радужная фишка'
  const base = color.value?.label || 'Фишка'
  if (kind.value === 'lineH') return `${base} — горизонтальная ракета`
  if (kind.value === 'lineV') return `${base} — вертикальная ракета`
  if (kind.value === 'bomb') return `${base} — бомба`
  return base
})
</script>

<style scoped>
.m3cell {
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  touch-action: none;
  overflow: visible;
  transition: transform 0.16s ease;
}
.m3cell:focus,
.m3cell:focus-visible {
  outline: none;
}
.m3cell::before {
  content: '';
  position: absolute;
  inset: 4%;
  border-radius: 14%;
  pointer-events: none;
  background: linear-gradient(
    165deg,
    rgba(255, 255, 255, 0.72) 0%,
    rgba(206, 233, 246, 0.62) 48%,
    rgba(146, 196, 222, 0.58) 100%
  );
  border: 1px solid rgba(70, 105, 130, 0.22);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -3px 8px rgba(55, 105, 135, 0.18),
    0 1px 4px rgba(0, 0, 0, 0.14);
}
.m3cell--stone::before {
  opacity: 0;
}
.m3cell__stone-img {
  position: absolute;
  inset: 4%;
  width: 92%;
  height: 92%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
  z-index: 3;
}
.m3cell__shape--hidden {
  opacity: 0;
}
.m3cell--dragging {
  cursor: grabbing;
  transition: none;
  z-index: 5;
}

.m3cell--tutorial::before {
  opacity: 1;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -3px 8px rgba(55, 105, 135, 0.14),
    0 0 0 3px rgba(255, 226, 122, 0.85),
    0 10px 20px rgba(0, 0, 0, 0.18);
}
.m3cell--tutorial-from::before {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -3px 8px rgba(55, 105, 135, 0.14),
    0 0 0 3px rgba(120, 168, 255, 0.88),
    0 10px 20px rgba(0, 0, 0, 0.18);
}
.m3cell--tutorial-to::before {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -3px 8px rgba(55, 105, 135, 0.14),
    0 0 0 3px rgba(255, 180, 88, 0.9),
    0 10px 20px rgba(0, 0, 0, 0.18);
}
.m3cell--tutorial .m3cell__anim {
  animation: m3-tutorial-bob 0.8s ease-in-out infinite;
}
@keyframes m3-tutorial-bob {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-2px) scale(1.03);
  }
}

.m3cell--kind-lineH::before,
.m3cell--kind-lineV::before,
.m3cell--kind-bomb::before,
.m3cell--kind-rainbow::before {
  filter: brightness(1.08) saturate(1.06);
}

.m3cell--kind-lineH .m3cell__anim,
.m3cell--kind-lineV .m3cell__anim,
.m3cell--kind-bomb .m3cell__anim,
.m3cell--kind-rainbow .m3cell__anim {
  animation: m3-special-idle 1.45s ease-in-out infinite;
}

@keyframes m3-special-idle {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-1px) scale(1.02);
  }
}

.m3cell__anim {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  padding: 8%;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  transform-origin: center;
  transition: transform 0.18s ease, opacity 0.18s ease;
  will-change: transform, opacity;
  isolation: isolate;
}

/* Иконка фишки */
.m3cell__shape {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.38));
  user-select: none;
  pointer-events: none;
  position: relative;
  z-index: 0;
}

.m3cell__shape--hint {
  animation: m3cell-hint-wobble 0.38s ease-in-out infinite;
  transform-origin: 50% 72%;
}

@keyframes m3cell-hint-wobble {
  0%,
  100% {
    transform: translateX(-1.5px) rotate(-5deg);
  }
  50% {
    transform: translateX(1.5px) rotate(5deg);
  }
}

.m3cell__anim--empty {
  opacity: 0;
  transform: scale(0.4);
}

.m3cell--selected .m3cell__anim {
  transform: scale(0.86);
}

.m3cell__anim--matching {
  animation: m3-pulse 280ms ease-in forwards;
  z-index: 2;
}
@keyframes m3-pulse {
  0% {
    transform: scale(1);
    opacity: 1;
    filter: brightness(1) drop-shadow(0 0 0 rgba(255, 255, 255, 0));
  }
  35% {
    transform: scale(1.24);
    opacity: 1;
    filter: brightness(1.5) drop-shadow(0 0 14px rgba(255, 255, 255, 0.85));
  }
  70% {
    transform: scale(1.05);
    opacity: 0.95;
    filter: brightness(1.6) drop-shadow(0 0 10px rgba(255, 255, 255, 0.7));
  }
  100% {
    transform: scale(0.25);
    opacity: 0;
    filter: brightness(1.7) drop-shadow(0 0 6px rgba(255, 255, 255, 0.5));
  }
}

.m3cell__anim--spawning {
  animation: m3-drop 320ms cubic-bezier(0.18, 0.7, 0.45, 1.35);
}
@keyframes m3-drop {
  0% {
    transform: translateY(-110%) scale(0.55);
    opacity: 0;
  }
  55% {
    transform: translateY(8%) scale(1.08);
    opacity: 1;
  }
  78% {
    transform: translateY(-2%) scale(0.97);
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

/* === Бустер-оверлеи === */
.m3cell__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  font-weight: 900;
  color: #fff;
  text-shadow:
    0 1px 0 rgba(0, 0, 0, 0.6),
    0 0 6px rgba(0, 0, 0, 0.5);
  font-size: 1.35rem;
  line-height: 1;
  z-index: 20;
}

.m3cell__overlay-ico {
  width: 1.35rem;
  height: 1.35rem;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35));
  position: relative;
  z-index: 21;
}

/* Спец.-фишки выделяем светящимся «гало», чтобы их было видно на доске */
.m3cell--selected .m3cell__shape {
  filter:
    drop-shadow(0 2px 6px rgba(0, 0, 0, 0.38))
    drop-shadow(0 0 0 rgba(255, 255, 255, 0.0))
    drop-shadow(0 0 14px rgba(255, 255, 255, 0.55));
}
.m3cell--kind-lineH .m3cell__shape,
.m3cell--kind-lineV .m3cell__shape,
.m3cell--kind-bomb .m3cell__shape,
.m3cell--kind-rainbow .m3cell__shape {
  filter:
    drop-shadow(0 2px 6px rgba(0, 0, 0, 0.38))
    drop-shadow(0 0 0 rgba(255, 255, 255, 0.0))
    drop-shadow(0 0 12px rgba(255, 255, 255, 0.28));
}
</style>
