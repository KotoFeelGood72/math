import { pickInt } from './rng.js'

/**
 * Движок match-3. Цвет — целое число; ячейки могут быть «специальными»
 * (booster). Кодирование в одном `number`:
 *
 *   -1                       — EMPTY
 *   0..15                    — обычная фишка цвета C
 *   100 + C                  — line-rocket по горизонтали (LINE_H)
 *   200 + C                  — line-rocket по вертикали   (LINE_V)
 *   300 + C                  — bomb (3×3) — пока не создаётся, оставлено на будущее
 *   400                      — rainbow (без цвета)
 */

export const EMPTY = -1
export const BLOCKED = -2
export const RAINBOW = 400

export function isBlocked(v) {
  return v === BLOCKED
}

const SPEC_LINE_H_BASE = 100
const SPEC_LINE_V_BASE = 200
const SPEC_BOMB_BASE = 300

export function makeNormal(color) {
  return color | 0
}
export function makeLineH(color) {
  return SPEC_LINE_H_BASE + (color | 0)
}
export function makeLineV(color) {
  return SPEC_LINE_V_BASE + (color | 0)
}
export function makeBomb(color) {
  return SPEC_BOMB_BASE + (color | 0)
}

export function getColor(v) {
  if (v < 0) return -1
  if (v === RAINBOW) return -1
  if (v < 16) return v
  if (v < SPEC_LINE_V_BASE) return v - SPEC_LINE_H_BASE
  if (v < SPEC_BOMB_BASE) return v - SPEC_LINE_V_BASE
  if (v < RAINBOW) return v - SPEC_BOMB_BASE
  return -1
}

export function getKind(v) {
  if (v < 0) return 'empty'
  if (v < 16) return 'normal'
  if (v === RAINBOW) return 'rainbow'
  if (v < SPEC_LINE_V_BASE) return 'lineH'
  if (v < SPEC_BOMB_BASE) return 'lineV'
  if (v < RAINBOW) return 'bomb'
  return 'normal'
}

export function isSpecial(v) {
  return v >= 16
}
export function isRainbow(v) {
  return v === RAINBOW
}

export function cloneBoard(board) {
  return board.map((row) => row.slice())
}

export function inside(board, r, c) {
  return r >= 0 && c >= 0 && r < board.length && c < board[0].length
}

export function isAdjacent(a, b) {
  const dr = Math.abs(a.r - b.r)
  const dc = Math.abs(a.c - b.c)
  return dr + dc === 1
}

/** Заполнить пустое поле обычными фишками так, чтобы не было стартовых матчей и был хотя бы один ход.
 *  mask — необязательная rows×cols матрица 0/1: 0 = заблокированная клетка (вне формы уровня).
 */
export function generateBoard(rows, cols, colors, rng, mask = null) {
  let board
  let attempt = 0
  do {
    board = []
    for (let r = 0; r < rows; r += 1) {
      const row = []
      for (let c = 0; c < cols; c += 1) {
        if (mask && mask[r] && mask[r][c] === 0) {
          row.push(BLOCKED)
        } else {
          row.push(pickNonMatching(board, row, r, c, colors, rng))
        }
      }
      board.push(row)
    }
    attempt += 1
  } while (!hasAnyMove(board) && attempt < 20)
  return board
}

function pickNonMatching(board, currentRow, r, c, colors, rng) {
  const forbidden = new Set()
  if (
    c >= 2 &&
    currentRow[c - 1] >= 0 &&
    currentRow[c - 2] >= 0 &&
    currentRow[c - 1] === currentRow[c - 2]
  ) {
    forbidden.add(currentRow[c - 1])
  }
  if (
    r >= 2 &&
    board[r - 1][c] >= 0 &&
    board[r - 2][c] >= 0 &&
    board[r - 1][c] === board[r - 2][c]
  ) {
    forbidden.add(board[r - 1][c])
  }

  // Запрещаем стартовый матч 2×2: при генерации кладём фишки слева-направо/сверху-вниз,
  // поэтому достаточно проверять квадрат, который "закрывается" текущей клеткой (r,c).
  if (r >= 1 && c >= 1) {
    const a = currentRow[c - 1] // (r, c-1)
    const b = board[r - 1][c] // (r-1, c)
    const d = board[r - 1][c - 1] // (r-1, c-1)
    const col = getColor(a)
    if (
      col >= 0 &&
      col === getColor(b) &&
      col === getColor(d) &&
      !isRainbow(a) &&
      !isRainbow(b) &&
      !isRainbow(d)
    ) {
      forbidden.add(col)
    }
  }
  if (forbidden.size >= colors) {
    return pickInt(rng, colors)
  }
  let v = pickInt(rng, colors)
  let guard = 0
  while (forbidden.has(v) && guard < 12) {
    v = pickInt(rng, colors)
    guard += 1
  }
  return v
}

