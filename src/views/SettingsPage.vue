<template>
  <PhoneFrame :parallax="false">
    <div class="settings" data-allow-browser-scroll>
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

      <section
        class="settings__panel m3-modal-panel settings__sound-block"
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
          @wheel.stop
        >
          <span id="settings-master-l" class="settings__range-label">Громкость</span>
          <input
            class="settings__range"
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="volume"
            :aria-valuetext="volumeAriaText"
            @input="onVolumeInput"
            @change="onVolumeInput"
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

      <div class="settings__sections">
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
          <button
            type="button"
            class="settings__danger-btn"
            :disabled="resetInProgress"
            @click="openResetConfirm"
          >
            <Icon icon="mdi:restart-alert" class="settings__danger-btn-ico" />
            Начать игру сначала
          </button>
        </section>

        <section
          class="settings__panel settings__panel--compact-nav m3-modal-panel"
          aria-label="Навигация"
        >
          <h2 class="settings__panel-title settings__panel-title--solo">
            Разделы
          </h2>
          <button type="button" class="settings__link-row" @click="goLevels">
            <span class="settings__link-text">
              <span class="settings__link-label">Уровни</span>
              <span class="settings__link-sub">{{ completedCount }} из {{ totalLevels }}</span>
            </span>
            <span class="settings__link-chevron" aria-hidden="true">
              <Icon icon="mdi:chevron-right" />
            </span>
          </button>
          <button type="button" class="settings__link-row" @click="goHowToPlay">
            <span class="settings__link-text">
              <span class="settings__link-label">Как играть</span>
              <span class="settings__link-sub">Инструкция</span>
            </span>
            <span class="settings__link-chevron" aria-hidden="true">
              <Icon icon="mdi:chevron-right" />
            </span>
          </button>
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
      </div>

      <footer class="settings__bottom-bar">
        <MenuActionButton
          variant="hero"
          class="settings__bottom-back"
          @click="goBack"
        >
          Назад
        </MenuActionButton>
      </footer>

      <div
        v-if="resetConfirmOpen"
        class="m3-modal-overlay settings__reset-scrim"
        role="presentation"
        @click.self="closeResetConfirm"
      >
        <div
          class="m3-modal-panel settings__reset-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-reset-title"
        >
          <h3 id="settings-reset-title" class="settings__reset-title">
            Начать игру сначала?
          </h3>
          <p class="settings__reset-text">
            Будет удалён весь прогресс: уровни, монеты, бустеры и статистика —
            в том числе в облаке Яндекс.Игр. Это действие нельзя отменить.
          </p>
          <div class="m3-modal-actions settings__reset-actions">
            <button
              type="button"
              class="settings__reset-btn settings__reset-btn--cancel"
              :disabled="resetInProgress"
              @click="closeResetConfirm"
            >
              Отмена
            </button>
            <button
              type="button"
              class="settings__reset-btn settings__reset-btn--confirm"
              :disabled="resetInProgress"
              @click="confirmReset"
            >
              {{ resetInProgress ? 'Очищаем…' : 'Начать сначала' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </PhoneFrame>
</template>

<script setup>
defineOptions({ name: 'SettingsPage' })

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PhoneFrame from '@/components/PhoneFrame.vue'
import MenuActionButton from '@/components/MenuActionButton.vue'
import { Icon } from '@iconify/vue'
import {
  useAudioSettingsStore,
  useAudioSettingsStoreRefs,
} from '@/stores/audioSettings'
import { useMatch3ProgressStore } from '@/stores/match3Progress'
import { useMatch3StatsStore } from '@/stores/match3Stats'
import { useMatch3GameStore } from '@/stores/match3Game'
import { useYandexGamesStore } from '@/stores/yandexGames'
import { clearLocalProgressBackup } from '@/state/localProgressBackup'

const router = useRouter()
const audio = useAudioSettingsStore()
const { volume, muted, musicEnabled, sfxEnabled } =
  useAudioSettingsStoreRefs()
const progress = useMatch3ProgressStore()
const stats = useMatch3StatsStore()
const game = useMatch3GameStore()
const yandexGames = useYandexGamesStore()
const { completedCount, totalLevels, progressPercent } = storeToRefs(progress)

const resetConfirmOpen = ref(false)
const resetInProgress = ref(false)

function openResetConfirm() {
  if (resetInProgress.value) return
  resetConfirmOpen.value = true
}
function closeResetConfirm() {
  if (resetInProgress.value) return
  resetConfirmOpen.value = false
}

/**
 * Полный сброс игрока: локальные сторы, локальный бэкап, облако Я.Игр.
 * Звуковые настройки и сам прогресс туториала по обучению (driver.js) не
 * трогаем — это про предпочтения пользователя, а не про игровой прогресс.
 *
 * После очистки делаем `location.reload()` — пере-инициализация запускает
 * bootstrap App.vue заново, который при чистом state снова начислит
 * стартовый бонус +3 каждого бустера (см. `grantInitialFreeBoosters`).
 */
async function confirmReset() {
  if (resetInProgress.value) return
  resetInProgress.value = true
  try {
    /* Локальные сторы. */
    game.quit()
    progress.reset()
    stats.reset()
    /* localStorage-бэкап (он же был бы прочитан раньше облака при reload). */
    clearLocalProgressBackup()
    /* Облако Я.Игр: progress и stats параллельно, но переживаем ошибки
       (например, оффлайн в dev-shim) — главное чтобы локально точно очистилось. */
    const zeroStats = Object.fromEntries(
      Object.keys(stats.getSnapshot()).map((k) => [k, 0]),
    )
    await Promise.allSettled([
      yandexGames.clearProgress(),
      yandexGames.saveStats(zeroStats),
    ])
  } finally {
    /* Reload — самый надёжный путь к чистой инициализации всех сторов,
       audio-focus, watchers и стартового бонуса. */
    if (typeof window !== 'undefined') window.location.reload()
  }
}

const volumeAriaText = computed(() => {
  const pct = Math.round((muted.value ? 0 : volume.value) * 100)
  return `${pct}%`
})

function onVolumeInput(e) {
  const raw = /** @type {HTMLInputElement} */ (e.target).valueAsNumber
  let n = typeof raw === 'number' ? raw : Number.NaN
  if (!Number.isFinite(n))
    n = Number.parseFloat(/** @type {HTMLInputElement} */ (e.target).value)
  if (!Number.isFinite(n)) return
  audio.setVolume(n)
}
function goBack() {
  router.push({ name: 'menu' })
}
function goStatistics() {
  router.push({ name: 'statistics' })
}
function goLevels() {
  router.push({ name: 'levels' })
}
function goHowToPlay() {
  router.push({ name: 'how-to-play' })
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
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  justify-content: space-between;
}

/* Шапка — как на экране уровня */
.settings__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  padding: max(0.6rem, env(safe-area-inset-top, 0px)) 0.7rem 0.45rem;
}

.settings__back {
  flex: 0 0 2.4rem;
  width: 2.4rem;
  height: 2.4rem;
  flex-shrink: 0;
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
  flex: 1;
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
  flex: 0 0 2.4rem;
  width: 2.4rem;
  flex-shrink: 0;
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
  flex: 1;
  min-width: 0;
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
  justify-content: space-between;
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

.settings__sound-block {
  width: calc(100% - 1.4rem);
  margin: 0.6rem clamp(0.55rem, 2vw, 0.85rem) 0.45rem;
  align-self: center;
  box-sizing: border-box;
  flex: 0 0 auto;
}

.settings__sections {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: 100%;
  padding: 0 0.7rem 0.6rem;
  box-sizing: border-box;
  flex: 0 0 auto;
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
  touch-action: pan-x;
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

.settings__panel--compact-nav {
  gap: 0.28rem;
  padding: 0.62rem 0.85rem 0.68rem;
}

.settings__panel--compact-nav .settings__panel-title--solo {
  margin-bottom: 0.16rem;
}

.settings__link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.42rem 0.65rem;
  border: 2px solid rgba(110, 57, 17, 0.35);
  border-radius: 12px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.65) 0%,
    rgba(230, 215, 185, 0.5) 100%
  );
  color: #4a2810;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 1px 0 rgba(110, 57, 17, 0.2);
}

