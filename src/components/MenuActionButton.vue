<template>
  <button
    type="button"
    class="menu-action-btn"
    :class="variantModifier"
    v-bind="attrs"
  >
    <span
      v-if="!isBackdrop"
      class="menu-action-btn__text"
      :class="textClass"
    >
      <slot />
    </span>
  </button>
</template>

<script setup>
defineOptions({ inheritAttrs: false })

import { computed, useAttrs } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'hero',
    validator: (v) =>
      [
        'hero',
        'toolbar',
        'panel',
        'backdrop',
        'mute',
        'choice',
        'chrome-icon',
      ].includes(v),
  },
})

const attrs = useAttrs()

const variantModifier = computed(() => `menu-action-btn--${props.variant}`)
const isBackdrop = computed(() => props.variant === 'backdrop')

const textClass = computed(() => ({
  'menu-action-btn__text--choice': props.variant === 'choice',
  'menu-action-btn__text--chrome-icon': props.variant === 'chrome-icon',
  'menu-action-btn__text--mute': props.variant === 'mute',
}))
</script>

<style scoped>
.menu-action-btn {
  cursor: pointer;
  margin: 0 auto;
  border: none;
  font: inherit;
  text-align: center;
  border-radius: 14px;
  transition: transform 0.1s ease, filter 0.2s ease;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: none;
}

.menu-action-btn__text {
  display: block;
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.2;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);
}

.menu-action-btn__text--choice {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.7rem;
  text-align: left;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.02em;
  text-transform: none;
}

.menu-action-btn__text--chrome-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  line-height: 0;
  letter-spacing: normal;
  text-transform: none;
  font-weight: normal;
  font-size: 0;
}

.menu-action-btn__text--chrome-icon :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.menu-action-btn__text--mute {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
  letter-spacing: normal;
  text-transform: none;
  font-weight: normal;
  font-size: 0;
  line-height: 0;
}

.menu-action-btn__text--mute :deep(svg) {
  width: 1.2rem;
  height: 1.2rem;
  display: block;
}

/* === HERO: большая оранжевая «GO!»-кнопка === */
.menu-action-btn--hero {
  display: block;
  width: min(80vw, 320px);
  max-width: 100%;
  padding: 0.9rem 1.4rem;
  color: #fff;
  background: linear-gradient(
    180deg,
    var(--m3-go-1, #ffba51) 0%,
    var(--m3-go-2, #e6762a) 100%
  );
  border: 3px solid var(--m3-border-dark, #2a0810);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.45),
    inset 0 -4px 0 rgba(0, 0, 0, 0.28),
    0 4px 0 rgba(0, 0, 0, 0.4),
    0 8px 18px rgba(0, 0, 0, 0.5);
}
.menu-action-btn--hero:active {
  transform: translateY(3px);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.35),
    inset 0 -2px 0 rgba(0, 0, 0, 0.22),
    0 1px 0 rgba(0, 0, 0, 0.35);
}

/* === TOOLBAR: вторичная кнопка (бордовая с золотой обводкой) === */
.menu-action-btn--toolbar {
  display: block;
  width: min(80vw, 320px);
  max-width: 100%;
  padding: 0.75rem 1.2rem;
  color: #fff;
  background: linear-gradient(
    180deg,
    #6e1f2a 0%,
    #3d0e16 100%
  );
  border: 3px solid var(--m3-border-dark, #2a0810);
  box-shadow:
    inset 0 2px 0 rgba(255, 230, 180, 0.35),
    inset 0 -3px 0 rgba(0, 0, 0, 0.35),
    0 3px 0 rgba(0, 0, 0, 0.4),
    0 6px 14px rgba(0, 0, 0, 0.45);
}
.menu-action-btn--toolbar:active {
  transform: translateY(2px);
}

/* === PANEL: компактная панель-pill для модалок === */
.menu-action-btn--panel {
  display: block;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border-radius: 12px;
  border: 2.5px solid var(--m3-border-dark, #2a0810);
  background: linear-gradient(
    180deg,
    rgba(74, 22, 32, 0.95) 0%,
    rgba(42, 9, 19, 0.95) 100%
  );
  color: var(--m3-text, #fff);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  box-shadow:
    inset 0 1px 0 rgba(255, 230, 180, 0.2),
    0 2px 0 rgba(0, 0, 0, 0.35);
}
.menu-action-btn--panel .menu-action-btn__text {
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  text-shadow: inherit;
}
.menu-action-btn--panel:active {
  transform: translateY(2px);
}

/* === BACKDROP: оверлей под модалку === */
.menu-action-btn--backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  border-radius: 0;
  border: none;
  background: rgba(20, 4, 8, 0.78);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  cursor: pointer;
}
.menu-action-btn--backdrop:hover,
.menu-action-btn--backdrop:active {
  filter: none;
  transform: none;
}

/* === MUTE / CHOICE / CHROME-ICON — вспомогательные, оставлены ради совместимости === */
.menu-action-btn--mute {
  display: flex;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin: 0;
  padding: 5px;
  border-radius: 50%;
  border: 2px solid var(--m3-border-dark, #2a0810);
  color: #fff;
  background: rgba(74, 22, 32, 0.85);
}
.menu-action-btn--choice {
  display: flex;
  width: 100%;
  margin: 0;
  max-width: none;
  padding: 0.7rem 0.8rem;
  text-align: left;
  border-radius: 12px;
  border: 2.5px solid var(--m3-border-dark, #2a0810);
  background: linear-gradient(
    180deg,
    #6e1f2a 0%,
    #3d0e16 100%
  );
  color: #fff;
}
.menu-action-btn--chrome-icon {
  display: flex;
  margin: 0;
  width: 3.25rem;
  height: 3.25rem;
  max-width: none;
  padding: 0;
  border: none;
  background: none;
  border-radius: 12px;
}

.menu-action-btn:focus-visible {
  outline: 3px solid var(--m3-accent, #ffba51);
  outline-offset: 3px;
}
</style>