/* ============================ MATCH DETECTION ============================ */

/**
 * Найти все группы матчей (≥3 одного цвета подряд по горизонтали/вертикали).
 * Возвращает массив объектов { cells: Set<"r,c">, runs: Run[] }.
 *
 * Run = { dir: 'h'|'v', r, c, len } — конкретный «прогон» подряд идущих фишек.
 * runs нужны, чтобы понять, какой именно бустер создавать (line-4 / line-5 / L-shape).
 *
 * Радужная фишка (RAINBOW) сама по себе в матчах не участвует.
 */
export function findMatches(board) {
  const rows = board.length
  const cols = board[0].length
  /** @type {{ dir: 'h'|'v', r: number, c: number, len: number }[]} */
  const runs = []

  // горизонтальные ран-ы
  for (let r = 0; r < rows; r += 1) {
    let runStart = 0
    for (let c = 1; c <= cols; c += 1) {
      const same =
        c < cols &&
        sameNormalColor(board[r][runStart], board[r][c])
      if (!same) {
        const len = c - runStart
        if (len >= 3 && getColor(board[r][runStart]) >= 0) {
          runs.push({ dir: 'h', r, c: runStart, len })
        }
        runStart = c
      }
    }
  }
  // вертикальные ран-ы
  for (let c = 0; c < cols; c += 1) {
    let runStart = 0
    for (let r = 1; r <= rows; r += 1) {
      const same =
        r < rows &&
        sameNormalColor(board[runStart][c], board[r][c])
      if (!same) {
        const len = r - runStart
        if (len >= 3 && getColor(board[runStart][c]) >= 0) {
          runs.push({ dir: 'v', r: runStart, c, len })
        }
        runStart = r
      }
    }
  }

  // квадраты 2×2 (популярное правило: 4 одинаковых в блоке тоже матч)
  // Представляем их как 2 "ран-а" длиной 2, пересекающихся в (r,c),
  // чтобы группировка и создание "бомбы" работали без отдельной логики.
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const a = board[r][c]
      if (a === EMPTY || a === BLOCKED) continue
      if (isRainbow(a)) continue
      const col = getColor(a)
      if (col < 0) continue
      if (
        sameNormalColor(a, board[r][c + 1]) &&
        sameNormalColor(a, board[r + 1][c]) &&
        sameNormalColor(a, board[r + 1][c + 1])
      ) {
        runs.push({ dir: 'h', r, c, len: 2 })
        runs.push({ dir: 'v', r, c, len: 2 })
      }
    }
  }

  if (runs.length === 0) return []

  // Группируем пересекающиеся ран-ы (горизонталь + вертикаль одного цвета на пересечении)
  const groups = []
  const used = new Array(runs.length).fill(false)
  for (let i = 0; i < runs.length; i += 1) {
    if (used[i]) continue
    const groupRuns = [runs[i]]
    used[i] = true
    const cells = runCellsSet(runs[i])
    let grew = true
    while (grew) {
      grew = false
      for (let j = 0; j < runs.length; j += 1) {
        if (used[j]) continue
        const rj = runs[j]
        if (
          getColor(boardAtRunStart(board, runs[i])) ===
            getColor(boardAtRunStart(board, rj)) &&
          runsOverlap(runs[i], rj)
        ) {
          for (const k of runCellsSet(rj)) cells.add(k)
          groupRuns.push(rj)
          used[j] = true
          grew = true
        }
      }
    }
    groups.push({ cells, runs: groupRuns })
  }
  return groups
}

