import { defineStore } from 'pinia'
import { storeToRefs } from 'pinia'
import { initYandexGamesSdk } from '@/yandex/yandexSdkInit.js'
import {
  acquireAudioFocusLock,
  releaseAudioFocusLock,
} from '@/audio/audioFocus.js'

/** Источник блокировки аудио на время показа рекламы. */
const ADV_AUDIO_LOCK = 'adv'

/**
 * Реклама: только официальный SDK Яндекс.Игр (п. 4.1, 4.6 — без сторонних блоков и кастомного RTB).
 * Полноэкранная реклама и RV — только в логических паузах (п. 4.4); звук и геймплей на паузе (п. 4.7).
 * Rewarded — только с явной кнопкой и понятной наградой (п. 4.5–4.5.2); см. экран настройки ГГ (4-й портрет).
 */

const DEFAULT_LANG = 'ru'
const PROGRESS_DATA_KEY = 'match3_progress_v1'

/** SDK v2: setData отклоняется, если JSON совпадает с уже сохранённым (текст может отличаться). */
function isCloudDataUnchangedError(err) {
  const chunks = []
  if (err != null && typeof err === 'object') {
    if ('message' in err && err.message != null) chunks.push(String(err.message))
    if ('reason' in err && err.reason != null) chunks.push(String(err.reason))
    try {
      chunks.push(JSON.stringify(err))
    } catch {
      chunks.push(String(err))
    }
  } else {
    chunks.push(String(err))
  }
  const t = chunks.join(' ').toLowerCase()
  return (
    t.includes('does not differ') ||
    t.includes('previous ones') ||
    t.includes('не отлича') ||
    t.includes('идентичн') ||
    t.includes('без изменен')
  )
}
/**
 * Лимиты SDK: `getPlayer` — не чаще 20 раз за 5 мин; `getData`/`setData` — 100 за 5 мин (см. доку «Данные игрока»).
 * `getData` без ответа не должен блокировать `LoadingAPI.ready` — обрываем ожидание.
 */
const LOAD_PROGRESS_GET_DATA_TIMEOUT_MS = 15000
/** То же — для `getStats` (отдельное API «Числовые данные»). */
const LOAD_STATS_TIMEOUT_MS = 15000

/**
 * Привести любое сохранение к простому JSON-совместимому объекту:
 * Date/Function/Map/Set отбросит, refs из Vue сериализует значениями.
 */
function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value))
}

/**
 * `setStats` / `incrementStats` принимают только конечные числа.
 * Возвращает `null`, если ни одно значение не валидно.
 * @param {Record<string, unknown> | null | undefined} input
 */
function sanitizeStatsPayload(input) {
  if (!input || typeof input !== 'object') return null
  const out = {}
  let touched = false
  for (const k of Object.keys(input)) {
    const v = Number(input[k])
    if (Number.isFinite(v)) {
      out[k] = v
      touched = true
    }
  }
  return touched ? out : null
}

