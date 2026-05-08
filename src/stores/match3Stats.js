import { defineStore } from 'pinia'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

/**
 * Накопленная статистика игрока: ходы, матчи, рекорды, бустеры.
 */
export const useMatch3StatsStore = defineStore('match3-stats', () => {
  const totalMoves = ref(0)
  const totalMatches = ref(0)
  const totalScore = ref(0)
  const bestSingleLevelScore = ref(0)
  const longestCombo = ref(0)
  const longestCascade = ref(0)
  const levelsPlayed = ref(0)
  const levelsWon = ref(0)
  const specialsCreated = ref(0)
  const rainbowsUsed = ref(0)

  function addMove() {
    totalMoves.value += 1
  }
  function addMatches(n) {
    totalMatches.value += n | 0
  }
  function addScore(n) {
    totalScore.value += n | 0
  }
  function noteCombo(size) {
    if (size > longestCombo.value) longestCombo.value = size
  }
  function noteCascade(n) {
    if (n > longestCascade.value) longestCascade.value = n
  }
  function noteLevelStarted() {
    levelsPlayed.value += 1
  }
  function noteLevelWon(score) {
    levelsWon.value += 1
    if (score > bestSingleLevelScore.value) bestSingleLevelScore.value = score
  }
  function noteSpecialCreated(_kind) {
    specialsCreated.value += 1
  }
  function noteSpecialUsed(kind) {
    if (kind === 'rainbow') rainbowsUsed.value += 1
  }

  function getSnapshot() {
    return {
      totalMoves: totalMoves.value,
      totalMatches: totalMatches.value,
      totalScore: totalScore.value,
      bestSingleLevelScore: bestSingleLevelScore.value,
      longestCombo: longestCombo.value,
      longestCascade: longestCascade.value,
      levelsPlayed: levelsPlayed.value,
      levelsWon: levelsWon.value,
      specialsCreated: specialsCreated.value,
      rainbowsUsed: rainbowsUsed.value,
    }
  }

  function restoreSnapshot(s) {
    if (!s || typeof s !== 'object') return
    totalMoves.value = nz(s.totalMoves)
    totalMatches.value = nz(s.totalMatches)
    totalScore.value = nz(s.totalScore)
    bestSingleLevelScore.value = nz(s.bestSingleLevelScore)
    longestCombo.value = nz(s.longestCombo)
    longestCascade.value = nz(s.longestCascade)
    levelsPlayed.value = nz(s.levelsPlayed)
    levelsWon.value = nz(s.levelsWon)
    specialsCreated.value = nz(s.specialsCreated)
    rainbowsUsed.value = nz(s.rainbowsUsed)
  }

  function reset() {
    totalMoves.value = 0
    totalMatches.value = 0
    totalScore.value = 0
    bestSingleLevelScore.value = 0
    longestCombo.value = 0
    longestCascade.value = 0
    levelsPlayed.value = 0
    levelsWon.value = 0
    specialsCreated.value = 0
    rainbowsUsed.value = 0
  }

  return {
    totalMoves,
    totalMatches,
    totalScore,
    bestSingleLevelScore,
    longestCombo,
    longestCascade,
    levelsPlayed,
    levelsWon,
    specialsCreated,
    rainbowsUsed,
    addMove,
    addMatches,
    addScore,
    noteCombo,
    noteCascade,
    noteLevelStarted,
    noteLevelWon,
    noteSpecialCreated,
    noteSpecialUsed,
    getSnapshot,
    restoreSnapshot,
    reset,
  }
})

function nz(v) {
  return Math.max(0, v | 0)
}

export const useMatch3StatsStoreRefs = () =>
  storeToRefs(useMatch3StatsStore())
