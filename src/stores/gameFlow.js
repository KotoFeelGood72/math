import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * Дедупликация облачных сейвов: храним JSON-ключ последнего успешно сохранённого снимка.
 */
export const useGameFlowStore = defineStore('game-flow', () => {
  const lastSavedSnapshotKey = ref('')
  return { lastSavedSnapshotKey }
})