.settings__link-row + .settings__link-row {
  margin-top: 0.2rem;
}

.settings__link-row:active {
  transform: translateY(2px);
}

.settings__link-chevron {
  font-size: 1.12rem;
  color: #c67612;
  font-weight: 900;
}

.settings__link-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.04rem;
  text-align: left;
}

.settings__link-sub {
  font-size: 0.66rem;
  font-weight: 650;
  opacity: 0.88;
}

.settings__bottom-bar {
  flex: 0 0 auto;
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

/* Деструктивная кнопка «Начать игру сначала» в панели «Прогресс» */
.settings__danger-btn {
  margin-top: 0.5rem;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.55rem 0.8rem;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #fff;
  text-shadow: 0 1px 0 rgba(120, 18, 18, 0.6);
  background: linear-gradient(180deg, #e96a6a 0%, #b83838 100%);
  border: 3px solid #7a1818;
  border-radius: 12px;
  cursor: pointer;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.4),
    inset 0 -2px 0 rgba(120, 18, 18, 0.45),
    0 3px 0 rgba(120, 18, 18, 0.55);
}
.settings__danger-btn:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.3),
    inset 0 -2px 0 rgba(120, 18, 18, 0.45),
    0 1px 0 rgba(120, 18, 18, 0.55);
}
.settings__danger-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.settings__danger-btn-ico :deep(svg),
.settings__danger-btn-ico {
  width: 1.05rem;
  height: 1.05rem;
}

/* Модалка подтверждения сброса */
.settings__reset-scrim {
  position: absolute;
  inset: 0;
  z-index: 50;
}
.settings__reset-dialog {
  width: min(20rem, calc(100% - 1.4rem));
  padding: 1rem 1rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  align-items: stretch;
  text-align: center;
}
.settings__reset-title {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 900;
  color: #6e1818;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}
.settings__reset-text {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.35;
  color: #4a2810;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}
.settings__reset-actions {
  display: flex;
  gap: 0.55rem;
  margin-top: 0.25rem;
}
.settings__reset-btn {
  flex: 1;
  padding: 0.55rem 0.6rem;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 800;
  border-radius: 12px;
  cursor: pointer;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.4),
    0 3px 0 rgba(0, 0, 0, 0.18);
}
.settings__reset-btn:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.3),
    0 1px 0 rgba(0, 0, 0, 0.18);
}
.settings__reset-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.settings__reset-btn--cancel {
  color: #4a2810;
  background: linear-gradient(180deg, #f3e1bf 0%, #d6b885 100%);
  border: 3px solid #7a4a1a;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}
.settings__reset-btn--confirm {
  color: #fff;
  background: linear-gradient(180deg, #e96a6a 0%, #b83838 100%);
  border: 3px solid #7a1818;
}
</style>
