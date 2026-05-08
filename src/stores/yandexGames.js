import { defineStore } from 'pinia'
import { storeToRefs } from 'pinia'
import { loadYandexGamesSdk } from '@/yandex/loadYandexGamesSdk'
import {
  pauseBackgroundMusic,
  playBackgroundMusic,
} from '@/audio/backgroundMusic.js'
import { useAudioSettingsStore } from '@/stores/audioSettings.js'

/**
 * Пауза фоновой музыки на время рекламы SDK (п. 4.7).
 */
async function suspendSharedAudioForYandexAdv() {
  pauseBackgroundMusic()
}

async function resumeSharedAudioAfterYandexAdv() {
  const audio = useAudioSettingsStore()
  if (audio.effectiveMusicVolume <= 0) return
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return
  }
  try {
    await playBackgroundMusic()
  } catch {
    /* автовоспроизведение может быть заблокировано до жеста */
  }
}

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
/** Таймаут `YaGames.init()` (сеть / оболочка). */
const YAGAMES_INIT_TIMEOUT_MS = 20000
/**
 * Лимиты SDK: `getPlayer` — не чаще 20 раз за 5 мин; `getData`/`setData` — 100 за 5 мин (см. доку «Данные игрока»).
 * `getData` без ответа не должен блокировать `LoadingAPI.ready` — обрываем ожидание.
 */
const LOAD_PROGRESS_GET_DATA_TIMEOUT_MS = 15000

/**
 * Локально (`npm run dev`) без iframe Яндекс.Игр нет `ysdk.adv.showRewardedVideo` —
 * симулируем успешный просмотр, чтобы проверять награду (4-й аватар и т.д.).
 * Отключить заглушку: в `.env.local` задать `VITE_YANDEX_ADV_STUB=0`.
 */
function shouldUseRewardedVideoDevStub() {
  return import.meta.env.DEV && import.meta.env.VITE_YANDEX_ADV_STUB !== '0'
}

export const useYandexGamesStore = defineStore('yandexGames', {
  state: () => ({
    ready: false,
    /** Экземпляр после `YaGames.init()` (типы SDK в проекте не подключены). */
    ysdk: null,
    /** Экземпляр `Player` для getData/setData. */
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
    async initSdk() {
      if (this.ready) {
        return
      }
      if (this._initSdkPromise) {
        await this._initSdkPromise
        return
      }
      this._initSdkPromise = (async () => {
        try {
          await loadYandexGamesSdk()
          if (typeof YaGames === 'undefined') {
            throw new Error('YaGames не определён после загрузки скрипта')
          }
          const ysdk = await Promise.race([
            YaGames.init(),
            new Promise((_, reject) => {
              setTimeout(() => {
                reject(
                  new Error(
                    `YaGames.init: таймаут ${YAGAMES_INIT_TIMEOUT_MS} мс`,
                  ),
                )
              }, YAGAMES_INIT_TIMEOUT_MS)
            }),
          ])
          this.ysdk = ysdk
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
      try {
        // Срезаем Proxy/нерелевантное; SDK ожидает JSON-совместимый объект (лимит 200 КБ).
        const plain = JSON.parse(JSON.stringify(progress))
        await player.setData({ [PROGRESS_DATA_KEY]: plain }, true)
        return true
      } catch (err) {
        if (isCloudDataUnchangedError(err)) {
          return true
        }
        this.storageError = err instanceof Error ? err : new Error(String(err))
        return false
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
          const done = async () => {
            if (resumeAudio) {
              await resumeSharedAudioAfterYandexAdv()
            }
            resolve(payload)
          }
          void done()
        }
        const run = async () => {
          await suspendSharedAudioForYandexAdv()
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
        }
        void run()
      })
    },
    /**
     * Rewarded video — только по явной кнопке с текстом про рекламу и награду (п. 4.5–4.5.1).
     * Награда должна быть необязательным бонусом (п. 4.5.2). П. 4.7: пауза звука на время показа.
     *
     * Соответствует веб-SDK Яндекс.Игр (`onOpen` / `onRewarded` / `onClose` / `onError`), не Unity.
     *
     * @param {{ resumeAudioAfterClose?: boolean }} [opts]
     * @returns {Promise<{ rewarded: boolean, wasShown: boolean, unavailable?: boolean, error?: boolean, devStub?: boolean }>}
     */
    showRewardedVideo(opts = {}) {
      const resumeAudio =
        opts.resumeAudioAfterClose === undefined
          ? true
          : opts.resumeAudioAfterClose
      const adv = this.ysdk?.adv
      if (!adv || typeof adv.showRewardedVideo !== 'function') {
        if (shouldUseRewardedVideoDevStub()) {
          return this.devStubRewardedVideo(opts)
        }
        return Promise.resolve({
          rewarded: false,
          wasShown: false,
          unavailable: true,
        })
      }
      return new Promise((resolve) => {
        let rewarded = false
        let settled = false
        const finish = (wasShown) => {
          if (settled) return
          settled = true
          const done = async () => {
            if (resumeAudio) {
              await resumeSharedAudioAfterYandexAdv()
            }
            resolve({ rewarded, wasShown: !!wasShown })
          }
          void done()
        }
        const run = async () => {
          await suspendSharedAudioForYandexAdv()
          try {
            adv.showRewardedVideo({
              callbacks: {
                onOpen: () => {
                  /* реклама отображена на экране — звук уже приглушён выше */
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
        }
        void run()
      })
    },
    /**
     * Только development: имитация rewarded без платформы (см. `shouldUseRewardedVideoDevStub`).
     */
    async devStubRewardedVideo(opts = {}) {
      const resumeAudio =
        opts.resumeAudioAfterClose === undefined
          ? true
          : opts.resumeAudioAfterClose
      await suspendSharedAudioForYandexAdv()
      await new Promise((r) => setTimeout(r, 400))
      if (resumeAudio) {
        await resumeSharedAudioAfterYandexAdv()
      }
      if (typeof console !== 'undefined' && typeof console.info === 'function') {
        console.info(
          '[YandexGames] dev stub: rewarded — как будто реклама просмотрена (вне iframe adv нет)',
        )
      }
      return {
        rewarded: true,
        wasShown: true,
        devStub: true,
      }
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
