/**
 * Официальный sdk.js на localhost в top-window не создаёт `YaGames` (см. консоль: вне iframe).
 * Подмена только в DEV и только если реальный SDK молчит — чтобы `npm run dev` не висел 25 с.
 * В iframe Яндекс.Игр и в production не используется.
 *
 * Параметры подмены настраиваются через `window.__YG_SHIM__` (в т.ч. из DevTools «на лету»):
 *   window.__YG_SHIM__ = { latencyMs: 800, failNextSetData: true, advFullscreenDurationMs: 2500 }
 *
 * Доступные ключи:
 *   - latencyMs                  : задержка для player методов (default 250)
 *   - advFullscreenDurationMs    : длительность показа полноэкранной рекламы (default 1500)
 *   - advRewardDurationMs        : длительность показа Rewarded (default 1500)
 *   - advFullscreenShown         : будет ли `wasShown=true` после `onClose` (default false)
 *   - advRewardRewarded          : будет ли начислена награда (default true)
 *   - failNextGetData            : следующий `getData` упадёт (сбрасывается после)
 *   - failNextSetData            : следующий `setData` упадёт
 *   - failNextGetStats           : следующий `getStats` упадёт
 *   - failNextSetStats           : следующий `setStats` упадёт
 *   - failNextIncrementStats     : следующий `incrementStats` упадёт
 *   - flags                      : `Record<string, string>` для `ysdk.getFlags(defaults?)`
 *   - failNextLeaderboardSetScore: следующий `leaderboards.setScore` упадёт
 */

const DEV_PLAYER_STORAGE_KEY = 'yandexGamesDevShim:playerData:v1'
const DEV_STATS_STORAGE_KEY = 'yandexGamesDevShim:playerStats:v1'
const DEV_LB_SCORES_KEY = 'yandexGamesDevShim:leaderboardScores:v1'

/** Стабильный id «авторизованного» игрока в локальной подмене (лидерборды). */
const DEV_PLAYER_UNIQUE_ID = 'dev-yandex-player-1'

const SUPPORTED_LANGS = ['ru', 'en', 'tr', 'be', 'kk', 'uk', 'uz', 'es', 'pt', 'de', 'fr', 'ar', 'id', 'ja', 'it', 'hy', 'he']

/**
 * Дефолтная локаль для dev-shim: `?lang=en` в URL переопределяет язык,
 * `?tld=com` — TLD (см. `ysdk.environment.i18n.tld`).
 */
function detectDevLocale() {
  const fallback = { lang: 'ru', tld: 'ru' }
  if (typeof window === 'undefined' || !window.location) return fallback
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = (params.get('lang') || '').toLowerCase()
    const lang = SUPPORTED_LANGS.includes(raw) ? raw : fallback.lang
    const tld = (params.get('tld') || '').toLowerCase() || fallback.tld
    return { lang, tld }
  } catch {
    return fallback
  }
}

const DEFAULTS = {
  latencyMs: 250,
  advFullscreenDurationMs: 1500,
  advRewardDurationMs: 1500,
  advFullscreenShown: false,
  advRewardRewarded: true,
  failNextGetData: false,
  failNextSetData: false,
  failNextGetStats: false,
  failNextSetStats: false,
  failNextIncrementStats: false,
  failNextLeaderboardSetScore: false,
  flags: {},
  /** Переопределяется автоматически из `?lang=`/`?tld=` при первой инициализации. */
  lang: 'ru',
  tld: 'ru',
}

function shim() {
  if (typeof window === 'undefined') return DEFAULTS
  if (!window.__YG_SHIM__ || typeof window.__YG_SHIM__ !== 'object') {
    const locale = detectDevLocale()
    window.__YG_SHIM__ = { ...DEFAULTS, ...locale }
  }
  return window.__YG_SHIM__
}

function getNumber(key, fallback) {
  const v = Number(shim()[key])
  return Number.isFinite(v) && v >= 0 ? v : fallback
}

