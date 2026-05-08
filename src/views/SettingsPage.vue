<template>
  <PhoneFrame :parallax="false">
    <div class="settings">
      <header class="settings__top">
        <button
          type="button"
          class="settings__back"
          aria-label="Назад"
          @click="goBack"
        >
          <Icon icon="mdi:chevron-left" />
        </button>
        <h1 class="settings__title">Настройки</h1>
        <div class="settings__top-spacer" />
      </header>

      <Swiper
        class="settings__swiper"
        :modules="swiperModules"
        direction="vertical"
        :slidesPerView="'auto'"
        :freeMode="{ enabled: true, sticky: false }"
        :mousewheel="{ forceToAxis: true, releaseOnEdges: true }"
      >
        <SwiperSlide class="settings__slide">
          <section
            class="settings__panel m3-modal-panel"
            aria-labelledby="settings-sound-h"
          >
            <h2 id="settings-sound-h" class="settings__panel-title">Звук</h2>

            <div class="settings__toggle-row">
              <span class="settings__toggle-label" id="settings-music-l">
                Фоновая музыка
              </span>
              <button
                type="button"
                class="settings__switch"
                role="switch"
                aria-labelledby="settings-music-l"
                :aria-checked="musicEnabled"
                @click="audio.toggleMusicEnabled()"
              >
                <span class="settings__switch-track" aria-hidden="true">
                  <span class="settings__switch-knob" />
                </span>
              </button>
            </div>

            <div class="settings__toggle-row">
              <span class="settings__toggle-label" id="settings-sfx-l">
                Звуковые эффекты
              </span>
              <button
                type="button"
                class="settings__switch"
                role="switch"
                aria-labelledby="settings-sfx-l"
                :aria-checked="sfxEnabled"
                @click="audio.toggleSfxEnabled()"
              >
                <span class="settings__switch-track" aria-hidden="true">
                  <span class="settings__switch-knob" />
                </span>
              </button>
            </div>

            <div
              class="settings__sound-row"
              role="group"
              aria-labelledby="settings-master-l"
            >
              <span id="settings-master-l" class="settings__range-label"
                >Громкость</span
              >
              <input
                class="settings__range"
                type="range"
                min="0"
                max="1"
                step="0.05"
                :value="volume"
                :aria-valuetext="volumeAriaText"
                @input="onVolumeInput"
              />
              <button
                type="button"
                class="settings__mute m3-round-icon-btn"
                :aria-label="muted ? 'Включить звук' : 'Выключить звук'"
                :aria-pressed="muted"
                @click="audio.toggleMuted()"
              >
                <Icon
                  class="settings__mute-icon"
                  :icon="muted ? 'mdi:volume-off' : 'mdi:volume-high'"
                />
              </button>
            </div>
          </section>
        </SwiperSlide>

        <SwiperSlide class="settings__slide">
          <section
            class="settings__panel m3-modal-panel"
            aria-labelledby="settings-progress-h"
          >
            <h2 id="settings-progress-h" class="settings__panel-title">
              Прогресс
            </h2>
            <p class="settings__progress-lead">
              Пройдено
              <span class="settings__progress-num">{{ completedCount }}</span> из
              <span class="settings__progress-num">{{ totalLevels }}</span>
              ({{ progressPercent }}%)
            </p>
            <div
              class="settings__progress-track"
              role="progressbar"
              :aria-valuenow="progressPercent"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                class="settings__progress-fill"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
          </section>
        </SwiperSlide>

        <SwiperSlide class="settings__slide">
          <section class="settings__panel m3-modal-panel" aria-label="Навигация">
            <h2 class="settings__panel-title settings__panel-title--solo">
              Разделы
            </h2>
            <button
              type="button"
              class="settings__link-row"
              @click="goStatistics"
            >
              <span class="settings__link-label">Статистика</span>
              <span class="settings__link-chevron" aria-hidden="true">
                <Icon icon="mdi:chevron-right" />
              </span>
            </button>
            <button type="button" class="settings__link-row" @click="goProfile">
              <span class="settings__link-label">Профиль</span>
              <span class="settings__link-chevron" aria-hidden="true">
                <Icon icon="mdi:chevron-right" />
              </span>
            </button>
          </section>
        </SwiperSlide>
      </Swiper>

      <footer class="settings__bottom-bar">
        <MenuActionButton
          variant="hero"
          class="settings__bottom-back"
          @click="goBack"
        >
          Назад
        </MenuActionButton>
      </footer>
    </div>
  </PhoneFrame>
