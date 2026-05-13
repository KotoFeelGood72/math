<template>
  <div ref="appRootEl" class="app-root">
    <div class="app-root__view">
      <router-view :key="route.fullPath" />
    </div>
    <Transition name="app-boot-fade">
      <div
        v-if="showBootProgressUi"
        class="app-boot"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="app-boot__blocker" aria-hidden="true" />
        <div class="app-boot__art-wrap" aria-hidden="true">
          <picture class="app-boot__picture">
            <source
              media="(max-width: 768px)"
              :srcset="bootLoaderMobileUrl"
            />
            <img
              class="app-boot__art"
              :src="bootLoaderPcUrl"
              alt=""
              decoding="async"
              fetchpriority="high"
            />
          </picture>
        </div>
        <div class="app-boot__foreground">
          <div class="app-boot__logo-wrap">
            <img
              class="app-boot__logo"
              :src="bootLogoUrl"
              alt="Dessert Land"
              decoding="async"
              draggable="false"
            />
          </div>
          <div class="app-boot__bottom">
            <div class="app-boot__bar-wrap">
              <div class="app-boot__bar-track">
                <div
                  class="app-boot__bar-fill"
                  :style="{ width: `${bootProgress}%` }"
                />
                <span class="app-boot__bar-label">{{ bootProgress }}%</span>
              </div>
            </div>
            <p class="app-boot__tip">{{ currentBootTip }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'
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
  setBackgroundMusicVolume,
} from '@/audio/backgroundMusic.js'
import {
  notifyMusicVolumeChanged,
  startAudioFocus,
  stopAudioFocus,
} from '@/audio/audioFocus.js'
import bgmUrl from '@/assets/music.mp3'
import {
  readLocalProgressBackup,
  writeLocalProgressBackup as writeLocalProgressBackupRaw,
} from '@/state/localProgressBackup'

const bootLoaderPcUrl = `${import.meta.env.BASE_URL}pc-loader.png`
const bootLoaderMobileUrl = `${import.meta.env.BASE_URL}mobile-loader.png`
const bootLogoUrl = `${import.meta.env.BASE_URL}logo.png`

const LOADING_TIPS = [
  'Совет: собирай больше комбинаций для супер бонусов!',
  'Совет: сначала разрушай препятствия — так будет проще составить цепочку.',
  'Совет: обращай внимание на цели уровня и ходы.',
  'Совет: иногда выгоднее не самый длинный матч, а нужный цвет.',
  'Совет: используй бустеры в трудный момент — не копи их зря.',
]

/** Минимум времени показа экрана загрузки (мс); за это время полоса идёт от 0% до 100%. */
const BOOT_SCREEN_MIN_MS = 2000

const appRootEl = ref(null)
const bootReady = ref(false)
/** Инициализация SDK и данных завершена (можно уходить с экрана после min time). */
const bootBootstrapDone = ref(false)
const bootProgress = ref(0)
const bootTipIndex = ref(
  Math.floor(Math.random() * Math.max(LOADING_TIPS.length, 1)),
)

const currentBootTip = computed(
  () => LOADING_TIPS[bootTipIndex.value % LOADING_TIPS.length],
)

let bootProgressRaf = 0
let bootTipTimer = 0
const bootProgressStartedAt = typeof performance !== 'undefined'
  ? performance.now()
  : 0

function tickBootProgress() {
  if (bootReady.value) return
  const elapsed = performance.now() - bootProgressStartedAt
  const pct = Math.min(100, (elapsed / BOOT_SCREEN_MIN_MS) * 100)
  bootProgress.value = Math.round(pct)

  const minTimeOk = elapsed >= BOOT_SCREEN_MIN_MS
  if (bootBootstrapDone.value && minTimeOk) {
    bootProgress.value = 100
    stopBootTipRotation()
    stopBootProgressLoop()
    bootReady.value = true
    return
  }

  bootProgressRaf = requestAnimationFrame(tickBootProgress)
}

function startBootTipRotation() {
  stopBootTipRotation()
  bootTipTimer = window.setInterval(() => {
    bootTipIndex.value = (bootTipIndex.value + 1) % LOADING_TIPS.length
  }, 4500)
}

function stopBootTipRotation() {
  if (bootTipTimer) {
    clearInterval(bootTipTimer)
    bootTipTimer = 0
  }
}

function stopBootProgressLoop() {
  if (bootProgressRaf) {
    cancelAnimationFrame(bootProgressRaf)
    bootProgressRaf = 0
  }
}

