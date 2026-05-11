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

  function getSnapshot() {
    return {
      levels: JSON.parse(JSON.stringify(levels.value)),
      coins: coins.value,
      tutorialDone: tutorialDone.value,
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
  }

  function markTutorialDone() {
    tutorialDone.value = true
  }

  function reset() {
    levels.value = {}
    coins.value = 0
    tutorialDone.value = false
  }

  return {
    levels,
    totalLevels,
    coins,
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