</template>

<script setup>
defineOptions({ name: 'SettingsPage' })

import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PhoneFrame from '@/components/PhoneFrame.vue'
import MenuActionButton from '@/components/MenuActionButton.vue'
import { Icon } from '@iconify/vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { FreeMode, Mousewheel } from 'swiper'
import {
  useAudioSettingsStore,
  useAudioSettingsStoreRefs,
} from '@/stores/audioSettings'
import { useMatch3ProgressStore } from '@/stores/match3Progress'

const router = useRouter()
const audio = useAudioSettingsStore()
const { volume, muted, musicEnabled, sfxEnabled } =
  useAudioSettingsStoreRefs()
const progress = useMatch3ProgressStore()
const { completedCount, totalLevels, progressPercent } = storeToRefs(progress)

const swiperModules = [FreeMode, Mousewheel]

const volumeAriaText = computed(() => {
  const pct = Math.round((muted.value ? 0 : volume.value) * 100)
  return `${pct}%`
})

function onVolumeInput(e) {
  audio.setVolume(e.target.valueAsNumber)
}
function goBack() {
  router.push({ name: 'menu' })
}
function goStatistics() {
  router.push({ name: 'statistics' })
}
function goProfile() {
  router.push({ name: 'profile' })
}

function onEscape(e) {
  if (e.key === 'Escape') goBack()
}
onMounted(() => window.addEventListener('keydown', onEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', onEscape))
</script>

<style scoped>
.settings {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  color: var(--m3-text);
}

/* Шапка — как на экране уровня */
.settings__top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.35rem 0.45rem;
  padding: max(0.6rem, env(safe-area-inset-top, 0px)) 0.7rem 0.45rem;
  flex-shrink: 0;
}

.settings__back {
  width: 2.4rem;
  height: 2.4rem;
  border: 3px solid var(--m3-border-dark);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--m3-go-1) 0%, var(--m3-go-2) 100%);
  color: #6e3911;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    inset 0 -2px 0 rgba(110, 57, 17, 0.3),
    0 3px 0 rgba(110, 57, 17, 0.55);
}

.settings__back:active {
  transform: translateY(2px);
}

.settings__back :deep(svg) {
  width: 1.12rem;
  height: 1.12rem;
}

.settings__title {
  margin: 0;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #fff;
  text-shadow:
    -1px 0 0 #6e3911,
    1px 0 0 #6e3911,
    0 -1px 0 #6e3911,
    0 1px 0 #6e3911,
    0 2px 0 rgba(110, 57, 17, 0.5);
  min-width: 0;
}

.settings__top-spacer {
  width: 2.4rem;
}

/* Кремовая панель (глобальный класс m3-modal-panel) */
.settings__panel {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.85rem 1rem 1rem;
  width: 100%;
  box-sizing: border-box;
}

.settings__panel-title {
  margin: 0 0 0.15rem;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #6e3911;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.65);
}

.settings__panel-title--solo {
  margin-bottom: 0.35rem;
}

.settings__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.45rem 0;
}

.settings__toggle-row:not(:last-of-type) {
  border-bottom: 1px solid rgba(110, 57, 17, 0.18);
}

.settings__toggle-row:last-of-type {
  padding-bottom: 0.35rem;
}

