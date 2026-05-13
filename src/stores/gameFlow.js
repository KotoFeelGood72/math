import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * Дедупликация облачных сейвов: храним JSON-ключи последних успешно сохранённых снимков.
 * `lastSavedSnapshotKey` — основной blob (progress) через `player.setData`.
 * `lastSavedStatsKey`    — числовые данные через `player.setStats`.
 */
export const useGameFlowStore = defineStore('game-flow', () => {
  const lastSavedSnapshotKey = ref('')
  const lastSavedStatsKey = ref('')
  return { lastSavedSnapshotKey, lastSavedStatsKey }
})