function sameNormalColor(a, b) {
  const ca = getColor(a)
  const cb = getColor(b)
  return ca >= 0 && ca === cb && !isRainbow(a) && !isRainbow(b)
}

function boardAtRunStart(board, run) {
  return board[run.r][run.c]
}

function runCellsSet(run) {
  const set = new Set()
  if (run.dir === 'h') {
    for (let k = 0; k < run.len; k += 1) set.add(`${run.r},${run.c + k}`)
  } else {
    for (let k = 0; k < run.len; k += 1) set.add(`${run.r + k},${run.c}`)
  }
  return set
}

function runsOverlap(a, b) {
  const sa = runCellsSet(a)
  for (const k of runCellsSet(b)) if (sa.has(k)) return true
  return false
}

/* ============================ SPECIAL CREATION ============================ */

/**
 * По данным матчей (и опциональной позиции, куда был совершён своп игрока)
 * вычисляем, какие специальные фишки нужно создать после очистки.
 *
 * Правила:
 *   • Один прогон длиной 4 в строке   → LINE_H
 *   • Один прогон длиной 4 в колонке  → LINE_V
 *   • Один прогон длиной ≥5           → RAINBOW
 *   • Группа из ≥2 пересекающихся прогонов (L/T) → BOMB
 *
 * @returns {{ pos: { r: number, c: number }, kind: 'lineH'|'lineV'|'bomb'|'rainbow', color: number }[]}
 */
export function decideSpecialsFromMatches(board, groups, triggerPos) {
  const out = []
  for (const g of groups) {
    const color = getColor(boardAtRunStart(board, g.runs[0]))
    let kind = null
    let len = 0
    if (g.runs.length >= 2) {
      kind = 'bomb'
    } else {
      const r0 = g.runs[0]
      len = r0.len
      if (len >= 5) kind = 'rainbow'
      else if (len === 4) kind = r0.dir === 'h' ? 'lineH' : 'lineV'
    }
    if (!kind) continue
    const pos = pickSpecialPosition(g, triggerPos)
    out.push({ pos, kind, color: kind === 'rainbow' ? -1 : color })
  }
  return out
}

function pickSpecialPosition(group, triggerPos) {
  if (triggerPos) {
    const k = `${triggerPos.r},${triggerPos.c}`
    if (group.cells.has(k)) return { r: triggerPos.r, c: triggerPos.c }
  }
  // фолбэк — центр первого ран-а
  const r0 = group.runs[0]
  if (r0.dir === 'h') {
    return { r: r0.r, c: r0.c + Math.floor(r0.len / 2) }
  }
  return { r: r0.r + Math.floor(r0.len / 2), c: r0.c }
}

/* ============================ ACTIVATION CHAIN ============================ */

/**
 * Раскрываем специальные фишки внутри уже выбранных к удалению ячеек.
 * Возвращаем итоговый набор ячеек к удалению.
 */
export function expandSpecials(board, initialCellSet, hintColor) {
  const set = new Set(initialCellSet)
  const queue = Array.from(initialCellSet)
  while (queue.length > 0) {
    const key = queue.shift()
    const [r, c] = key.split(',').map((s) => parseInt(s, 10))
    const v = board[r][c]
    if (v === EMPTY) continue
    if (!isSpecial(v)) continue
    const cells = activateSpecial(board, v, r, c, hintColor)
    for (const k of cells) {
      if (!set.has(k)) {
        set.add(k)
        queue.push(k)
      }
    }
  }
  return set
}

