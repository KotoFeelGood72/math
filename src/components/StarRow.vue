<template>
  <span class="stars" :class="`stars--${size}`" :aria-label="`${value} из ${max} звёзд`">
    <svg
      v-for="i in max"
      :key="i"
      class="stars__icon"
      :class="{ 'stars__icon--on': i <= value }"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 2.5l2.94 6.34 6.86.78-5.1 4.78 1.46 6.85L12 17.78 5.84 21.25l1.46-6.85L2.2 9.62l6.86-.78L12 2.5z"
      />
    </svg>
  </span>
</template>

<script setup>
defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 3 },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
})
</script>

<style scoped>
.stars {
  display: inline-flex;
  gap: 0.18rem;
  align-items: center;
}
.stars__icon {
  width: 1.05rem;
  height: 1.05rem;
  fill: rgba(120, 130, 150, 0.32);
  stroke: rgba(0, 0, 0, 0.3);
  stroke-width: 0.6;
}
.stars__icon--on {
  fill: var(--m3-star, #ffcd4a);
  filter: drop-shadow(0 0 4px rgba(255, 205, 74, 0.55));
}
.stars--sm .stars__icon {
  width: 0.78rem;
  height: 0.78rem;
}
.stars--lg .stars__icon {
  width: 1.85rem;
  height: 1.85rem;
}
</style>
