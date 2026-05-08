import { ref, watch, computed } from 'vue'
import { defineStore } from 'pinia'
import { storeToRefs } from 'pinia'

const STORAGE_KEY = 'avia-novella-audio'

export const useAudioSettingsStore = defineStore('audio-settings', () => {
  const volume = ref(0.75)
  const muted = ref(false)
  /** Если false — фоновая музыка отключена (мультипликатор к громкости). */
  const musicEnabled = ref(true)
  /** Если false — match-3 SFX (совпадения, победа/поражение) не играют. */
  const sfxEnabled = ref(true)

  const effectiveVolume = computed(() =>
    muted.value ? 0 : volume.value,
  )

  const effectiveMusicVolume = computed(() =>
    !musicEnabled.value ? 0 : effectiveVolume.value,
  )

  const effectiveSfxVolume = computed(() =>
    !sfxEnabled.value ? 0 : effectiveVolume.value,
  )

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          volume: volume.value,
          muted: muted.value,
          musicEnabled: musicEnabled.value,
          sfxEnabled: sfxEnabled.value,
        }),
      )
    } catch {
      /* ignore */
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (typeof data.volume === 'number') {
        volume.value = Math.min(1, Math.max(0, data.volume))
      }
      if (typeof data.muted === 'boolean') {
        muted.value = data.muted
      }
      if (typeof data.musicEnabled === 'boolean') {
        musicEnabled.value = data.musicEnabled
      }
      if (typeof data.sfxEnabled === 'boolean') {
        sfxEnabled.value = data.sfxEnabled
      }
    } catch {
      /* ignore */
    }
  }

  load()

  watch([volume, muted, musicEnabled, sfxEnabled], persist)

  /**
   * @param {number} v 0..1
   */
  function setVolume(v) {
    const next = Math.min(1, Math.max(0, v))
    volume.value = next
    if (next > 0) {
      muted.value = false
    }
  }

  function toggleMuted() {
    if (muted.value) {
      muted.value = false
      if (volume.value === 0) {
        volume.value = 0.6
      }
    } else {
      muted.value = true
    }
  }

  function toggleMusicEnabled() {
    musicEnabled.value = !musicEnabled.value
  }

  function toggleSfxEnabled() {
    sfxEnabled.value = !sfxEnabled.value
  }

  return {
    volume,
    muted,
    musicEnabled,
    sfxEnabled,
    effectiveVolume,
    effectiveMusicVolume,
    effectiveSfxVolume,
    setVolume,
    toggleMuted,
    toggleMusicEnabled,
    toggleSfxEnabled,
  }
})

export const useAudioSettingsStoreRefs = () => storeToRefs(useAudioSettingsStore())
