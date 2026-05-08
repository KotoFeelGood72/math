/** Один общий HTMLAudioElement для фоновой музыки (music.mp3). */

/** @type {HTMLAudioElement | null} */
let el = null

/**
 * @param {string} url — URL после Vite (import music from '…mp3')
 */
export function initBackgroundMusic(url) {
  if (el) return
  el = new Audio(url)
  el.loop = true
  el.preload = 'auto'
  void el.load()
}

/** @param {number} v 0..1 */
export function setBackgroundMusicVolume(v) {
  if (el) el.volume = Math.min(1, Math.max(0, v))
}

export function pauseBackgroundMusic() {
  if (el) el.pause()
}

/**
 * Вызывать только из обработчика пользовательского жеста (pointer/click/keydown),
 * синхронно в том же «turn», иначе браузер заблокирует автовоспроизведение.
 */
export function resumeBackgroundMusicFromUserGesture() {
  if (!el) return
  if (!el.paused) return
  const p = el.play()
  if (p !== undefined) void p.catch(() => {})
}

export async function playBackgroundMusic() {
  if (!el) return
  await el.play()
}

export function isBackgroundMusicPaused() {
  return !el || el.paused
}