bootProgressRaf = requestAnimationFrame(tickBootProgress)
startBootTipRotation()
let progressSaveTimer = 0
let statsSaveTimer = 0
/** Дебаунс перед player.setData (лимит SDK: 100 / 5 мин). */
const SAVE_DEBOUNCE_MS = 1200
/** Дебаунс перед player.setStats (отдельные лимиты, но без агрессии). */
const STATS_SAVE_DEBOUNCE_MS = 1500

const route = useRoute()
/**
 * Прелоадер виден весь холодный старт: SDK Я.Игр, загрузка облачных данных
 * и минимальное время показа (BOOT_SCREEN_MIN_MS). Без привязки к маршруту,
 * иначе при deeplink на `/play/N` или до разрешения начального маршрута
 * пользователь увидит «голый» экран с пустыми данными.
 */
const showBootProgressUi = computed(() => !bootReady.value)
const yandexGames = useYandexGamesStore()
const flow = useGameFlowStore()
const progress = useMatch3ProgressStore()
const stats = useMatch3StatsStore()
const game = useMatch3GameStore()
const audioSettings = useAudioSettingsStore()

const { lastSavedSnapshotKey, lastSavedStatsKey } = storeToRefs(flow)

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

/** Последняя clientY по активному касанию — для блока «pull» на границах скролла. */
let lastTouchClientY = 0

function syncLastTouchClientYFromEvent(e) {
  if (e instanceof TouchEvent && e.touches.length === 1) {
    lastTouchClientY = e.touches[0].clientY
  }
}

/**
 * Элемент с вертикальным скроллом внутри `[data-allow-browser-scroll]`
 * (иначе жест у верхней границы уходит в pull-to-refresh браузера).
 */
function findVerticalScrollPortInDataAllowZone(target) {
  if (!(target instanceof Element)) return null
  const scope = target.closest('[data-allow-browser-scroll]')
  if (!scope) return null
  for (
    let el = target;
    el && scope.contains(el);
    el = el.parentElement
  ) {
    if (!(el instanceof Element)) continue
    const { overflowY } = window.getComputedStyle(el)
    if (
      overflowY === 'auto' ||
      overflowY === 'scroll' ||
      overflowY === 'overlay'
    ) {
      return el
    }
  }
  return scope
}

function blockViewportTouchScroll(e) {
  if (!(e instanceof TouchEvent) || e.touches.length !== 1) return
  const { target } = e
  if (!(target instanceof Element)) return

  const clientY = e.touches[0].clientY
  const dy = clientY - lastTouchClientY
  lastTouchClientY = clientY

  if (target.closest('input[type="range"], textarea, select')) {
    return
  }

  if (target.closest('[data-allow-browser-scroll]')) {
    const scrollEl = findVerticalScrollPortInDataAllowZone(target)
    if (!scrollEl) return
    const canScrollY = scrollEl.scrollHeight > scrollEl.clientHeight + 1
    if (!canScrollY) {
      e.preventDefault()
      return
    }
    if (scrollEl.scrollTop <= 0 && dy > 0) {
      e.preventDefault()
      return
    }
    if (
      scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1 &&
      dy < 0
    ) {
      e.preventDefault()
      return
    }
    return
  }

  if (target.closest('.swiper')) {
    return
  }
  if (isNodeVerticallyScrollable(target)) return
  e.preventDefault()
}

let detachAppRootUiGuards = () => {}
let detachViewportTouchGuards = () => {}

function startBackgroundMusicIfNeeded() {
  initBackgroundMusic(bgmUrl)
  setBackgroundMusicVolume(audioSettings.effectiveMusicVolume)
  startAudioFocus({
    getMusicVolume: () => audioSettings.effectiveMusicVolume,
  })
}

function getSnapshotKey(snapshot) {
  try {
    return JSON.stringify(snapshot)
  } catch {
    return ''
  }
}

/**
 * В blob через `setData` пишем только основной игровой прогресс.
 * Числовые счётчики (`stats`) идут отдельным потоком через `setStats`
 * (см. `flushStatsToCloud`) — это разделение «data / stats» из доки Я.Игр.
 *
 * `savedAt` добавляется ИМЕННО при отправке (см. flushProgressToCloud), а не
 * сюда, чтобы фингерпринт не менялся каждый тик и не триггерил лишних save.
 */
function buildCloudSnapshot() {
  return { progress: progress.getSnapshot() }
}

function buildStatsSnapshot() {
  return stats.getSnapshot()
}

/**
 * Локальная обёртка над общим модулем — нужна, чтобы не дублировать в каждом
 * месте формирование снимка из сторов. Сам ключ и формат — в
 * `state/localProgressBackup.js` (там же расширенное описание).
 */
