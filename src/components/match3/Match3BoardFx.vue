<template>
  <div class="m3bf" aria-hidden="true">
    <svg
      class="m3bf__svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="m3bf-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="m3bf-glow-strong" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="m3bf-beam" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(255,255,255,0)" />
          <stop offset="45%" stop-color="rgba(255,248,180,0.95)" />
          <stop offset="55%" stop-color="rgba(255,220,90,0.88)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id="m3bf-bomb-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.95)" />
          <stop offset="35%" stop-color="rgba(255,230,120,0.75)" />
          <stop offset="70%" stop-color="rgba(255,160,60,0.35)" />
          <stop offset="100%" stop-color="rgba(255,120,40,0)" />
        </radialGradient>
      </defs>

      <!-- Радуга: молнии от центра к целям -->
      <g v-if="fx?.type === 'rainbow'" class="m3bf-rainbow">
        <line
          v-for="(tk, i) in fx.targets"
          :key="'z' + tk + i"
          :x1="cx(fx.origin.r, fx.origin.c)"
          :y1="cy(fx.origin.r, fx.origin.c)"
          :x2="cxTr(tk)"
          :y2="cyTr(tk)"
          class="m3bf-lightning"
          :style="{ animationDelay: `${i * 22}ms` }"
        />
      </g>

      <!-- Ракета горизонталь -->
      <g v-else-if="fx?.type === 'lineH'" class="m3bf-beams">
        <rect
          class="m3bf-band m3bf-band--h"
          x="0"
          :y="bandY(fx.row) - bandHalf"
          width="100"
          :height="bandH"
        />
      </g>

      <!-- Ракета вертикаль -->
      <g v-else-if="fx?.type === 'lineV'" class="m3bf-beams">
        <rect
          class="m3bf-band m3bf-band--v"
          :x="bandX(fx.col) - bandHalf"
          y="0"
          :width="bandH"
          height="100"
        />
      </g>

      <!-- Крест: строка + столбец -->
      <g v-else-if="fx?.type === 'cross'" class="m3bf-beams">
        <rect
          class="m3bf-band m3bf-band--h"
          x="0"
          :y="bandY(fx.row) - bandHalf"
          width="100"
          :height="bandH"
        />
        <rect
          class="m3bf-band m3bf-band--v"
          :x="bandX(fx.col) - bandHalf"
          y="0"
          :width="bandH"
          height="100"
        />
        <circle
          class="m3bf-cross-core"
          :cx="bandX(fx.col)"
          :cy="bandY(fx.row)"
          r="5"
        />
      </g>

      <!-- Бомба 3×3 -->
      <g v-else-if="fx?.type === 'bomb'" class="m3bf-bomb">
        <circle
          class="m3bf-bomb-ring"
          :cx="cx(fx.origin.r, fx.origin.c)"
          :cy="cy(fx.origin.r, fx.origin.c)"
          r="18"
        />
        <circle
          class="m3bf-bomb-core"
          :cx="cx(fx.origin.r, fx.origin.c)"
          :cy="cy(fx.origin.r, fx.origin.c)"
          r="10"
        />
      </g>
    </svg>
  </div>
</template>

<script setup>
const props = defineProps({
  /** @type {{ type: string } | null} */
  fx: { type: Object, default: null },
  rows: { type: Number, required: true },
  cols: { type: Number, required: true },
})

const bandH = 7
const bandHalf = bandH / 2

function cx(r, c) {
  return ((c + 0.5) / props.cols) * 100
}
function cy(r, c) {
  return ((r + 0.5) / props.rows) * 100
}
function bandY(row) {
  return ((row + 0.5) / props.rows) * 100
}
function bandX(col) {
  return ((col + 0.5) / props.cols) * 100
}
function cxTr(k) {
  const [r, c] = k.split(',').map((x) => parseInt(x, 10))
  return cx(r, c)
}
function cyTr(k) {
  const [r, c] = k.split(',').map((x) => parseInt(x, 10))
  return cy(r, c)
}
</script>

<style scoped>
.m3bf {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.m3bf__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.m3bf-lightning {
  stroke: rgba(255, 252, 210, 0.95);
  stroke-width: 1.4;
  stroke-linecap: round;
  filter: url(#m3bf-glow-strong);
  opacity: 0;
  animation: m3bf-zap 0.38s ease-out forwards;
}

@keyframes m3bf-zap {
  0% {
    opacity: 0;
    stroke-dasharray: 80 200;
    stroke-dashoffset: 120;
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0.85;
    stroke-dashoffset: 0;
    stroke-dasharray: 200 0;
  }
}

.m3bf-band {
  fill: url(#m3bf-beam);
  filter: url(#m3bf-glow);
  opacity: 0;
  animation: m3bf-beam-in 0.34s ease-out forwards;
}

.m3bf-band--v {
  animation-delay: 0.04s;
}

@keyframes m3bf-beam-in {
  0% {
    opacity: 0;
  }
  45% {
    opacity: 0.95;
  }
  100% {
    opacity: 0.72;
  }
}

.m3bf-cross-core {
  fill: rgba(255, 255, 255, 0.92);
  filter: url(#m3bf-glow-strong);
  opacity: 0;
  animation: m3bf-core-pop 0.38s ease-out 0.06s forwards;
}

@keyframes m3bf-core-pop {
  0% {
    opacity: 0;
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0.78;
  }
}

.m3bf-bomb-ring {
  fill: none;
  stroke: rgba(255, 210, 90, 0.65);
  stroke-width: 2.5;
  opacity: 0;
  animation: m3bf-ring 0.42s ease-out forwards;
}

.m3bf-bomb-core {
  fill: url(#m3bf-bomb-core);
  opacity: 0;
  animation: m3bf-ring 0.42s ease-out 0.06s forwards;
}

@keyframes m3bf-ring {
  0% {
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .m3bf-lightning,
  .m3bf-band,
  .m3bf-cross-core,
  .m3bf-bomb-ring,
  .m3bf-bomb-core {
    animation: none !important;
    opacity: 0.65 !important;
  }
}
</style>
