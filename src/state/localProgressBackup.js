/**
 * Локальный (`localStorage`) бэкап игрового прогресса.
 *
 * Он нужен как страховка от потери облачных данных Я.Игр: облачное
 * `setData` дебоунсится и отправляется асинхронно, поэтому при быстром
 * закрытии вкладки актуальное состояние сохраняется именно здесь.
 *
 * Поле `savedAt` используется в App.vue, чтобы при загрузке выбрать
 * более свежий источник между облаком и этим бэкапом.
 */

export const LOCAL_PROGRESS_BACKUP_KEY = 'match3_yandex_backup_v1'

/**
 * @returns {{ progress?: object, stats?: object, savedAt?: number } | null}
 */
export function readLocalProgressBackup() {
  try {
    const raw = localStorage.getItem(LOCAL_PROGRESS_BACKUP_KEY)
    if (!raw) return null
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : null
  } catch {
    return null
  }
}

/**
 * Записать снимок прогресса+статов в localStorage. Текущее время
 * (`Date.now()`) добавляется как `savedAt` — это и есть «штамп свежести».
 * Тихо игнорирует ошибки квоты / приватного режима.
 *
 * @param {{ progress: object, stats: object }} snap
 */
export function writeLocalProgressBackup(snap) {
  try {
    localStorage.setItem(
      LOCAL_PROGRESS_BACKUP_KEY,
      JSON.stringify({
        progress: snap.progress,
        stats: snap.stats,
        savedAt: Date.now(),
      }),
    )
  } catch {
    /* квота / приватный режим */
  }
}

/** Полностью удалить локальный бэкап (например, при «Начать заново»). */
export function clearLocalProgressBackup() {
  try {
    localStorage.removeItem(LOCAL_PROGRESS_BACKUP_KEY)
  } catch {
    /* ignore */
  }
}