function consumeFailFlag(key) {
  const s = shim()
  if (s[key]) {
    s[key] = false
    return true
  }
  return false
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readStore(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

function writeStore(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    /* квота / приватный режим */
  }
}

function readLeaderboardScores() {
  const o = readStore(DEV_LB_SCORES_KEY)
  return o && typeof o === 'object' ? o : {}
}

function writeLeaderboardScores(data) {
  writeStore(DEV_LB_SCORES_KEY, data)
}

/**
 * @param {number} rank
 * @param {string} publicName
 * @param {string} uniqueID
 * @param {number} score
 */
function devLeaderboardEntry(rank, publicName, uniqueID, score) {
  const s = Math.max(0, Math.floor(Number(score) || 0))
  return {
    rank,
    score: s,
    formattedScore: new Intl.NumberFormat('ru-RU').format(s),
    extraData: '',
    player: {
      lang: 'ru',
      publicName,
      uniqueID,
      scopePermissions: {
        avatar: 'allowed',
        public_name: 'allowed',
      },
      getAvatarSrc: () => '',
      getAvatarSrcSet: () => '',
    },
  }
}

/**
 * @param {string} leaderboardName
 */
async function devLbGetDescription(leaderboardName) {
  await delay(getNumber('latencyMs', DEFAULTS.latencyMs))
  const name =
    typeof leaderboardName === 'string' && leaderboardName.trim()
      ? leaderboardName.trim()
      : 'dev'
  return {
    appID: 'dev',
    default: true,
    description: {
      invert_sort_order: false,
      score_format: { options: { decimal_offset: 0 } },
      type: 'numeric',
      sort_order: 'DESC',
    },
    name,
    title: { ru: 'Лидерборд (локальная подмена)' },
  }
}

function createDevLeaderboards() {
  /** Боты для демо-таблицы (как на экране профиля). */
  const bots = [
    { name: 'Карамелька', score: 512_400, id: 'b1' },
    { name: 'Батончик_99', score: 445_200, id: 'b2' },
    { name: 'Мармеладка', score: 398_100, id: 'b3' },
    { name: 'Сахарок', score: 310_550, id: 'b4' },
    { name: 'Драже7', score: 267_300, id: 'b5' },
    { name: 'Леденец', score: 189_000, id: 'b6' },
    { name: 'Конфеткин', score: 142_800, id: 'b7' },
    { name: 'Ваниль', score: 95_400, id: 'b8' },
    { name: 'Желейка', score: 42_100, id: 'b9' },
  ]

  return {
    getDescription: devLbGetDescription,
    async setScore(leaderboardName, score) {
      await delay(getNumber('latencyMs', DEFAULTS.latencyMs))
      if (consumeFailFlag('failNextLeaderboardSetScore')) {
        throw new Error('[dev-shim] forced failNextLeaderboardSetScore')
      }
      const key =
        typeof leaderboardName === 'string' && leaderboardName.trim()
          ? leaderboardName.trim()
          : 'default'
      const v = Math.max(0, Math.floor(Number(score) || 0))
      const all = { ...readLeaderboardScores(), [key]: v }
      writeLeaderboardScores(all)
    },
    async getPlayerEntry(leaderboardName) {
      await delay(getNumber('latencyMs', DEFAULTS.latencyMs))
      const key =
        typeof leaderboardName === 'string' && leaderboardName.trim()
          ? leaderboardName.trim()
          : 'default'
      const raw = readLeaderboardScores()[key]
      const v = Math.max(0, Math.floor(Number(raw) || 0))
      if (v <= 0) {
        const err = new Error('LEADERBOARD_PLAYER_NOT_PRESENT')
        err.code = 'LEADERBOARD_PLAYER_NOT_PRESENT'
        throw err
      }
      const sorted = buildDevLeaderboardRows(key, bots)
      const mine = sorted.find((r) => r.uniqueID === DEV_PLAYER_UNIQUE_ID)
      const rank = mine ? mine.rank : sorted.length
      return devLeaderboardEntry(rank, 'Dev Игрок', DEV_PLAYER_UNIQUE_ID, v)
    },
    /**
     * @param {string} leaderboardName
     * @param {{ quantityTop?: number; includeUser?: boolean; quantityAround?: number }} [opts]
     */
    async getEntries(leaderboardName, opts) {
      await delay(getNumber('latencyMs', DEFAULTS.latencyMs))
      const key =
        typeof leaderboardName === 'string' && leaderboardName.trim()
          ? leaderboardName.trim()
          : 'default'
      const quantityTop = Math.min(
        20,
        Math.max(1, Number(opts?.quantityTop) || 10),
      )
      const sorted = buildDevLeaderboardRows(key, bots)
      const slice = sorted.slice(0, quantityTop)
      const mine = sorted.find((r) => r.uniqueID === DEV_PLAYER_UNIQUE_ID)
      const userRank = mine ? mine.rank : 0
      const entries = slice.map((r) =>
        devLeaderboardEntry(r.rank, r.name, r.uniqueID, r.score),
      )
      return {
        entries,
        userRank,
        ranges: [{ start: 0, size: entries.length }],
        leaderboard: await devLbGetDescription(key),
      }
    },
  }
}

/**
 * @param {string} leaderboardKey
 * @param {{ name: string; score: number; id: string }[]} bots
 */
function buildDevLeaderboardRows(leaderboardKey, bots) {
  const saved = Math.max(
    0,
    Math.floor(Number(readLeaderboardScores()[leaderboardKey]) || 0),
  )
  const rows = [
    ...bots.map((b) => ({
      name: b.name,
      score: b.score,
      uniqueID: `bot-${b.id}`,
    })),
    {
      name: 'Dev Игрок',
      score: saved,
      uniqueID: DEV_PLAYER_UNIQUE_ID,
    },
  ]
  rows.sort((a, b) => b.score - a.score)
  rows.forEach((r, i) => {
    r.rank = i + 1
  })
  return rows
}

function createDevPlayer() {
  return {
    isAuthorized: () => true,
    getUniqueID: () => DEV_PLAYER_UNIQUE_ID,
    getName: () => 'Dev Игрок',
    /** @param {string[]} [keys] */
    async getData(keys) {
      await delay(getNumber('latencyMs', DEFAULTS.latencyMs))
      if (consumeFailFlag('failNextGetData')) {
        throw new Error('[dev-shim] forced failNextGetData')
      }
      const all = readStore(DEV_PLAYER_STORAGE_KEY)
      if (!Array.isArray(keys) || keys.length === 0) return { ...all }
      const out = {}
      for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(all, k)) out[k] = all[k]
      }
      return out
    },
    /** @param {Record<string, unknown>} data */
    async setData(data, _flush) {
      await delay(getNumber('latencyMs', DEFAULTS.latencyMs))
      if (consumeFailFlag('failNextSetData')) {
        throw new Error('[dev-shim] forced failNextSetData')
      }
      const all = { ...readStore(DEV_PLAYER_STORAGE_KEY), ...data }
      writeStore(DEV_PLAYER_STORAGE_KEY, all)
    },
    /** @param {string[]} [keys] */
    async getStats(keys) {
      await delay(getNumber('latencyMs', DEFAULTS.latencyMs))
      if (consumeFailFlag('failNextGetStats')) {
        throw new Error('[dev-shim] forced failNextGetStats')
      }
      const all = readStore(DEV_STATS_STORAGE_KEY)
      if (!Array.isArray(keys) || keys.length === 0) return { ...all }
      const out = {}
      for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(all, k)) out[k] = all[k]
      }
      return out
    },
    /** @param {Record<string, number>} stats */
    async setStats(stats) {
      await delay(getNumber('latencyMs', DEFAULTS.latencyMs))
      if (consumeFailFlag('failNextSetStats')) {
        throw new Error('[dev-shim] forced failNextSetStats')
      }
      const next = { ...readStore(DEV_STATS_STORAGE_KEY) }
      for (const k of Object.keys(stats || {})) {
        const v = Number(stats[k])
        if (Number.isFinite(v)) next[k] = v
      }
      writeStore(DEV_STATS_STORAGE_KEY, next)
    },
    /**
     * Соответствует поведению Yandex SDK: возвращает обновлённый объект значений.
     * @param {Record<string, number>} deltas
     */
    async incrementStats(deltas) {
      await delay(getNumber('latencyMs', DEFAULTS.latencyMs))
      if (consumeFailFlag('failNextIncrementStats')) {
        throw new Error('[dev-shim] forced failNextIncrementStats')
      }
      const next = { ...readStore(DEV_STATS_STORAGE_KEY) }
      for (const k of Object.keys(deltas || {})) {
        const d = Number(deltas[k])
        if (!Number.isFinite(d)) continue
        const cur = Number(next[k])
        next[k] = (Number.isFinite(cur) ? cur : 0) + d
      }
      writeStore(DEV_STATS_STORAGE_KEY, next)
      return next
    },
  }
}