function activateSpecial(board, v, r, c, hintColor) {
  const kind = getKind(v)
  const out = []
  const rows = board.length
  const cols = board[0].length
  if (kind === 'lineH') {
    for (let cc = 0; cc < cols; cc += 1) out.push(`${r},${cc}`)
  } else if (kind === 'lineV') {
    for (let rr = 0; rr < rows; rr += 1) out.push(`${rr},${c}`)
  } else if (kind === 'bomb') {
    for (let rr = r - 1; rr <= r + 1; rr += 1) {
      for (let cc = c - 1; cc <= c + 1; cc += 1) {
        if (rr >= 0 && cc >= 0 && rr < rows && cc < cols) {
          out.push(`${rr},${cc}`)
        }
      }
    }
  } else if (kind === 'rainbow') {
    const target = hintColor !== undefined && hintColor >= 0
      ? hintColor
      : pickMostCommonColor(board)
    if (target >= 0) {
      for (let rr = 0; rr < rows; rr += 1) {
        for (let cc = 0; cc < cols; cc += 1) {
          if (getColor(board[rr][cc]) === target) {
            out.push(`${rr},${cc}`)
          }
        }
      }
    }
  }
  return out
}

/** Для бустера «звезда» по радужной/неизвестной клетке — самый частый цвет. */
export function pickMostCommonColor(board) {
  const counts = {}
  let best = -1
  let bestCount = 0
  for (const row of board) {
    for (const v of row) {
      const col = getColor(v)
      if (col < 0) continue
      counts[col] = (counts[col] || 0) + 1
      if (counts[col] > bestCount) {
        bestCount = counts[col]
        best = col
      }
    }
  }
  return best
}

/** Полная подборка всех ячеек цвета (для активации rainbow по свопу). */
export function collectColorCells(board, color) {
  const out = new Set()
  for (let r = 0; r < board.length; r += 1) {
    for (let c = 0; c < board[0].length; c += 1) {
      if (board[r][c] === BLOCKED) continue
      if (getColor(board[r][c]) === color) out.add(`${r},${c}`)
    }
  }
  return out
}

/** Ячейки квадрата 3×3 вокруг (r,c), без BLOCKED — бустер «бомба». */
export function collectBomb3x3Cells(board, r, c) {
  const out = new Set()
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const rr = r + dr
      const cc = c + dc
      if (!inside(board, rr, cc)) continue
      if (board[rr][cc] === BLOCKED) continue
      out.add(`${rr},${cc}`)
    }
  }
  return out
}

/** Все ячейки доски (для двойной радуги). Заблокированные не включаются. */
export function allBoardCells(board) {
  const out = new Set()
  for (let r = 0; r < board.length; r += 1) {
    for (let c = 0; c < board[0].length; c += 1) {
      if (board[r][c] === BLOCKED) continue
      out.add(`${r},${c}`)
    }
  }
  return out
}

/* ============================ CELL OPERATIONS ============================ */

/**
 * Удалить переданный набор ключей; вернуть { board, removedByColor, totalRemoved }.
 */
export function removeCells(board, cellSet) {
  const next = cloneBoard(board)
  const removedByColor = new Map()
  let totalRemoved = 0
  for (const key of cellSet) {
    const [r, c] = key.split(',').map((s) => parseInt(s, 10))
    const v = next[r][c]
    if (v === EMPTY || v === BLOCKED) continue
    const color = getColor(v)
    if (color >= 0) {
      removedByColor.set(color, (removedByColor.get(color) || 0) + 1)
    }
    next[r][c] = EMPTY
    totalRemoved += 1
  }
  return { board: next, removedByColor, totalRemoved }
}

/** Поставить специальную фишку в указанную ячейку (после очистки). */
export function placeSpecial(board, pos, kind, color) {
  const next = cloneBoard(board)
  let v
  if (kind === 'rainbow') v = RAINBOW
  else if (kind === 'lineH') v = makeLineH(color)
  else if (kind === 'lineV') v = makeLineV(color)
  else if (kind === 'bomb') v = makeBomb(color)
  else v = makeNormal(color)
  next[pos.r][pos.c] = v
  return next
}

/** Гравитация: сдвинуть непустые вниз, пустые наверх. Заблокированные клетки
 *  делят колонку на сегменты — фишки не проходят сквозь них. */
