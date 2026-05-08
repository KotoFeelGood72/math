<template>
  <div ref="appRootEl" class="app-root">
    <div
      v-if="!bootReady"
      class="app-boot"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      Загрузка…
    </div>
    <template v-else>
      <div class="app-root__view">
        <router-view :key="route.fullPath" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useYandexGamesStore } from '@/stores/yandexGames'
import { useGameFlowStore } from '@/stores/gameFlow'
import { useMatch3ProgressStore } from '@/stores/match3Progress'
import { useMatch3StatsStore } from '@/stores/match3Stats'
import { useMatch3GameStore } from '@/stores/match3Game'
import { useAudioSettingsStore } from '@/stores/audioSettings'
import {
  initBackgroundMusic,
  pauseBackgroundMusic,
  playBackgroundMusic,
  resumeBackgroundMusicFromUserGesture,
  setBackgroundMusicVolume,
} from '@/audio/backgroundMusic.js'
import bgmUrl from '@/assets/music.mp3'

const appRootEl = ref(null)
const bootReady = ref(false)
let progressSaveTimer = 0
const SAVE_DEBOUNCE_MS = 3500

const route = useRoute()
const yandexGames = useYandexGamesStore()
const flow = useGameFlowStore()
const progress = useMatch3ProgressStore()
const stats = useMatch3StatsStore()
const game = useMatch3GameStore()
const audioSettings = useAudioSettingsStore()

const { lastSavedSnapshotKey } = storeToRefs(flow)

watch(
  () => 'Match-3',
  (t) => {
    document.title = t
  },
  { immediate: true },
)

function blockNativeSelectionAndContextMenu(e) {
  e.preventDefault()
}

function isNodeVerticallyScrollable(node) {
  if (!(node instanceof Element)) return false
  for (
    let el = node;
    el && el !== document.documentElement;
    el = el.parentElement
  ) {
    const { overflowY } = window.getComputedStyle(el)
    if (
      (overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'overlay') &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      return true
    }
  }
  return false
}

function blockViewportTouchScroll(e) {
  if (!(e instanceof TouchEvent) || e.touches.length !== 1) return
  const { target } = e
  if (!(target instanceof Element)) return
  if (
    target.closest(
      'input[type="range"], textarea, select, [data-allow-browser-scroll], .swiper',
    )
  ) {
    return
  }
  if (isNodeVerticallyScrollable(target)) return
  e.preventDefault()
}

let detachAppRootUiGuards = () => {}
let detachViewportTouchGuards = () => {}
let detachBgmVisibility = () => {}
let detachBgmUnlock = () => {}

function tryPlayBgmAfterUnlock() {
  if (audioSettings.effectiveMusicVolume <= 0) return
  resumeBackgroundMusicFromUserGesture()
}

function attachBgmUnlockOnFirstGesture() {
  detachBgmUnlock()
  const once = () => {
    tryPlayBgmAfterUnlock()
    detachBgmUnlock()
  }
  detachBgmUnlock = () => {
    document.removeEventListener('pointerdown', once)
    document.removeEventListener('click', once)
    document.removeEventListener('keydown', once)
    detachBgmUnlock = () => {}
  }
  document.addEventListener('pointerdown', once, { passive: true })
  document.addEventListener('click', once, { passive: true })
  document.addEventListener('keydown', once)
}

function onBgmVisibility() {
  if (document.visibilityState === 'hidden') {
    pauseBackgroundMusic()
    return
  }
  if (audioSettings.effectiveMusicVolume <= 0) return
  void playBackgroundMusic().catch(() => attachBgmUnlockOnFirstGesture())
}

async function startBackgroundMusicIfNeeded() {
  initBackgroundMusic(bgmUrl)
  setBackgroundMusicVolume(audioSettings.effectiveMusicVolume)
  if (audioSettings.effectiveMusicVolume <= 0) return
  try {
    await playBackgroundMusic()
  } catch {
    attachBgmUnlockOnFirstGesture()
  }
}

function getSnapshotKey(snapshot) {
  try {
    return JSON.stringify(snapshot)
  } catch {
    return ''
  }
}

function buildCloudSnapshot() {
  return {
    progress: progress.getSnapshot(),
    stats: stats.getSnapshot(),
  }
}

function applyCloudSnapshot(snap) {
  if (!snap || typeof snap !== 'object') return
  if (snap.progress) progress.restoreSnapshot(snap.progress)
  if (snap.stats) stats.restoreSnapshot(snap.stats)
}

/* Фон сразу при запуске приложения, не после SDK и не с экрана уровня. */
void startBackgroundMusicIfNeeded()