export const useYandexGamesStore = defineStore('yandexGames', {
  state: () => ({
    ready: false,
    /** @type {import('ysdk').SDK | null} — как в доке: `await YaGames.init()` */
    ysdk: null,
    /** @type {import('ysdk').Player | null} — как в доке: `await ysdk.getPlayer()` */
    player: null,
    lang: DEFAULT_LANG,
    tld: '',
    /** @type {Error | null} */
    initError: null,
    /** @type {Error | null} */
    storageError: null,
    /** Однократный сигнал платформе (модерация / метрики). */
    loadingApiReadySent: false,
    /** Текущее состояние игрового процесса для GameplayAPI. */
    gameplayRunning: false,
  }),
  actions: {
    /**
     * `environment.i18n` из ysdk: до показа основного UI вызывайте в одном шаге с `notifyLoadingReady()`.
     */
    applyPlayerLocaleFromYsdk() {
      const i18n = this.ysdk?.environment?.i18n
      if (i18n?.lang) {
        this.lang = i18n.lang
        this.tld = i18n.tld || ''
      } else {
        this.lang = DEFAULT_LANG
        this.tld = ''
      }
      document.documentElement.lang = this.lang
    },
    /**
     * Док: `<script src="/sdk.js">` подключается в index.html, далее один вызов
     * `await YaGames.init()` (см. https://yandex.ru/dev/games/doc/ru/sdk/sdk-about).
     * Любая ошибка не должна блокировать игру — переходим в офлайн-режим.
     */
    async initSdk() {
      if (this.ready) return
      if (this._initSdkPromise) {
        await this._initSdkPromise
        return
      }
      this._initSdkPromise = (async () => {
        try {
          this.ysdk = await initYandexGamesSdk()
          this.applyPlayerLocaleFromYsdk()
        } catch (err) {
          this.initError = err instanceof Error ? err : new Error(String(err))
          this.lang = DEFAULT_LANG
          this.tld = ''
          document.documentElement.lang = DEFAULT_LANG
          if (typeof console !== 'undefined' && typeof console.error === 'function') {
            console.error('[Avia][yandex] initSdk ошибка (игра всё равно запустится)', this.initError)
          }
        } finally {
          this.ready = true
          this._initSdkPromise = null
        }
      })()
      await this._initSdkPromise
    },
    /**
     * Game Ready: один раз, когда снимается экран загрузки и игроку доступно меню (п. 1.19.2).
     */
    async notifyLoadingReady() {
      if (this.loadingApiReadySent) {
        return true
      }
      const api = this.ysdk?.features?.LoadingAPI
      if (!api || typeof api.ready !== 'function') {
        this.loadingApiReadySent = true
        return true
      }
      try {
        const out = api.ready()
        if (out != null && typeof out.then === 'function') {
          await out
        }
        this.loadingApiReadySent = true
        return true
      } catch {
        return false
      }
    },
    notifyGameplayStart() {
      if (this.gameplayRunning) return
      const api = this.ysdk?.features?.GameplayAPI
      if (!api || typeof api.start !== 'function') return
      this.gameplayRunning = true
      try {
        api.start()
      } catch {
        this.gameplayRunning = false
      }
    },
    notifyGameplayStop() {
      if (!this.gameplayRunning) return
      const api = this.ysdk?.features?.GameplayAPI
      if (!api || typeof api.stop !== 'function') {
        this.gameplayRunning = false
        return
      }
      try {
        api.stop()
      } finally {
        this.gameplayRunning = false
      }
    },
    async ensurePlayer() {
      if (this.player) {
        return this.player
      }
      if (!this.ysdk || typeof this.ysdk.getPlayer !== 'function') {
        return null
      }
      if (this._ensurePlayerPromise) {
        return this._ensurePlayerPromise
      }
      this._ensurePlayerPromise = (async () => {
        try {
          this.player = await this.ysdk.getPlayer()
          return this.player
        } catch (err) {
          this.storageError = err instanceof Error ? err : new Error(String(err))
          return null
        } finally {
          this._ensurePlayerPromise = null
        }
      })()
      return this._ensurePlayerPromise
    },
    async loadProgress() {
      const player = await this.ensurePlayer()
      if (!player || typeof player.getData !== 'function') {
        return null
      }
      try {
        const data = await Promise.race([
          player.getData([PROGRESS_DATA_KEY]),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(
                  `player.getData: таймаут ${LOAD_PROGRESS_GET_DATA_TIMEOUT_MS} мс`,
                ),
              )
            }, LOAD_PROGRESS_GET_DATA_TIMEOUT_MS)
          }),
        ])
        const progress = data?.[PROGRESS_DATA_KEY]
        return progress && typeof progress === 'object' ? progress : null
      } catch (err) {
        this.storageError = err instanceof Error ? err : new Error(String(err))
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('[Avia][yandex] loadProgress', err)
        }
        return null
      }
    },
    async saveProgress(progress) {
      const player = await this.ensurePlayer()
      if (!player || typeof player.setData !== 'function') {
        return false
      }
      const plain = toPlainJson(progress)
      const payload = { [PROGRESS_DATA_KEY]: plain }
      try {
        await player.setData(payload, true)
        return true
      } catch (err) {
        if (isCloudDataUnchangedError(err)) {
          return true
        }
        try {
          await new Promise((r) => setTimeout(r, 450))
          await player.setData(payload, true)
          return true
        } catch (err2) {
          if (isCloudDataUnchangedError(err2)) {
            return true
          }
          this.storageError = err2 instanceof Error ? err2 : new Error(String(err2))
          return false
        }
      }
    },
    async clearProgress() {
      const player = await this.ensurePlayer()
      if (!player || typeof player.setData !== 'function') {
        return false
      }
      try {
        await player.setData({ [PROGRESS_DATA_KEY]: null }, true)
        return true
      } catch (err) {
        if (isCloudDataUnchangedError(err)) {
          return true
        }
        this.storageError = err instanceof Error ? err : new Error(String(err))
        return false
      }
    },
    /**
     * Числовые игровые данные (только Real). Доступен только в Yandex Games SDK
     * (`player.getStats` / `player.setStats` / `player.incrementStats`).
     * Возвращает `null`, если SDK / player не готовы.
     * @param {string[] | undefined} keys — список ключей (опционально).
     * @returns {Promise<Record<string, number> | null>}
     */
    async loadStats(keys) {
      const player = await this.ensurePlayer()
      if (!player || typeof player.getStats !== 'function') return null
      try {
        const data = await Promise.race([
          Array.isArray(keys) && keys.length > 0
            ? player.getStats(keys)
            : player.getStats(),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(
                  `player.getStats: таймаут ${LOAD_STATS_TIMEOUT_MS} мс`,
                ),
              )
            }, LOAD_STATS_TIMEOUT_MS)
          }),
        ])
        return data && typeof data === 'object' ? data : null
      } catch (err) {
        this.storageError = err instanceof Error ? err : new Error(String(err))
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('[Avia][yandex] loadStats', err)
        }
        return null
      }
    },
    /**
     * Сохранить набор числовых данных целиком. Возвращает `true` при успехе или
     * если SDK недоступен (отсутствие записи не должно блокировать игру).
     * @param {Record<string, number>} stats
     */
    async saveStats(stats) {
      const player = await this.ensurePlayer()
      if (!player || typeof player.setStats !== 'function') return false
      const payload = sanitizeStatsPayload(stats)
      if (!payload) return true
      try {
        await player.setStats(payload)
        return true
      } catch (err) {
        if (isCloudDataUnchangedError(err)) return true
        this.storageError = err instanceof Error ? err : new Error(String(err))
        return false
      }
    },
    /**
     * Атомарный инкремент числовых данных. Используется для частых счётчиков —
     * см. доку «Числовые данные» (отдельные лимиты от `setData`).
     * @param {Record<string, number>} deltas
     */
    async incrementStatsRemote(deltas) {
      const player = await this.ensurePlayer()
      if (!player || typeof player.incrementStats !== 'function') return false
      const payload = sanitizeStatsPayload(deltas)
      if (!payload) return true
      try {
        await player.incrementStats(payload)
        return true
      } catch (err) {
        this.storageError = err instanceof Error ? err : new Error(String(err))
        return false
      }
    },
    /**
     * Серверные feature-flags. Возвращает поверх defaults: значения с сервера
     * имеют приоритет, но всегда строки — приведение типов делает вызывающий
     * (например, `Number(...)` / `value === 'true'`).
     * @param {Record<string, string>} [defaultFlags]
     * @returns {Promise<Record<string, string>>}
     */
    async loadFlags(defaultFlags) {
      const defaults =
        defaultFlags && typeof defaultFlags === 'object' ? { ...defaultFlags } : {}
      const ysdk = this.ysdk
      if (!ysdk || typeof ysdk.getFlags !== 'function') return defaults
      try {
        const flags = await ysdk.getFlags(
          Object.keys(defaults).length
            ? { defaultFlags: defaults }
            : undefined,
        )
        if (flags && typeof flags === 'object') {
          return { ...defaults, ...flags }
        }
        return defaults
      } catch (err) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('[Avia][yandex] loadFlags', err)
        }
        return defaults
      }
    },
    /**
     * Полноэкранная реклама (логические паузы, п. 4.4). П. 4.7: пауза звука на время показа.
     * @param {{ resumeAudioAfterClose?: boolean }} [opts] — если `false`, звук не возобновляем (выход в меню).
     * @returns {Promise<{ wasShown: boolean, unavailable?: boolean, error?: boolean }>}
     */
    showFullscreenAdv(opts = {}) {
      const resumeAudio =
        opts.resumeAudioAfterClose === undefined
          ? true
          : opts.resumeAudioAfterClose
      const adv = this.ysdk?.adv
      if (!adv || typeof adv.showFullscreenAdv !== 'function') {
        return Promise.resolve({ wasShown: false, unavailable: true })
      }
      return new Promise((resolve) => {
        let settled = false
        const finish = (payload) => {
          if (settled) return
          settled = true
          if (resumeAudio) {
            releaseAudioFocusLock(ADV_AUDIO_LOCK)
          }
          resolve(payload)
        }
        acquireAudioFocusLock(ADV_AUDIO_LOCK)
        try {
          adv.showFullscreenAdv({
            callbacks: {
              onClose: (wasShown) => finish({ wasShown: !!wasShown }),
              onError: () => finish({ wasShown: false, error: true }),
            },
          })
        } catch {
          finish({ wasShown: false, error: true })
        }
      })
    },
    /**
     * Rewarded video — только по явной кнопке с текстом про рекламу и награду (п. 4.5–4.5.1).
     * Награда должна быть необязательным бонусом (п. 4.5.2). П. 4.7: пауза звука на время показа.
     *
     * Соответствует веб-SDK Яндекс.Игр (`onOpen` / `onRewarded` / `onClose` / `onError`), не Unity.
     *
     * @param {{ resumeAudioAfterClose?: boolean }} [opts]
     * @returns {Promise<{ rewarded: boolean, wasShown: boolean, unavailable?: boolean, error?: boolean }>}
     */
    showRewardedVideo(opts = {}) {
      const adv = this.ysdk?.adv
      if (!adv || typeof adv.showRewardedVideo !== 'function') {
        return Promise.resolve({
          rewarded: false,
          wasShown: false,
          unavailable: true,
        })
      }
      const resumeAudio =
        opts.resumeAudioAfterClose === undefined
          ? true
          : opts.resumeAudioAfterClose
      return new Promise((resolve) => {
        let rewarded = false
        let settled = false
        const finish = (wasShown) => {
          if (settled) return
          settled = true
          if (resumeAudio) {
            releaseAudioFocusLock(ADV_AUDIO_LOCK)
          }
          resolve({ rewarded, wasShown: !!wasShown })
        }
        acquireAudioFocusLock(ADV_AUDIO_LOCK)
        try {
          adv.showRewardedVideo({
            callbacks: {
              onOpen: () => {
                /* реклама отображена на экране — звук уже приглушён через audioFocus */
              },
              onRewarded: () => {
                /* засчитан просмотр; награду выдаём после await showRewardedVideo по флагу rewarded */
                rewarded = true
              },
              onClose: (wasShown) => finish(wasShown),
              onError: () => finish(false),
            },
          })
        } catch {
          finish(false)
        }
      })
    },
    /** Sticky-баннер: только если в консоли включено «Использовать API для показа». */
    async showStickyBannerAdv() {
      const adv = this.ysdk?.adv
      if (!adv || typeof adv.showBannerAdv !== 'function') return
      try {
        await adv.showBannerAdv()
      } catch {
        /* нет монетизации / опция выключена */
      }
    },
    async hideStickyBannerAdv() {
      const adv = this.ysdk?.adv
      if (!adv || typeof adv.hideBannerAdv !== 'function') return
      try {
        await adv.hideBannerAdv()
      } catch {
        /* ignore */
      }
    },
  },
})

export const useYandexGamesStoreRefs = () => storeToRefs(useYandexGamesStore())
