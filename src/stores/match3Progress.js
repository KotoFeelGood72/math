import { defineStore } from 'pinia'
import { storeToRefs } from 'pinia'
import { ref, computed } from 'vue'
import { TOTAL_LEVELS } from '@/game/levelGenerator.js'

/**
 * Прогресс по уровням и метавалюта (монеты).
 * Сохраняется в облако Я.Игр через `useYandexGamesStore` (см. App.vue).
 */
export const useMatch3ProgressStore = defineStore('match3-progress', () => {
  /** @type {import('vue').Ref<Record<number, { stars: number, bestScore: number }>>} */
  const levels = ref({})
  const totalLevels = ref(TOTAL_LEVELS)
  const coins = ref(0)
  const tutorialDone = ref(false)
  /** Запас бустеров из магазина; часть переносится на старт уровня (pullBoostersForLevel). */
  const storedBoosters = ref({ bomb: 0, clock: 0, star: 0 })
  /**
   * Один раз за игру на обычных уровнях (не обучение) даётся по +3 к каждому бустеру на панели.
   * Дальше — только из запаса, рекламы и магазина.
   */
  const claimedFreePlayBoosterTriplet = ref(false)

  /** Обучение только при первом запуске; флаг хранится в облаке Я.Игр (`tutorialDone`). */
  const needsTutorial = computed(() => !tutorialDone.value)

  const highestUnlocked = computed(() => {
    let h = 1
    for (let i = 1; i <= totalLevels.value; i += 1) {
      if (levels.value[i] && levels.value[i].stars > 0) h = i + 1
      else break
    }
    return Math.min(h, totalLevels.value)
  })

  const totalStars = computed(() => {
    let n = 0
    for (const k in levels.value) n += levels.value[k].stars || 0
    return n
  })

  const completedCount = computed(() => {
    let n = 0
    for (const k in levels.value) {
      if ((levels.value[k].stars || 0) > 0) n += 1
    }
    return n
  })

  const progressPercent = computed(() =>
    Math.round((completedCount.value / totalLevels.value) * 100),
  )

  function isUnlocked(levelId) {
    return levelId <= highestUnlocked.value
  }

  function getLevel(levelId) {
    return levels.value[levelId] || { stars: 0, bestScore: 0 }
  }

  function recordResult(levelId, stars, score) {
    const cur = levels.value[levelId] || { stars: 0, bestScore: 0 }
    const next = {
      stars: Math.max(cur.stars, stars),
      bestScore: Math.max(cur.bestScore, score | 0),
    }
    levels.value = { ...levels.value, [levelId]: next }
  }

  function addCoins(n) {
    coins.value = Math.max(0, coins.value + (n | 0))
  }

  const MAX_BOOSTERS_BRING_PER_LEVEL = 8

  function clampBoosterCount(n) {
    return Math.max(0, Math.min(999, n | 0))
  }

  /** Целое ≥0 из сохранения / UI (избегаем строковой конкатенации при `cur.bomb + n`). */
  function boosterInt(v) {
    const n = Number(v)
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.trunc(n))
  }

  /**
   * Атомарно прибавить к запасу по каждому типу (одна запись в state).
   * @param {{ bomb?: number, clock?: number, star?: number }} delta
   */
  function addStoredBoostersDelta(delta) {
    if (!delta || typeof delta !== 'object') return
    const db = boosterInt(delta.bomb)
    const dc = boosterInt(delta.clock)
    const ds = boosterInt(delta.star)
    if (db <= 0 && dc <= 0 && ds <= 0) return
    const cur = storedBoosters.value
    storedBoosters.value = {
      bomb: clampBoosterCount(boosterInt(cur.bomb) + db),
      clock: clampBoosterCount(boosterInt(cur.clock) + dc),
      star: clampBoosterCount(boosterInt(cur.star) + ds),
    }
  }

  function addStoredBooster(kind, n) {
    const d = boosterInt(n)
    if (d <= 0) return
    if (kind === 'bomb') addStoredBoostersDelta({ bomb: d })
    else if (kind === 'clock') addStoredBoostersDelta({ clock: d })
    else if (kind === 'star') addStoredBoostersDelta({ star: d })
  }

  /**
   * Сколько единиц каждого бустера можно «занести» из запаса в текущую партию.
   * Не модифицирует `storedBoosters` — запас остаётся canonical source of truth,
   * расход синхронизируется через `consumeStoredBooster` при фактическом
   * использовании бустера в игре (см. match3Game). Так купленные/полученные
   * за рекламу бустеры не пропадают при выходе/перезагрузке посреди уровня.
   * @returns {{ bomb: number, clock: number, star: number }}
   */
  function pullBoostersForLevel() {
    const cur = storedBoosters.value
    return {
      bomb: Math.min(MAX_BOOSTERS_BRING_PER_LEVEL, boosterInt(cur.bomb)),
      clock: Math.min(MAX_BOOSTERS_BRING_PER_LEVEL, boosterInt(cur.clock)),
      star: Math.min(MAX_BOOSTERS_BRING_PER_LEVEL, boosterInt(cur.star)),
    }
  }

  /**
   * Снять `n` единиц бустера из запаса при фактическом использовании в партии.
   * Возвращает true, если удалось списать (был запас).
   * @param {'bomb'|'clock'|'star'} kind
   * @param {number} [n=1]
   */
  function consumeStoredBooster(kind, n = 1) {
    const d = boosterInt(n)
    if (d <= 0) return false
    const cur = storedBoosters.value
    const curVal = boosterInt(cur[kind])
    if (curVal <= 0) return false
    storedBoosters.value = {
      ...cur,
      [kind]: clampBoosterCount(curVal - d),
    }
    return true
  }

  /** Прямая установка запаса (используется при undo в партии). */
  function setStoredBoosters(snap) {
    if (!snap || typeof snap !== 'object') return
    storedBoosters.value = {
      bomb: clampBoosterCount(boosterInt(snap.bomb)),
      clock: clampBoosterCount(boosterInt(snap.clock)),
      star: clampBoosterCount(boosterInt(snap.star)),
    }
  }

  /**
   * Однократный стартовый бонус: при первом запуске игры начисляем по +3
   * каждого типа бустеров прямо в запас (`storedBoosters`). В отличие от
   * прежнего «base per level» эти бустеры не привязаны к одной партии и не
   * пропадают при выходе/неудаче — игрок их использует по своему усмотрению.
   * Идемпотентно: после первого вызова флаг сохраняется в облаке и в
   * локальном бэкапе, повторно бонус не выдаётся.
   * @returns {boolean} true — если бонус был только что начислён.
   */
  function grantInitialFreeBoosters() {
    if (claimedFreePlayBoosterTriplet.value) return false
    claimedFreePlayBoosterTriplet.value = true
    addStoredBoostersDelta({ bomb: 3, clock: 3, star: 3 })
    return true
  }

  function trySpendCoins(amount) {
    const n = amount | 0
    if (n <= 0 || coins.value < n) return false
    coins.value -= n
    return true
  }

  function getSnapshot() {
    return {
      levels: JSON.parse(JSON.stringify(levels.value)),
      coins: coins.value,
      tutorialDone: tutorialDone.value,
      storedBoosters: {
        bomb: boosterInt(storedBoosters.value.bomb),
        clock: boosterInt(storedBoosters.value.clock),
        star: boosterInt(storedBoosters.value.star),
      },
      claimedFreePlayBoosterTriplet: claimedFreePlayBoosterTriplet.value,
    }
  }

  function restoreSnapshot(snap) {
    if (!snap || typeof snap !== 'object') return
    if (snap.levels && typeof snap.levels === 'object') {
      const sane = {}
      for (const k of Object.keys(snap.levels)) {
        const id = parseInt(k, 10)
        if (!Number.isFinite(id) || id < 1 || id > totalLevels.value) continue
        const v = snap.levels[k]
        if (!v || typeof v !== 'object') continue
        sane[id] = {
          stars: clamp(v.stars | 0, 0, 3),
          bestScore: Math.max(0, v.bestScore | 0),
        }
      }
      levels.value = sane
    }
    if (typeof snap.coins === 'number' && Number.isFinite(snap.coins)) {
      coins.value = Math.max(0, snap.coins | 0)
    }
    if (snap.storedBoosters && typeof snap.storedBoosters === 'object') {
      const sb = snap.storedBoosters
      storedBoosters.value = {
        bomb: clampBoosterCount(boosterInt(sb.bomb)),
        clock: clampBoosterCount(boosterInt(sb.clock)),
        star: clampBoosterCount(boosterInt(sb.star)),
      }
    }
    const hadTutorialFlag = typeof snap.tutorialDone === 'boolean'
    if (hadTutorialFlag) {
      tutorialDone.value = snap.tutorialDone
    }
    if (!hadTutorialFlag) {
      let anyLevelDone = false
      for (const k in levels.value) {
        if ((levels.value[k].stars || 0) > 0) {
          anyLevelDone = true
          break
        }
      }
      if (anyLevelDone) {
        tutorialDone.value = true
      }
    }
    if (typeof snap.claimedFreePlayBoosterTriplet === 'boolean') {
      claimedFreePlayBoosterTriplet.value = snap.claimedFreePlayBoosterTriplet
    } else {
      // Старые сохранения без поля: раньше «тройка» выдавалась каждый уровень — считаем набор уже полученным.
      claimedFreePlayBoosterTriplet.value = true
    }
  }

  function markTutorialDone() {
    tutorialDone.value = true
  }

  function reset() {
    levels.value = {}
    coins.value = 0
    tutorialDone.value = false
    storedBoosters.value = { bomb: 0, clock: 0, star: 0 }
    claimedFreePlayBoosterTriplet.value = false
  }

  return {
    levels,
    totalLevels,
    coins,
    storedBoosters,
    tutorialDone,
    needsTutorial,
    highestUnlocked,
    totalStars,
    completedCount,
    progressPercent,
    isUnlocked,
    getLevel,
    recordResult,
    addCoins,
    addStoredBooster,
    addStoredBoostersDelta,
    consumeStoredBooster,
    setStoredBoosters,
    pullBoostersForLevel,
    grantInitialFreeBoosters,
    trySpendCoins,
    getSnapshot,
    restoreSnapshot,
    markTutorialDone,
    reset,
  }
})

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

export const useMatch3ProgressStoreRefs = () =>
  storeToRefs(useMatch3ProgressStore())