void (async () => {
  try {
    await yandexGames.initSdk()
    const saved = await yandexGames.loadProgress()
    if (saved) {
      applyCloudSnapshot(saved)
      const snap = buildCloudSnapshot()
      const k = getSnapshotKey(snap)
      if (k) lastSavedSnapshotKey.value = k
    }
    await nextTick()
    yandexGames.applyPlayerLocaleFromYsdk()
    await yandexGames.notifyLoadingReady()
  } catch (e) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[Match3][App] bootstrap', e)
    }
  } finally {
    bootReady.value = true
  }
})()

onMounted(() => {
  void startBackgroundMusicIfNeeded()
  const root = appRootEl.value
  if (root) {
    root.addEventListener('contextmenu', blockNativeSelectionAndContextMenu)
    root.addEventListener('selectstart', blockNativeSelectionAndContextMenu)
    root.addEventListener('dragstart', blockNativeSelectionAndContextMenu)
    detachAppRootUiGuards = () => {
      root.removeEventListener('contextmenu', blockNativeSelectionAndContextMenu)
      root.removeEventListener('selectstart', blockNativeSelectionAndContextMenu)
      root.removeEventListener('dragstart', blockNativeSelectionAndContextMenu)
    }
  }

  document.addEventListener('touchmove', blockViewportTouchScroll, {
    passive: false,
  })
  detachViewportTouchGuards = () => {
    document.removeEventListener('touchmove', blockViewportTouchScroll, {
      passive: false,
    })
  }

  window.addEventListener('pagehide', flushOnLifecycle)
  document.addEventListener('visibilitychange', onPageLifecycleSave)
  document.addEventListener('visibilitychange', onBgmVisibility)
  detachBgmVisibility = () => {
    document.removeEventListener('visibilitychange', onBgmVisibility)
    detachBgmVisibility = () => {}
  }
})

onBeforeUnmount(() => {
  detachAppRootUiGuards()
  detachViewportTouchGuards()
  void flushProgressToCloud(true)
  window.removeEventListener('pagehide', flushOnLifecycle)
  document.removeEventListener('visibilitychange', onPageLifecycleSave)
  detachBgmVisibility()
  detachBgmUnlock()
  pauseBackgroundMusic()
  if (progressSaveTimer) clearTimeout(progressSaveTimer)
})

async function flushProgressToCloud() {
  if (progressSaveTimer) {
    clearTimeout(progressSaveTimer)
    progressSaveTimer = 0
  }
  try {
    const snapshot = buildCloudSnapshot()
    const snapshotKey = getSnapshotKey(snapshot)
    if (snapshotKey && snapshotKey === lastSavedSnapshotKey.value) return
    const saved = await yandexGames.saveProgress(snapshot)
    if (saved && snapshotKey) lastSavedSnapshotKey.value = snapshotKey
  } catch (e) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[Match3] cloud save skipped', e)
    }
  }
}

function flushOnLifecycle() {
  void flushProgressToCloud()
}

function scheduleProgressSave() {
  if (progressSaveTimer) clearTimeout(progressSaveTimer)
  progressSaveTimer = window.setTimeout(() => {
    void flushProgressToCloud()
  }, SAVE_DEBOUNCE_MS)
}

watch(
  [
    () => progress.completedCount,
    () => progress.totalStars,
    () => stats.totalMoves,
    () => stats.totalScore,
  ],
  () => scheduleProgressSave(),
)

watch(
  () => audioSettings.effectiveMusicVolume,
  (v) => {
    setBackgroundMusicVolume(v)
    if (v <= 0) {
      pauseBackgroundMusic()
      return
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void playBackgroundMusic().catch(() => attachBgmUnlockOnFirstGesture())
    }
  },
)

const inGameFlow = computed(
  () => route.name === 'play' && game.status === 'playing',
)

function onPageLifecycleSave() {
  if (document.visibilityState === 'hidden') {
    yandexGames.notifyGameplayStop()
    void flushProgressToCloud()
    return
  }
  if (inGameFlow.value) {
    yandexGames.notifyGameplayStart()
  }
}
</script>

<style>
#app,
#app *,
#app *::before,
#app *::after {
  box-sizing: border-box;
}

html {
  height: 100%;
  height: -webkit-fill-available;
  overflow: hidden;
  overflow-x: hidden;
  overscroll-behavior: none;
  overscroll-behavior-y: none;
  touch-action: none;
}

body {
  margin: 0;
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  overflow-x: hidden;
  overscroll-behavior: none;
  overscroll-behavior-y: none;
  touch-action: none;
}