function writeLocalProgressBackup() {
  writeLocalProgressBackupRaw({
    progress: progress.getSnapshot(),
    stats: stats.getSnapshot(),
  })
}

/**
 * Применяет сохранение к сторам.
 * `progress` берётся из blob; `stats` — из отдельного источника, если он есть,
 * иначе fallback к `stats` внутри blob (миграция старых сейвов).
 */
function applyCloudSnapshot({ blob, statsFromCloud }) {
  if (blob && typeof blob === 'object' && blob.progress) {
    progress.restoreSnapshot(blob.progress)
  }
  if (statsFromCloud && typeof statsFromCloud === 'object'
      && Object.keys(statsFromCloud).length > 0) {
    stats.restoreSnapshot(statsFromCloud)
  } else if (blob && blob.stats) {
    stats.restoreSnapshot(blob.stats)
  }
}

/**
 * Музыку стартуем только после того, как Yandex SDK инициализирован и
 * игрок попал на главное меню (см. watch ниже): до этого момента видно
 * превью-сплеш SDK / наш прелоадер, и звук мешает / блокируется autoplay.
 */

/**
 * Из двух источников (облако и локальный backup) берём более свежий по `savedAt`.
 * Backup пишется синхронно при каждом изменении state, облако — асинхронно
 * через debounce: если игрок успел купить бустер и закрыть страницу до того,
 * как `setData` дошёл до сервера, локальная копия будет новее облачной.
 */
function pickFreshestSavedSource(blob, backup) {
  const cloudAt = Number(blob?.savedAt) || 0
  const localAt = Number(backup?.savedAt) || 0
  if (backup && localAt > cloudAt) return { source: backup, fromBackup: true }
  if (blob) return { source: blob, fromBackup: false }
  if (backup) return { source: backup, fromBackup: true }
  return { source: null, fromBackup: false }
}

void (async () => {
  try {
    await yandexGames.initSdk()
    await yandexGames.ensurePlayer()
    const [blob, statsFromCloud] = await Promise.all([
      yandexGames.loadProgress(),
      yandexGames.loadStats(),
    ])
    const backup = readLocalProgressBackup()
    const { source, fromBackup } = pickFreshestSavedSource(blob, backup)
    if (source) {
      applyCloudSnapshot({
        blob: source,
        /* Если локальный backup свежее облака — числовые stats берём из него,
           иначе предпочитаем отдельный getStats (он первичный для stats). */
        statsFromCloud: fromBackup ? source.stats : statsFromCloud,
      })
    }
    const snapKey = getSnapshotKey(buildCloudSnapshot())
    if (snapKey) lastSavedSnapshotKey.value = snapKey
    const statsKey = getSnapshotKey(buildStatsSnapshot())
    if (statsKey) lastSavedStatsKey.value = statsKey
    await nextTick()
    yandexGames.applyPlayerLocaleFromYsdk()
    await yandexGames.notifyLoadingReady()
  } catch (e) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[Match3][App] bootstrap', e)
    }
    try {
      const backup = readLocalProgressBackup()
      if (backup) {
        applyCloudSnapshot({ blob: backup, statsFromCloud: backup.stats })
        const snapKey = getSnapshotKey(buildCloudSnapshot())
        if (snapKey) lastSavedSnapshotKey.value = snapKey
        const statsKey = getSnapshotKey(buildStatsSnapshot())
        if (statsKey) lastSavedStatsKey.value = statsKey
      }
    } catch {
      /* ignore */
    }
  } finally {
    /* Однократный стартовый бонус начисляем в `finally`, чтобы новый игрок
       получил +3 каждого бустера даже если SDK/облако недоступны. Делаем
       после фиксации lastSavedSnapshotKey, и руками флашим — watch'ер на
       fingerprint пока молчит (bootBootstrapDone ещё false). */
    if (progress.grantInitialFreeBoosters()) {
      writeLocalProgressBackup()
      scheduleProgressSave()
    }
    bootBootstrapDone.value = true
  }
})()

onMounted(() => {
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

  document.addEventListener('touchstart', syncLastTouchClientYFromEvent, {
    passive: true,
    capture: true,
  })
  document.addEventListener('touchmove', blockViewportTouchScroll, {
    passive: false,
  })
  detachViewportTouchGuards = () => {
    document.removeEventListener('touchstart', syncLastTouchClientYFromEvent, {
      passive: true,
      capture: true,
    })
    document.removeEventListener('touchmove', blockViewportTouchScroll, {
      passive: false,
    })
  }

  window.addEventListener('pagehide', flushOnLifecycle)
  document.addEventListener('visibilitychange', onPageLifecycleSave)
})

