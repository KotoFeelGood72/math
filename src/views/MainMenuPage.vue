<template>
  <PhoneFrame :parallax="false" :stickers="true">
    <div class="menu" data-allow-browser-scroll>
      <header class="menu__topbar">
        <button type="button" class="menu__cog" aria-label="Настройки" @click="goSettings">
          <Icon icon="mdi:cog" />
        </button>

        <div class="menu__top-pills">
          <span class="m3-top-pill" :title="`Звёзды: ${totalStars}`">
            <span class="m3-top-pill__icon m3-top-pill__icon--star" aria-hidden="true">
              <Icon icon="mdi:star" />
            </span>
            {{ totalStars }}
          </span>
          <button
            type="button"
            class="m3-top-pill menu__coin-pill"
            :title="`Монеты: ${coins}. Открыть магазин`"
            aria-label="Магазин, монеты"
            @click="goShop"
          >
            <span class="m3-top-pill__icon m3-top-pill__icon--coin" aria-hidden="true">
              <Icon icon="mdi:cash" />
            </span>
            {{ coins }}
          </button>
        </div>
      </header>

      <div class="menu__logo-wrap">
        <img
          class="menu__logo"
          :src="logoUrl"
          alt="Три в ряд — собирай тройки, бей рекорды"
          decoding="async"
          draggable="false"
        />
      </div>

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
          color="amber"
          icon="mdi:shopping-outline"
          title="Магазин"
          subLabel="Бустеры за монеты"
          actionLabel="В МАГАЗИН"
          @click="goShop"
        />
      </div>
    </div>
  </PhoneFrame>
</template>

<script setup>
defineOptions({ name: "MainMenuPage" });

import { computed } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import PhoneFrame from "@/components/PhoneFrame.vue";
import MenuCardButton from "@/components/MenuCardButton.vue";
import { useMatch3ProgressStore } from "@/stores/match3Progress";
import { Icon } from "@iconify/vue";

const router = useRouter();
const logoUrl = `${import.meta.env.BASE_URL}logo.png`;
const progress = useMatch3ProgressStore();
const { highestUnlocked, totalStars, coins } = storeToRefs(progress);

const playLabel = computed(() => (progress.completedCount > 0 ? "Продолжить" : "Играть"));

function playNext() {
  // Первый запуск: сначала учебный уровень.
  const id = progress.needsTutorial ? 1 : highestUnlocked.value;
  router.push({ name: "play", params: { id } });
}
function goShop() {
  router.push({ name: "shop" });
}
function goSettings() {
  router.push({ name: "settings" });
}
</script>

<style scoped>
.menu {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.65rem;
  padding: 0 0.85rem max(1rem, env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  color: var(--m3-text);
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  justify-content: space-between;
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

.menu__coin-pill {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.menu__coin-pill:active {
  transform: translateY(1px);
}

.menu__logo-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  max-width: 200px;
  margin: 0 auto;
}
.menu__logo {
  display: block;
  height: auto;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
  filter: drop-shadow(0 4px 0 rgba(110, 57, 17, 0.35)) drop-shadow(0 2px 12px rgba(0, 40, 90, 0.18));
  width: 100%;
  height: 100%;
}

.menu__cards {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
</style>