#app {
  height: 100%;
  max-height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
  overscroll-behavior-y: none;
  font-family: 'Segoe UI', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: none;
  box-sizing: border-box;
}

.app-root {
  /* === Cartoon GUI palette (sky / wood / ribbon) === */
  --m3-bg-deep: #4ea6e0;
  --m3-bg-mid: #88cdf0;
  --m3-bg-top: #b9e3fa;

  --m3-wood-1: #fbe5a8;
  --m3-wood-2: #e8b864;
  --m3-wood-3: #c98432;
  --m3-wood-border: #6e3911;

  --m3-ribbon-1: #b6e15a;
  --m3-ribbon-2: #7cc232;
  --m3-ribbon-3: #4d8e1a;
  --m3-ribbon-border: #2d5b0e;

  --m3-panel: #fbe5a8;
  --m3-panel-hi: #fff3cf;
  --m3-panel-dark-1: #c98432;
  --m3-panel-dark-2: #8a4f15;

  --m3-card-orange-1: #ffd84a;
  --m3-card-orange-2: #ffa122;
  --m3-card-purple-1: #b562d4;
  --m3-card-purple-2: #6e2890;
  --m3-card-red-1: #ff7a6e;
  --m3-card-red-2: #d12c22;
  --m3-card-green-1: #b6e15a;
  --m3-card-green-2: #4d8e1a;

  --m3-go-1: #ffe27a;
  --m3-go-2: #ff9d1f;

  --m3-border-dark: #6e3911;
  --m3-border-line: rgba(110, 57, 17, 0.55);
  --m3-border-hi: rgba(255, 250, 220, 0.7);

  --m3-text: #4a2810;
  --m3-text-on-wood: #5a2e10;
  --m3-text-soft: #7a4a22;
  --m3-text-muted: #a07248;
  --m3-text-light: #ffffff;
  --m3-accent: #ffa122;
  --m3-star: #ffcd2c;
  --m3-coin: #ffd84a;
  --m3-danger: #d12c22;
  --m3-success: #4d8e1a;

  height: 100%;
  max-height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overscroll-behavior: none;
  overscroll-behavior-y: none;
  background:
    radial-gradient(
      ellipse 80% 60% at 50% 100%,
      rgba(255, 255, 255, 0.35) 0%,
      transparent 70%
    ),
    linear-gradient(
      180deg,
      var(--m3-bg-top) 0%,
      var(--m3-bg-mid) 55%,
      var(--m3-bg-deep) 100%
    );
  color: var(--m3-text);
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: none;
}

/* ====== Глобальные «карточные» утилиты под казуальный стиль ====== */
.m3-card {
  position: relative;
  background: linear-gradient(
    180deg,
    var(--m3-card-orange-1) 0%,
    var(--m3-card-orange-2) 100%
  );
  border: 3px solid var(--m3-border-dark);
  border-radius: 16px;
  color: #fff;
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.55),
    inset 0 -5px 0 rgba(0, 0, 0, 0.22),
    0 4px 0 rgba(110, 57, 17, 0.55),
    0 8px 16px rgba(60, 30, 10, 0.35);
  text-shadow: 0 2px 0 rgba(110, 57, 17, 0.55);
}
.m3-card--purple {
  background: linear-gradient(
    180deg,
    var(--m3-card-purple-1) 0%,
    var(--m3-card-purple-2) 100%
  );
}
.m3-card--red {
  background: linear-gradient(
    180deg,
    var(--m3-card-red-1) 0%,
    var(--m3-card-red-2) 100%
  );
}
.m3-card--dark {
  background: linear-gradient(
    180deg,
    #c9c2b6 0%,
    #8c8479 100%
  );
  color: #4a2810;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}
.m3-card--green {
  background: linear-gradient(
    180deg,
    var(--m3-card-green-1) 0%,
    var(--m3-card-green-2) 100%
  );
}

/* ====== Деревянная панель (бежевая, с тёмно-коричневой обводкой) ====== */
.m3-wood-panel {
  position: relative;
  background: linear-gradient(
    180deg,
    var(--m3-wood-1) 0%,
    var(--m3-wood-2) 70%,
    var(--m3-wood-3) 100%
  );
  border: 4px solid var(--m3-wood-border);
  border-radius: 22px;
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.55),
    inset 0 -5px 0 rgba(110, 57, 17, 0.35),
    0 5px 0 rgba(110, 57, 17, 0.55),
    0 12px 26px rgba(60, 30, 10, 0.4);
}