function createDevYsdk() {
  const s = shim()
  const leaderboards = createDevLeaderboards()
  return {
    environment: { i18n: { lang: s.lang || 'ru', tld: s.tld || 'ru' } },
    getPlayer: async () => createDevPlayer(),
    /**
     * @param {string} [_method]
     */
    async isAvailableMethod(_method) {
      await delay(0)
      return true
    },
    leaderboards,
    /**
     * @param {{ defaultFlags?: Record<string, string> } | undefined} opts
     */
    async getFlags(opts) {
      await delay(getNumber('latencyMs', DEFAULTS.latencyMs))
      const defaults =
        opts && opts.defaultFlags && typeof opts.defaultFlags === 'object'
          ? { ...opts.defaultFlags }
          : {}
      const fromShim = shim().flags
      const merged = fromShim && typeof fromShim === 'object' ? fromShim : {}
      return { ...defaults, ...merged }
    },
    features: {
      LoadingAPI: {
        ready: () => Promise.resolve(),
      },
      GameplayAPI: {
        start() {},
        stop() {},
      },
    },
    adv: {
      showFullscreenAdv({ callbacks }) {
        const dur = getNumber(
          'advFullscreenDurationMs',
          DEFAULTS.advFullscreenDurationMs,
        )
        setTimeout(() => {
          try {
            callbacks?.onClose?.(!!shim().advFullscreenShown)
          } catch {
            /* ignore */
          }
        }, dur)
      },
      showRewardedVideo({ callbacks }) {
        const dur = getNumber(
          'advRewardDurationMs',
          DEFAULTS.advRewardDurationMs,
        )
        try {
          callbacks?.onOpen?.()
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          const rewarded = !!shim().advRewardRewarded
          try {
            if (rewarded) callbacks?.onRewarded?.()
            callbacks?.onClose?.(rewarded)
          } catch {
            try {
              callbacks?.onClose?.(false)
            } catch {
              /* ignore */
            }
          }
        }, dur)
      },
      showBannerAdv: async () => {},
      hideBannerAdv: async () => {},
    },
  }
}

/**
 * На localhost в DEV, если ещё нет `YaGames`, подставляет минимальную реализацию (localStorage).
 */
export function ensureYandexGamesDevShim() {
  if (typeof window === 'undefined') return
  if (!import.meta.env.DEV) return
  if (window !== window.top) return
  if (window.YaGames) return

  /* инициализируем дефолты, чтобы из консоли было видно, что менять */
  shim()

  window.YaGames = {
    /** @param {Record<string, unknown>} [_opts] */
    init(_opts) {
      if (typeof console !== 'undefined' && typeof console.info === 'function') {
        console.info(
          '[Avia][yandex] DEV: без iframe нет YaGames — локальная подмена. ' +
            'Параметры эмуляции — `window.__YG_SHIM__` (latencyMs / failNextSetData / advFullscreenDurationMs / advRewardRewarded / flags). ' +
            'Реальный прокси: https://yandex.ru/dev/games/doc/ru/concepts/local-launch (`npm run dev:yandex-proxy`).',
        )
      }
      return Promise.resolve(createDevYsdk())
    },
  }
}
