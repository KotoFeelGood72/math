<template>
  <button
    type="button"
    class="m3-card menu-card"
    :class="cardModifier"
    v-bind="attrs"
  >
    <span class="menu-card__left">
      <span class="menu-card__icon" aria-hidden="true">
        <Icon :icon="icon" />
      </span>
      <span class="menu-card__body">
        <span class="menu-card__title">{{ title }}</span>
        <span v-if="subLabel" class="menu-card__sub">{{ subLabel }}</span>
      </span>
    </span>
    <span class="m3-go-btn menu-card__go">{{ actionLabel }}</span>
  </button>
</template>

<script setup>
defineOptions({ name: 'MenuCardButton', inheritAttrs: false })

import { computed, useAttrs } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  subLabel: { type: String, default: '' },
  actionLabel: { type: String, required: true },
  color: {
    type: String,
    default: 'orange',
    validator: (v) => ['orange', 'purple', 'amber', 'red', 'green'].includes(v),
  },
})

const attrs = useAttrs()

const cardModifier = computed(() => {
  if (props.color === 'purple') return 'm3-card--purple'
  if (props.color === 'amber') return 'm3-card--amber'
  if (props.color === 'red') return 'm3-card--red'
  if (props.color === 'green') return 'm3-card--green'
  return 'menu-card--orange'
})
</script>

<style scoped>
.menu-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.58rem;
  padding: 0.65rem 0.65rem 0.65rem 0.75rem;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  border-radius: 18px;
}

.menu-card__left {
  display: flex;
  align-items: center;
  gap: 0.58rem;
  min-width: 0;
  flex: 1;
}
.menu-card:active {
  transform: translateY(2px);
}

.menu-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.45rem;
  height: 2.45rem;
  border-radius: 11px;
  border: 3px solid var(--m3-border-dark);
  background: linear-gradient(180deg, #fff7d8 0%, #ffd672 100%);
  color: #6e3911;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.65),
    inset 0 -2px 0 rgba(110, 57, 17, 0.3),
    0 2px 0 rgba(110, 57, 17, 0.45);
}
.menu-card__icon :deep(svg) {
  width: 1.38rem;
  height: 1.38rem;
  display: block;
}

.menu-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.menu-card__title {
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fff;
  text-shadow:
    -1px 0 0 #6e3911,
    1px 0 0 #6e3911,
    0 -1px 0 #6e3911,
    0 1px 0 #6e3911,
    0 2px 0 rgba(110, 57, 17, 0.5);
}
.menu-card__sub {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #fff;
  text-shadow:
    -1px 0 0 #6e3911,
    1px 0 0 #6e3911,
    0 -1px 0 #6e3911,
    0 1px 0 #6e3911;
}
.menu-card__go {
  flex-shrink: 0;
  padding: 0.45rem 0.95rem;
  font-size: 0.95rem;
}
</style>
