import { BLOCKED, EMPTY, getKind } from '@/game/match3Engine.js'

/**
 * Для визуальных эффектов очистки: какой спец срабатывает в этой волне.
 * Смотрим только клетки из expanded — доска ещё до removeCells.
 *
 * @param {number[][]} board
 * @param {Set<string>} expandedKeys ключи "r,c"
 * @returns {null | object}
 */
export function inferClearFx(board, expandedKeys) {
  if (!board?.length || !expandedKeys?.size) return null

  let rainbow = null
  let lineH = null
  let lineV = null
  let bomb = null

  for (const k of expandedKeys) {
    const [r, c] = k.split(',').map((x) => parseInt(x, 10))
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue
    const v = board[r]?.[c]
    if (v === undefined || v === EMPTY || v === BLOCKED) continue
    const kind = getKind(v)
    if (kind === 'rainbow') rainbow = { r, c }
    else if (kind === 'lineH' && !lineH) lineH = { r, c }
    else if (kind === 'lineV' && !lineV) lineV = { r, c }
    else if (kind === 'bomb' && !bomb) bomb = { r, c }
  }

  if (rainbow) {
    const targets = []
    for (const k of expandedKeys) {
      if (k === `${rainbow.r},${rainbow.c}`) continue
      targets.push(k)
    }
    let seed = 0
    for (const k of expandedKeys) {
      for (let i = 0; i < k.length; i += 1) seed = (seed + k.charCodeAt(i) * (i + 1)) >>> 0
    }
    const shuffled = targets.slice()
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      seed = (seed * 1103515245 + 12345) >>> 0
      const j = seed % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return {
      type: 'rainbow',
      origin: rainbow,
      targets: shuffled.slice(0, 16),
    }
  }

  if (lineH && lineV) {
    return {
      type: 'cross',
      row: lineH.r,
      col: lineV.c,
      center: { r: lineH.r, c: lineV.c },
    }
  }

  if (lineH) return { type: 'lineH', row: lineH.r, origin: lineH }
  if (lineV) return { type: 'lineV', col: lineV.c, origin: lineV }
  if (bomb) return { type: 'bomb', origin: bomb }

  return null
}