/* Модальные панели (пауза, итог уровня): светлый крем, тёмная обводка */
.m3-modal-panel {
  position: relative;
  background: linear-gradient(
    180deg,
    #fff8ea 0%,
    #f2e6c8 42%,
    #ddc49a 100%
  );
  border: 5px solid var(--m3-border-dark);
  border-radius: 26px;
  box-shadow:
    inset 0 4px 0 rgba(255, 255, 255, 0.7),
    inset 0 -6px 0 rgba(110, 57, 17, 0.18),
    0 6px 0 rgba(110, 57, 17, 0.52),
    0 16px 34px rgba(40, 20, 8, 0.48);
}

.m3-modal-overlay {
  position: absolute;
  inset: 0;
  z-index: 220;
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    max(0.85rem, env(safe-area-inset-top))
    max(0.85rem, env(safe-area-inset-right))
    max(0.85rem, env(safe-area-inset-bottom))
    max(0.85rem, env(safe-area-inset-left));
  box-sizing: border-box;
  background: rgba(30, 55, 90, 0.38);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

/* Круглые действия под модальные окна (меню / рестарт / далее) */
.m3-round-icon-btn {
  width: 2.95rem;
  height: 2.95rem;
  border-radius: 50%;
  border: 3px solid var(--m3-border-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.28rem;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 2px 0 rgba(110, 57, 17, 0.55);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    inset 0 -2px 0 rgba(110, 57, 17, 0.3),
    0 3px 0 rgba(110, 57, 17, 0.55);
  background: linear-gradient(180deg, var(--m3-go-1) 0%, var(--m3-go-2) 100%);
}

.m3-round-icon-btn:active {
  transform: translateY(2px);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.4),
    0 1px 0 rgba(110, 57, 17, 0.5);
}

.m3-round-icon-btn svg {
  width: 1.35rem;
  height: 1.35rem;
  flex-shrink: 0;
}

.m3-round-icon-btn--green {
  background: linear-gradient(180deg, #c5e862 0%, #4d8e1a 100%);
  text-shadow: 0 2px 0 rgba(45, 91, 14, 0.55);
}

.m3-modal-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.85rem;
  padding-top: 0.25rem;
}

/* ====== Зелёная лента-баннер заголовок ====== */
.m3-ribbon {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.06em;
  margin: 0 auto;
  padding: 0.5rem 1.4rem;
  text-align: center;
  line-height: 1.15;
  background: linear-gradient(
    180deg,
    var(--m3-ribbon-1) 0%,
    var(--m3-ribbon-2) 100%
  );
  border: 3px solid var(--m3-ribbon-border);
  border-radius: 12px;
  color: #fff;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow:
    0 2px 0 var(--m3-ribbon-border),
    0 0 6px rgba(255, 255, 255, 0.35);
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.45),
    inset 0 -4px 0 rgba(0, 0, 0, 0.18),
    0 4px 0 rgba(45, 91, 14, 0.6),
    0 8px 14px rgba(0, 0, 0, 0.3);
}
.m3-ribbon::before,
.m3-ribbon::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 22px;
  height: 28px;
  transform: translateY(-50%);
  background: linear-gradient(
    180deg,
    var(--m3-ribbon-2) 0%,
    var(--m3-ribbon-3) 100%
  );
  border: 3px solid var(--m3-ribbon-border);
  z-index: -1;
}
.m3-ribbon::before {
  left: -16px;
  border-radius: 12px 0 0 12px;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 40% 50%);
}
.m3-ribbon::after {
  right: -16px;
  border-radius: 0 12px 12px 0;
  clip-path: polygon(0 0, 100% 0, 60% 50%, 100% 100%, 0 100%);
}

.m3-ribbon__line {
  display: block;
  max-width: 100%;
}

/* «GO!»-кнопка / pill */
.m3-go-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 1.2rem;
  border: 3px solid var(--m3-border-dark);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--m3-go-1) 0%, var(--m3-go-2) 100%);
  color: #fff;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow: 0 2px 0 rgba(110, 57, 17, 0.65);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.65),
    inset 0 -3px 0 rgba(110, 57, 17, 0.4),
    0 3px 0 rgba(110, 57, 17, 0.55);
  cursor: pointer;
  transition: transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}
.m3-go-btn:active {
  transform: translateY(2px);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.45),
    inset 0 -2px 0 rgba(110, 57, 17, 0.35),
    0 1px 0 rgba(110, 57, 17, 0.5);
}
.m3-go-btn:disabled {
  filter: grayscale(0.5) brightness(0.85);
  cursor: not-allowed;
}

