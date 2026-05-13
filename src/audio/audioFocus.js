/**
 * Централизованный менеджер «фокуса» фоновой музыки.
 *
 * Источники блокировки (acquire/release): `adv`, `hidden`, `pause`, ...
 * Пока активен хоть один источник — музыка ставится на паузу.
 * Когда последний снят и громкость > 0 — музыка пробует возобновиться;
 * если автоплей заблокирован (нет жеста пользователя) — навешивается
 * одноразовый слушатель на pointerdown/click/keydown.
 *
 * Источник `hidden` менеджер выставляет/снимает сам по `visibilitychange`.
 */

import {
  pauseBackgroundMusic,
  playBackgroundMusic,
  resumeBackgroundMusicFromUserGesture,
} from '@/audio/backgroundMusic.js'

const HIDDEN_SOURCE = 'hidden'

/** @type {Set<string>} */
const activeSources = new Set()
let getMusicVolume = () => 0
let started = false
let detachVisibility = () => {}
let detachUnlock = () => {}

function shouldPlay() {
  if (activeSources.size > 0) return false
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return false
  }
  return getMusicVolume() > 0
}

function attachUnlockOnGesture() {
  detachUnlock()
  const once = () => {
    detachUnlock()
    if (shouldPlay()) {
      resumeBackgroundMusicFromUserGesture()
    }
  }
  detachUnlock = () => {
    document.removeEventListener('pointerdown', once)
    document.removeEventListener('click', once)
    document.removeEventListener('keydown', once)
    detachUnlock = () => {}
  }
  document.addEventListener('pointerdown', once, { passive: true })
  document.addEventListener('click', once, { passive: true })
  document.addEventListener('keydown', once)
}

function reevaluate() {
  if (!shouldPlay()) {
    detachUnlock()
    pauseBackgroundMusic()
    return
  }
  void playBackgroundMusic().catch(() => attachUnlockOnGesture())
}

function onVisibilityChange() {
  if (typeof document === 'undefined') return
  if (document.visibilityState === 'hidden') {
    activeSources.add(HIDDEN_SOURCE)
  } else {
    activeSources.delete(HIDDEN_SOURCE)
  }
  reevaluate()
}

/**
 * Подключить менеджер: повесить слушатель `visibilitychange`,
 * запомнить источник громкости.
 * Безопасно вызывать повторно — повторные вызовы игнорируются.
 *
 * @param {{ getMusicVolume: () => number }} opts
 */
export function startAudioFocus(opts) {
  if (started) return
  started = true
  getMusicVolume = typeof opts?.getMusicVolume === 'function'
    ? opts.getMusicVolume
    : () => 0
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
    detachVisibility = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      detachVisibility = () => {}
    }
    if (document.visibilityState === 'hidden') {
      activeSources.add(HIDDEN_SOURCE)
    }
  }
  reevaluate()
}

export function stopAudioFocus() {
  if (!started) return
  started = false
  detachVisibility()
  detachUnlock()
  activeSources.clear()
  getMusicVolume = () => 0
}

/**
 * Поставить источник блокировки. Идемпотентно по `source`.
 * @param {string} source
 */
export function acquireAudioFocusLock(source) {
  if (!source || typeof source !== 'string') return
  if (source === HIDDEN_SOURCE) return /* зарезервировано под visibilitychange */
  if (activeSources.has(source)) return
  activeSources.add(source)
  reevaluate()
}

/**
 * Снять источник блокировки.
 * @param {string} source
 */
export function releaseAudioFocusLock(source) {
  if (!source || typeof source !== 'string') return
  if (source === HIDDEN_SOURCE) return
  if (!activeSources.has(source)) return
  activeSources.delete(source)
  reevaluate()
}

/**
 * Сообщить менеджеру, что громкость изменилась — он сам решит,
 * нужно ли паузить (v=0) или возобновлять воспроизведение.
 * Реальную громкость HTMLAudioElement устанавливает вызывающий
 * (через `setBackgroundMusicVolume`) — менеджер только реагирует.
 */
export function notifyMusicVolumeChanged() {
  if (!started) return
  reevaluate()
}

/**
 * Принудительная переоценка состояния — например, после возврата на
 * вкладку из жеста пользователя.
 */
export function reevaluateAudioFocus() {
  if (!started) return
  reevaluate()
}
