import effectsUrl from '@/assets/effects.mp3'
import gameoverUrl from '@/assets/gameover.mp3'
import successUrl from '@/assets/success.mp3'

/** Относительно громкости из настроек (0..1). */
const MATCH_SFX_GAIN = 0.55
const GAMEOVER_SFX_GAIN = 0.65
const SUCCESS_SFX_GAIN = 0.7

/**
 * Звук «разбития» при совпадении на доске.
 * Отдельный Audio на каждый вызов — короткие клипы могут накладываться при каскадах.
 *
 * @param {number} effectiveVolume 0..1 (учёт mute)
 */
export function playBoardMatchBreakSfx(effectiveVolume) {
  if (effectiveVolume <= 0) return
  try {
    const a = new Audio(effectsUrl)
    a.volume = Math.min(1, effectiveVolume * MATCH_SFX_GAIN)
    void a.play().catch(() => {})
  } catch {
    /* ignore */
  }
}

/**
 * Звук при проигрыше (кончились ходы).
 * @param {number} effectiveVolume 0..1 (учёт mute)
 */
export function playGameOverSfx(effectiveVolume) {
  if (effectiveVolume <= 0) return
  try {
    const a = new Audio(gameoverUrl)
    a.volume = Math.min(1, effectiveVolume * GAMEOVER_SFX_GAIN)
    void a.play().catch(() => {})
  } catch {
    /* ignore */
  }
}

/**
 * Победа на уровне (и открытие следующего при первом прохождении).
 * @param {number} effectiveVolume 0..1 (учёт mute)
 */
export function playSuccessSfx(effectiveVolume) {
  if (effectiveVolume <= 0) return
  try {
    const a = new Audio(successUrl)
    a.volume = Math.min(1, effectiveVolume * SUCCESS_SFX_GAIN)
    void a.play().catch(() => {})
  } catch {
    /* ignore */
  }
}