/* Заголовок-плашка над секцией */
.m3-section-head {
  position: relative;
  margin: 0;
  padding: 0.35rem 0;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--m3-text-soft);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}
.m3-section-head::before,
.m3-section-head::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 22%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(110, 57, 17, 0.45) 100%
  );
}
.m3-section-head::before { left: 4%; }
.m3-section-head::after {
  right: 4%;
  background: linear-gradient(
    90deg,
    rgba(110, 57, 17, 0.45) 0%,
    transparent 100%
  );
}

/* Маленький бейдж-уведомление (красный кружок с числом) */
.m3-notif-dot {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  border: 2px solid var(--m3-border-dark);
  background: #e63a3a;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(60, 30, 10, 0.4);
}

/* Топ-pill: "icon | число" в обводке (бежевая деревянная плашка) */
.m3-top-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.72rem 0.38rem 0.34rem;
  min-height: 2.35rem;
  border: 3px solid var(--m3-border-dark);
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    var(--m3-wood-1) 0%,
    var(--m3-wood-2) 100%
  );
  color: var(--m3-text-on-wood);
  font-weight: 900;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    inset 0 -2px 0 rgba(110, 57, 17, 0.3),
    0 2px 0 rgba(110, 57, 17, 0.5);
}
.m3-top-pill__icon {
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffe27a 0%, #f0a01a 100%);
  border: 2px solid var(--m3-border-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  color: #6e3911;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
  box-shadow:
    inset 0 1.5px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1.5px 0 rgba(110, 57, 17, 0.3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.m3-top-pill__icon svg {
  width: 1rem;
  height: 1rem;
  display: block;
}
.m3-top-pill__icon--coin {
  background: linear-gradient(180deg, #ffe27a 0%, #f0a01a 100%);
}
.m3-top-pill__icon--energy {
  background: linear-gradient(180deg, #ffe88a 0%, #ffae22 100%);
  color: #6e3911;
}
.m3-top-pill__icon--star {
  background: linear-gradient(180deg, #ffe27a 0%, #f0a01a 100%);
}

/* ====== Кастомный скроллбар: применяется ко всем `data-allow-browser-scroll` ====== */
[data-allow-browser-scroll] {
  /* Глобально html/body/.app-root заблокировали жесты (touch-action: none),
     иначе нет pull-to-refresh; здесь явно разрешаем вертикальный пан, иначе
     контейнер не скроллится пальцем. */
  touch-action: pan-y;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: var(--m3-go-2, #e6762a) rgba(0, 0, 0, 0.28);
}

[data-allow-browser-scroll]::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

[data-allow-browser-scroll]::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.32);
  border-radius: 999px;
  margin: 6px 0;
  box-shadow: inset 0 0 0 1px rgba(40, 8, 14, 0.5);
}

[data-allow-browser-scroll]::-webkit-scrollbar-thumb {
  /* background-clip + прозрачный border = визуальный «inset» бегунок без перекрытия дорожки */
  background-color: var(--m3-go-2, #e6762a);
  background-image: linear-gradient(
    180deg,
    var(--m3-go-1, #ffba51) 0%,
    var(--m3-go-2, #e6762a) 100%
  );
  background-clip: padding-box;
  border: 2px solid transparent;
  border-radius: 999px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    inset 0 -2px 0 rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(40, 8, 14, 0.7);
}

[data-allow-browser-scroll]::-webkit-scrollbar-thumb:hover {
  filter: brightness(1.08);
}

[data-allow-browser-scroll]::-webkit-scrollbar-thumb:active {
  background-image: linear-gradient(
    180deg,
    #ffd984 0%,
    #d6651a 100%
  );
}

[data-allow-browser-scroll]::-webkit-scrollbar-corner {
  background: transparent;
}

/*
  Swiper не использует overflow:auto — без этого предок #app с touch-action:none
  может блокировать жест; не пересекается с полем match-3 (там свои pointer/touch сценарии).
*/
.swiper.swiper-vertical,
.swiper-vertical {
  touch-action: pan-y;
}
.swiper.swiper-horizontal,
.swiper-horizontal {
  touch-action: pan-x;
}

.app-root input,
.app-root textarea {
  -webkit-user-select: auto;
  user-select: auto;
  touch-action: auto;
}

.app-root input[type='range'] {
  touch-action: pan-x;
}

.app-root img {
  -webkit-user-drag: none;
  user-select: none;
  -webkit-touch-callout: none;
}

.app-boot {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  opacity: 0.85;
}

.app-root__view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .app-root {
    height: 100dvh;
    max-height: 100dvh;
    min-height: 100dvh;
    box-sizing: border-box;
  }
}
</style>