.settings__toggle-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: #4a2810;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}

.settings__switch {
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.settings__switch-track {
  display: block;
  position: relative;
  width: 3rem;
  height: 1.65rem;
  border-radius: 999px;
  background: linear-gradient(180deg, #c4b092 0%, #9a8368 100%);
  border: 3px solid var(--m3-border-dark);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: background 0.2s ease;
}

.settings__switch[aria-checked='true'] .settings__switch-track {
  background: linear-gradient(180deg, #c5e862 0%, #4d8e1a 100%);
}

.settings__switch-knob {
  position: absolute;
  top: 50%;
  left: 0.2rem;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: linear-gradient(180deg, #fffef8 0%, #e8dcc8 100%);
  border: 2px solid var(--m3-border-dark);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  transform: translateY(-50%);
  transition: left 0.2s ease;
}

.settings__switch[aria-checked='true'] .settings__switch-knob {
  left: calc(100% - 1.1rem - 0.2rem);
}

.settings__switch:active .settings__switch-knob {
  filter: brightness(0.97);
}

.settings__sound-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0 0;
  margin-top: 0.15rem;
  border-top: 1px solid rgba(110, 57, 17, 0.2);
}

.settings__range-label {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6e3911;
  opacity: 0.9;
}

.settings__range {
  flex: 1;
  min-width: 0;
  height: 0.5rem;
  border-radius: 999px;
  appearance: none;
  background: rgba(110, 57, 17, 0.25);
  border: 2px solid rgba(74, 40, 16, 0.45);
  outline: none;
}

.settings__range::-webkit-slider-thumb {
  appearance: none;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffd84a 0%, #c88c1c 100%);
  border: 2px solid var(--m3-border-dark);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}

.settings__range::-moz-range-thumb {
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffd84a 0%, #c88c1c 100%);
  border: 2px solid var(--m3-border-dark);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}

.settings__mute {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
}

.settings__mute-icon {
  display: block;
}

.settings__mute-icon :deep(svg) {
  width: 1.3rem;
  height: 1.3rem;
}

.settings__swiper {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 0.75rem 0.7rem 0.6rem;
  box-sizing: border-box;
}

.settings__swiper :deep(.swiper-slide:not(:last-child)) {
  margin-bottom: 0.65rem;
}

.settings__slide {
  height: auto;
  display: flex;
  flex-direction: column;
}

.settings__progress-lead {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #4a2810;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}

.settings__progress-num {
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: #c67612;
}

.settings__progress-track {
  height: 0.55rem;
  border-radius: 999px;
  border: 2px solid rgba(74, 40, 16, 0.4);
  background: rgba(110, 57, 17, 0.12);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
}

.settings__progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffd84a 0%, #5fae3e 60%, #2f8a25 100%);
  transition: width 0.35s ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.settings__link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.72rem 0.85rem;
  border: 3px solid rgba(110, 57, 17, 0.35);
  border-radius: 16px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.65) 0%,
    rgba(230, 215, 185, 0.5) 100%
  );
  color: #4a2810;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    0 2px 0 rgba(110, 57, 17, 0.2);
}

.settings__link-row + .settings__link-row {
  margin-top: 0.45rem;
}

.settings__link-row:active {
  transform: translateY(2px);
}

.settings__link-chevron {
  font-size: 1.35rem;
  color: #c67612;
  font-weight: 900;
}

.settings__bottom-bar {
  flex-shrink: 0;
  padding: 0.55rem 0.7rem max(0.65rem, env(safe-area-inset-bottom, 0px));
  /* Непрозрачный слой — иначе сквозь полупрозрачность видны облака параллакса */
  background: linear-gradient(
    180deg,
    #b9e3fa 0%,
    #6ec4ea 100%
  );
  border-top: 2px solid rgba(110, 57, 17, 0.2);
}

.settings__bottom-back {
  width: 100%;
  max-width: none;
}
</style>