onBeforeUnmount(() => {
  stopBootProgressLoop()
  stopBootTipRotation()
  detachAppRootUiGuards()
  detachViewportTouchGuards()
  void flushAllToCloud()
  window.removeEventListener('pagehide', flushOnLifecycle)
  document.removeEventListener('visibilitychange', onPageLifecycleSave)
  stopAudioFocus()
  pauseBackgroundMusic()
  if (progressSaveTimer) clearTimeout(progressSaveTimer)
  if (statsSaveTimer) clearTimeout(statsSaveTimer)
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
    /* savedAt НЕ входит в fingerprint, чтобы не было лишних save'ов из-за смены времени,
       но кладётся в облако: при загрузке поможет выбрать более свежий источник. */
    const saved = await yandexGames.saveProgress({
      ...snapshot,
      savedAt: Date.now(),
    })
    if (saved && snapshotKey) {
      lastSavedSnapshotKey.value = snapshotKey
    }
  } catch (e) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[Match3] cloud save skipped', e)
    }
  }
}

async function flushStatsToCloud() {
  if (statsSaveTimer) {
    clearTimeout(statsSaveTimer)
    statsSaveTimer = 0
  }
  try {
    const snapshot = buildStatsSnapshot()
    const statsKey = getSnapshotKey(snapshot)
    if (statsKey && statsKey === lastSavedStatsKey.value) return
    const saved = await yandexGames.saveStats(snapshot)
    if (saved && statsKey) {
      lastSavedStatsKey.value = statsKey
    }
  } catch (e) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[Match3] cloud stats save skipped', e)
    }
  }
}

function flushAllToCloud() {
  void flushProgressToCloud()
  void flushStatsToCloud()
}

function flushOnLifecycle() {
  flushAllToCloud()
}

function scheduleProgressSave() {
  if (progressSaveTimer) clearTimeout(progressSaveTimer)
  progressSaveTimer = window.setTimeout(() => {
    void flushProgressToCloud()
  }, SAVE_DEBOUNCE_MS)
}

function scheduleStatsSave() {
  if (statsSaveTimer) clearTimeout(statsSaveTimer)
  statsSaveTimer = window.setTimeout(() => {
    void flushStatsToCloud()
  }, STATS_SAVE_DEBOUNCE_MS)
}

const cloudSaveFingerprint = computed(() =>
  getSnapshotKey(buildCloudSnapshot()),
)

const statsSaveFingerprint = computed(() =>
  getSnapshotKey(buildStatsSnapshot()),
)

watch(cloudSaveFingerprint, () => {
  if (!bootBootstrapDone.value) return
  /* Сначала синхронно — localStorage, чтобы данные не пропали при немедленной
     перезагрузке (асинхронный setData в облако может не успеть). */
  writeLocalProgressBackup()
  scheduleProgressSave()
})

watch(statsSaveFingerprint, () => {
  if (!bootBootstrapDone.value) return
  writeLocalProgressBackup()
  scheduleStatsSave()
})

watch(
  () => route.fullPath,
  () => {
    flushAllToCloud()
  },
)

watch(
  () => audioSettings.effectiveMusicVolume,
  (v) => {
    setBackgroundMusicVolume(v)
    notifyMusicVolumeChanged()
  },
)

/**
 * Запускаем фоновую музыку только когда:
 *  1) Bootstrap завершён (Yandex SDK инициализирован, прогресс загружен,
 *     минимальное время прелоадера прошло) — `bootReady === true`,
 *  2) Игрок попал на главное меню — `route.name === 'menu'`.
 * `initBackgroundMusic` / `startAudioFocus` идемпотентны, повторные срабатывания
 * watch'а безопасны. Реальное `play()` всё равно произойдёт по первому
 * пользовательскому жесту (см. `resumeBackgroundMusicFromUserGesture`) —
 * это требование autoplay-policy браузеров.
 */
watch(
  [bootReady, () => route.name],
  ([ready, name]) => {
    if (ready && name === 'menu') {
      startBackgroundMusicIfNeeded()
    }
  },
  { immediate: true },
)

const inGameFlow = computed(
  () => route.name === 'play' && game.status === 'playing',
)

