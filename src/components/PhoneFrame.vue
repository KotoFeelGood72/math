<script setup>
import sticker1 from '@/assets/images/sticker/1.png'
import sticker2 from '@/assets/images/sticker/2.png'
import sticker3 from '@/assets/images/sticker/3.png'
import sticker4 from '@/assets/images/sticker/4.png'

defineProps({
  /** false — фон без горизонтального движения (экран уровня match-3). */
  parallax: {
    type: Boolean,
    default: true,
  },
  /** Включать декоративные стикеры, «выглядывающие» по бокам внутри экрана. */
  stickers: {
    type: Boolean,
    default: false,
  },
});

/**
 * Декоративные стикеры внутри экрана телефона: половина стикера уходит за
 * левый/правый край и обрезается `overflow: hidden` экрана — создаётся
 * эффект «выглядывания» из-за рамки.
 */
const SIDE_STICKERS = [
  { src: sticker1, side: 'left', y: '6%', rot: '-14deg', size: 8 },
  { src: sticker3, side: 'left', y: '60%', rot: '8deg', size: 7.5 },
  { src: sticker2, side: 'right', y: '12%', rot: '12deg', size: 7.5 },
  { src: sticker4, side: 'right', y: '66%', rot: '-10deg', size: 8 },
]
</script>

<template>
  <div class="phone-rc" :class="{ 'phone-rc--static-bg': !parallax }">
    <div class="phone-rc__parallax phone-rc__parallax--outer" aria-hidden="true">
      <div class="phone-rc__parallax-strip phone-rc__parallax-strip--slow" />
    </div>
    <div class="phone-rc__phone">
      <div class="phone-rc__screen">
        <div class="phone-rc__parallax phone-rc__parallax--inner" aria-hidden="true">
          <div class="phone-rc__parallax-strip phone-rc__parallax-strip--fast" />
        </div>
        <div v-if="stickers" class="phone-rc__side-stickers" aria-hidden="true">
          <img
            v-for="(s, i) in SIDE_STICKERS"
            :key="i"
            :src="s.src"
            :class="[
              'phone-rc__side-sticker',
              `phone-rc__side-sticker--${s.side}`,
            ]"
            :style="{
              top: s.y,
              '--rot': s.rot,
              '--size': `${s.size}rem`,
            }"
            alt=""
            draggable="false"
          />
        </div>
        <div class="phone-rc__content">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.phone-rc {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  box-sizing: border-box;
  overflow: hidden;
  touch-action: none;
  overscroll-behavior: none;
  background: linear-gradient(180deg, #b9e3fa 0%, #88cdf0 55%, #4ea6e0 100%);
}

/* Один непрерывный слой: repeat-x + один мотив = ширина вьюпорта — без вертикального «шва» от двух cover */
.phone-rc__parallax {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.phone-rc__parallax-strip {
  position: absolute;
  left: 0;
  top: -5%;
  width: 200%;
  height: 110%;
  background-image: url("@/assets/images/bg.png");
  background-repeat: repeat-x;
  /* Один повтор ровно на ширину вьюпорта родителя — цикл translateX(-50%) совпадает с периодом */
  background-size: 50% 100%;
  background-position: 0 50%;
  will-change: transform;
  backface-visibility: hidden;
}

.phone-rc__parallax-strip--slow {
  animation: phone-rc-drift 95s linear infinite;
}
.phone-rc__parallax-strip--fast {
  animation: phone-rc-drift 68s linear infinite;
}

.phone-rc--static-bg .phone-rc__parallax-strip {
  width: 100%;
  animation: none;
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
  will-change: auto;
}

@keyframes phone-rc-drift {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .phone-rc:not(.phone-rc--static-bg) .phone-rc__parallax-strip--slow,
  .phone-rc:not(.phone-rc--static-bg) .phone-rc__parallax-strip--fast {
    animation: none;
  }
}

/* Стикеры внутри экрана: половина каждого уходит за левый/правый край
   и обрезается `overflow: hidden` у `.phone-rc__screen` — эффект
   «выглядывания» из-за рамки телефона. */
.phone-rc__side-stickers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* Выше фонового parallax (z-index: 0), ниже контента (z-index: 1). */
  z-index: 0;
}

.phone-rc__side-sticker {
  position: absolute;
  width: var(--size, 7.5rem);
  height: var(--size, 7.5rem);
  filter: drop-shadow(0 8px 14px rgba(40, 20, 5, 0.45));
  user-select: none;
  -webkit-user-drag: none;
}

.phone-rc__side-sticker--left {
  left: 0;
  /* -35% по X — за краем остаётся ~треть, остальное выглядывает. */
  transform: translateX(-35%) rotate(var(--rot, 0deg));
}

.phone-rc__side-sticker--right {
  right: 0;
  transform: translateX(35%) rotate(var(--rot, 0deg));
}

.phone-rc__phone {
  position: relative;
  z-index: 1;
  width: min(100%, 420px);
  aspect-ratio: 9 / 16;
  max-height: min(92vh, 780px);
  border-radius: 26px;
  padding: 4px;
  background: linear-gradient(145deg, #ffe27a 0%, #ff9d1f 45%, #6e3911 100%);
  box-shadow:
    0 0 0 1px rgba(110, 57, 17, 0.5),
    0 24px 60px rgba(60, 30, 10, 0.55),
    inset 0 2px 0 rgba(255, 255, 255, 0.45);
}

.phone-rc__screen {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 22px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #b9e3fa 0%, #6ec4ea 100%);
}

/* Контент-слот поверх дрейфующего фона */
.phone-rc__content {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  /*
    Полноэкранный режим: без вертикального центрирования — хедер у верхнего края,
    нижняя панель у нижнего (контент колонкой заполняет высоту).
  */
  .phone-rc {
    flex: 1;
    min-height: 0;
    width: 100%;
    padding: 0;
    box-sizing: border-box;
    align-items: stretch;
    justify-content: flex-start;
    align-self: stretch;
  }
  .phone-rc__phone {
    width: 100%;
    flex: 1 1 auto;
    min-height: 0;
    max-width: none;
    max-height: none;
    aspect-ratio: unset;
    border-radius: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
    align-self: stretch;
  }
  .phone-rc__screen {
    border-radius: 0;
    min-height: 0;
  }
  .phone-rc__content {
    flex: 1 1 auto;
    min-height: 0;
  }
}
</style>
