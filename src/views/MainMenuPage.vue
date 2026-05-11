<template>
  <PhoneFrame :parallax="false">
    <div class="menu">
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
          <span class="m3-top-pill" :title="`Монеты: ${coins}`">
            <span class="m3-top-pill__icon m3-top-pill__icon--coin" aria-hidden="true">
              <Icon icon="mdi:cash" />
            </span>
            {{ coins }}
          </span>
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
const { highestUnlocked, totalStars, totalLevels, completedCount, coins } = storeToRefs(progress);

const playLabel = computed(() => (progress.completedCount > 0 ? "Продолжить" : "Играть"));

function playNext() {
  // Первый запуск: сначала учебный уровень.
  const id = progress.needsTutorial ? 1 : highestUnlocked.value;
  router.push({ name: "play", params: { id } });
}
function goLevels() {
  router.push({ name: "levels" });
}
function goHowToPlay() {
  router.push({ name: "how-to-play" });
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
  justify-content: space-between;
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

.menu__logo-wrap {
  /* margin: 2.35rem auto; */
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  margin-top: 30px;
}
.menu__logo {
  display: block;
  /* width: min(98vw, 27rem);
  max-height: min(50vh, 17.5rem); */
  height: auto;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
  filter: drop-shadow(0 4px 0 rgba(110, 57, 17, 0.35)) drop-shadow(0 2px 12px rgba(0, 40, 90, 0.18));
}

.menu__cards {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.85rem;
  /* margin-top: auto; */
}
</style>