export function applyGravity(board) {
  const rows = board.length
  const cols = board[0].length
  const next = cloneBoard(board)
  for (let c = 0; c < cols; c += 1) {
    let write = rows - 1
    for (let r = rows - 1; r >= 0; r -= 1) {
      if (next[r][c] === BLOCKED) {
        // закрываем сегмент: следующая запись будет ВЫШЕ блока
        write = r - 1
        continue
      }
      if (next[r][c] !== EMPTY) {
        const v = next[r][c]
        next[r][c] = EMPTY
        next[write][c] = v
        write -= 1
      }
    }
  }
  return next
}

/** Заполнить пустые ячейки сверху случайными цветами. Заблокированные пропускаем. */
export function refill(board, colors, rng) {
  const rows = board.length
  const cols = board[0].length
  const next = cloneBoard(board)
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (next[r][c] === EMPTY) next[r][c] = pickInt(rng, colors)
    }
  }
  return next
}

/** Поменять местами две соседние ячейки. */
export function swap(board, a, b) {
  const next = cloneBoard(board)
  const tmp = next[a.r][a.c]
  next[a.r][a.c] = next[b.r][b.c]
  next[b.r][b.c] = tmp
  return next
}

/** Есть ли хотя бы один валидный своп (даёт матч / рейнбоу-активация)? */
export function hasAnyMove(board) {
  const rows = board.length
  const cols = board[0].length
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const v = board[r][c]
      if (v === BLOCKED) continue
      // Радужная фишка → ход всегда возможен (если рядом есть любая цветная)
      if (isRainbow(v)) {
        const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
        for (const [nr, nc] of neighbors) {
          if (nr >= 0 && nc >= 0 && nr < rows && nc < cols) {
            if (getColor(board[nr][nc]) >= 0) return true
          }
        }
      }
      if (
        c + 1 < cols &&
        board[r][c + 1] !== BLOCKED &&
        trySwapMakesMatch(board, { r, c }, { r, c: c + 1 })
      ) {
        return true
      }
      if (
        r + 1 < rows &&
        board[r + 1][c] !== BLOCKED &&
        trySwapMakesMatch(board, { r, c }, { r: r + 1, c })
      ) {
        return true
      }
    }
  }
  return false
}

function trySwapMakesMatch(board, a, b) {
  const next = swap(board, a, b)
  return findMatches(next).length > 0
}

/**
 * Первый допустимый своп (как в hasAnyMove): для подсказки качаем фишку `from`.
 * @returns {{ from: { r: number, c: number }, to: { r: number, c: number } } | null}
 */
export function findHintSwap(board) {
  const rows = board.length
  const cols = board[0]?.length ?? 0
  if (!rows || !cols) return null

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const v = board[r][c]
      if (v === BLOCKED) continue

      if (isRainbow(v)) {
        const neighbors = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ]
        for (const [nr, nc] of neighbors) {
          if (
            nr < 0 ||
            nc < 0 ||
            nr >= rows ||
            nc >= cols ||
            board[nr][nc] === BLOCKED
          ) {
            continue
          }
          if (getColor(board[nr][nc]) >= 0) {
            return { from: { r, c }, to: { r: nr, c: nc } }
          }
        }
      }

      if (c + 1 < cols && board[r][c + 1] !== BLOCKED) {
        const a = { r, c }
        const b = { r, c: c + 1 }
        if (trySwapMakesMatch(board, a, b)) {
          return { from: a, to: b }
        }
        const va = board[r][c]
        const vb = board[r][c + 1]
        if (isRainbow(va) && getColor(vb) >= 0) return { from: a, to: b }
        if (isRainbow(vb) && getColor(va) >= 0) return { from: a, to: b }
      }

      if (r + 1 < rows && board[r + 1][c] !== BLOCKED) {
        const a = { r, c }
        const b = { r: r + 1, c }
        if (trySwapMakesMatch(board, a, b)) {
          return { from: a, to: b }
        }
        const va = board[r][c]
        const vb = board[r + 1][c]
        if (isRainbow(va) && getColor(vb) >= 0) return { from: a, to: b }
        if (isRainbow(vb) && getColor(va) >= 0) return { from: a, to: b }
      }
    }
  }
  return null
}