function onPageLifecycleSave() {
  if (document.visibilityState === 'hidden') {
    yandexGames.notifyGameplayStop()
    flushAllToCloud()
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
.m3-card--amber {
  background: linear-gradient(180deg, #ffe566 0%, #f0a020 100%);
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

/* Появление модальных окон: лёгкий bounce + затемнение фона */
@keyframes m3-modal-scrim-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes m3-modal-panel-bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.78);
  }
  58% {
    opacity: 1;
    transform: scale(1.05);
  }
  78% {
    transform: scale(0.97);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .m3-modal-overlay,
  .m3-modal-overlay > .m3-modal-panel,
  .result .result__panel.m3-modal-panel {
    animation: none !important;
  }
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
  position: fixed;
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
  animation: m3-modal-scrim-in 0.22s ease forwards;
}

.m3-modal-overlay > .m3-modal-panel {
  transform-origin: center center;
  animation: m3-modal-panel-bounce-in 0.52s cubic-bezier(0.34, 1.45, 0.64, 1) both;
}

/* Экран результата уровня (без overlay-обёртки) */
.result .result__panel.m3-modal-panel {
  transform-origin: center center;
  animation: m3-modal-panel-bounce-in 0.52s cubic-bezier(0.34, 1.45, 0.64, 1) both;
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

/* Кнопка с тем же классом — без UA-стилей, иначе шрифт/высота отличаются от span */
button.m3-top-pill {
  appearance: none;
  -webkit-appearance: none;
  margin: 0;
  font-family: inherit;
  font-weight: 900;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  color: var(--m3-text-on-wood);
  line-height: 1.15;
  box-sizing: border-box;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55);
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
  /* `contain` оставляет цепочку overscroll к вьюпорту в части мобильных браузеров
     (pull-to-refresh «Перезагрузить»). `none` гасит передачу жеста наружу. */
  overscroll-behavior: none;
  overscroll-behavior-y: none;
  overscroll-behavior-x: none;
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
  overscroll-behavior: none;
  overscroll-behavior-y: none;
}
.swiper.swiper-horizontal,
.swiper-horizontal {
  touch-action: pan-x;
  overscroll-behavior: none;
  overscroll-behavior-x: none;
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

.app-boot-fade-leave-active {
  transition: opacity 0.42s ease;
}

.app-boot-fade-leave-from {
  opacity: 1;
}

.app-boot-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .app-boot-fade-leave-active {
    transition-duration: 0.1s;
  }
}

.app-boot {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  min-height: 100dvh;
  min-height: 100svh;
  padding: 0;
  box-sizing: border-box;
  pointer-events: none;
  /* Пока грузится картинка — не голый экран под меню */
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
}

.app-boot__blocker {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: auto;
  background: transparent;
}

.app-boot__art-wrap {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.app-boot__picture {
  display: block;
  width: 100%;
  height: 100%;
}

.app-boot__art {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  user-select: none;
  pointer-events: none;
}

.app-boot__foreground {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: max(0.75rem, env(safe-area-inset-top))
    max(1.25rem, env(safe-area-inset-right))
    max(1.25rem, env(safe-area-inset-bottom))
    max(1.25rem, env(safe-area-inset-left));
  box-sizing: border-box;
  pointer-events: none;
}

.app-boot__logo-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.app-boot__logo {
  display: block;
  width: min(220px, 58vw);
  max-width: 100%;
  height: auto;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
  filter:
    drop-shadow(0 4px 0 rgba(110, 57, 17, 0.35))
    drop-shadow(0 2px 14px rgba(0, 40, 90, 0.28));
}

.app-boot__bottom {
  position: relative;
  flex-shrink: 0;
  pointer-events: auto;
  width: 100%;
  max-width: min(26rem, 100%);
  margin-left: auto;
  margin-right: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.85rem;
}

.app-boot__bar-wrap {
  width: 100%;
}

.app-boot__bar-track {
  position: relative;
  height: 2.75rem;
  border-radius: 999px;
  background: #1a0c08;
  border: 3px solid #e8b030;
  box-shadow:
    0 0 0 1px rgba(255, 220, 120, 0.35),
    0 0 14px rgba(232, 176, 48, 0.55);
  overflow: hidden;
}

.app-boot__bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: inherit;
  max-width: 100%;
  background:
    repeating-linear-gradient(
      -52deg,
      rgba(255, 255, 255, 0.22) 0 10px,
      rgba(255, 255, 255, 0) 10px 20px
    ),
    linear-gradient(180deg, #ffe94a 0%, #ff9a1a 55%, #f57800 100%);
  box-shadow: inset 0 2px 3px rgba(255, 255, 255, 0.35);
  transition: width 0.12s ease-out;
}

.app-boot__bar-label {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #ffffff;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.65),
    0 0 8px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.app-boot__tip {
  margin: 0;
  text-align: center;
  font-size: clamp(0.82rem, 2.8vw, 0.95rem);
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0.01em;
  color: #ffffff;
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.55),
    0 0 12px rgba(0, 0, 0, 0.35);
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
