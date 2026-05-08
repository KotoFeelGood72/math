import { createRng } from './rng.js'
import { generateBoard } from './match3Engine.js'

export const COLOR_PALETTE = [
  { id: 0, name: 'red', label: 'Красный', shape: 'circle', cssVar: '#ef4f4f' },
  { id: 1, name: 'amber', label: 'Жёлтый', shape: 'square', cssVar: '#f5b042' },
  { id: 2, name: 'green', label: 'Зелёный', shape: 'diamond', cssVar: '#4ec27a' },
  { id: 3, name: 'blue', label: 'Синий', shape: 'triangle', cssVar: '#4a8de0' },
  { id: 4, name: 'violet', label: 'Фиолетовый', shape: 'hex', cssVar: '#a06ad6' },
  { id: 5, name: 'cyan', label: 'Бирюзовый', shape: 'star', cssVar: '#3fb6c8' },
]

export const TOTAL_LEVELS = 30

/** Все уровни используют одну канву; «дыры» задаются нулями в маске. */
export const BOARD_CANVAS_SIZE = 6

/**
 * Формы уровней: каждая ровно BOARD_CANVAS_SIZE×BOARD_CANVAS_SIZE.
 * '#' — активная клетка, '.' — блок (вне формы).
 */
const SHAPE_PATTERNS = [
  // 0 — полный прямоугольник
  [
    '######',
    '######',
    '######',
    '######',
    '######',
    '######',
  ],
  // 1 — ромб
  [
    '..##..',
    '.####.',
    '######',
    '######',
    '.####.',
    '..##..',
  ],
  // 2 — сердце (упрощённо)
  [
    '.##..#',
    '######',
    '######',
    '.####.',
    '..##..',
    '..##..',
  ],
  // 3 — стрела вверх
  [
    '..##..',
    '.####.',
    '######',
    '..##..',
    '..##..',
    '..##..',
  ],
  // 4 — плюс
  [
    '..##..',
    '..##..',
    '######',
    '######',
    '..##..',
    '..##..',
  ],
  // 5 — Т-образная
  [
    '######',
    '######',
    '..##..',
    '..##..',
    '..##..',
    '..##..',
  ],
  // 6 — песочные часы
  [
    '######',
    '.####.',
    '..##..',
    '..##..',
    '.####.',
    '######',
  ],
  // 7 — бабочка / X
  [
    '##..##',
    '######',
    '..##..',
    '..##..',
    '######',
    '##..##',
  ],
]

/** Перевести маску из ASCII в матрицу 0/1 (размер BOARD_CANVAS_SIZE×BOARD_CANVAS_SIZE). */
function compileShape(pattern) {
  const rows = pattern.length
  const cols = pattern[0]?.length ?? 0
  if (rows !== BOARD_CANVAS_SIZE || cols !== BOARD_CANVAS_SIZE) {
    throw new Error(
      `[levelGenerator] маска должна быть ${BOARD_CANVAS_SIZE}×${BOARD_CANVAS_SIZE}, получено ${rows}×${cols}`,
    )
  }
  const mask = []
  for (let r = 0; r < rows; r += 1) {
    const row = new Array(cols)
    for (let c = 0; c < cols; c += 1) {
      row[c] = pattern[r][c] === '#' ? 1 : 0
    }
    mask.push(row)
  }
  return { rows: BOARD_CANVAS_SIZE, cols: BOARD_CANVAS_SIZE, mask }
}

const COMPILED_SHAPES = SHAPE_PATTERNS.map(compileShape)

/** Получить маску формы для уровня (детерминированно, циклом по шаблонам). */
export function getLevelShape(level) {
  const lv = Math.max(1, Math.min(TOTAL_LEVELS, level | 0))
  const idx = (lv * 13 + 7) % COMPILED_SHAPES.length
  const base = COMPILED_SHAPES[idx]

  // Доп. вариативность без новых шаблонов: зеркалим маску по X/Y детерминированно от уровня.
  const flipH = (lv & 1) === 1
  const flipV = (lv & 2) === 2
  if (!flipH && !flipV) return base

  const mask = base.mask.map((row) => row.slice())
  if (flipH) {
    for (let r = 0; r < mask.length; r += 1) mask[r].reverse()
  }
  if (flipV) {
    mask.reverse()
  }
  return { rows: BOARD_CANVAS_SIZE, cols: BOARD_CANVAS_SIZE, mask }
}

/** Сколько активных клеток в маске (для масштабирования цели «собрать»). */
function countActive(mask) {
  let n = 0
  for (const row of mask) for (const v of row) if (v === 1) n += 1
  return n
}

function sumStoneHpGrid(grid) {
  let s = 0
  for (const row of grid) for (const v of row) s += v | 0
  return s
}

/**
 * Подложка-камень под фишкой: 1 слой = один удар совпадением/взрывом по клетке.
 * Детерминированно от seed уровня.
 */
export function buildInitialStoneHp(rows, cols, mask, seed, level) {
  const rng = createRng((seed + 0x6d2b79f5) >>> 0)
  /** @type {{ r: number, c: number }[]} */
  const active = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (mask && mask[r] && mask[r][c] === 0) continue
      active.push({ r, c })
    }
  }
  const p = 0.28 + (level % 6) * 0.028
  const grid = []
  for (let r = 0; r < rows; r += 1) {
    const row = []
    for (let c = 0; c < cols; c += 1) {
      if (mask && mask[r] && mask[r][c] === 0) row.push(0)
      else row.push(rng() < p ? 1 : 0)
    }
    grid.push(row)
  }
  let layers = sumStoneHpGrid(grid)
  const minSt =
    active.length === 0
      ? 0
      : level <= 3
        ? 3
        : Math.min(14, 5 + Math.floor(level / 3))
  if (active.length > 0 && layers < minSt) {
    for (let i = active.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1))
      const t = active[i]
      active[i] = active[j]
      active[j] = t
    }
    for (let i = 0; i < active.length && layers < minSt; i += 1) {
      const { r, c } = active[i]
      if (grid[r][c] === 0) {
        grid[r][c] = 1
        layers += 1
      }
    }
  }
  return grid
}

/**
 * Параметры уровня № `level` (1-индексированный). Полностью детерминированы по level.
 *
 * @param {number} level
 * @returns {{
 *   id: number,
 *   rows: number,
 *   cols: number,
 *   colors: number,
 *   moves: number,
 *   objective:
 *     | { type: 'collect', color: number, target: number }
 *     | { type: 'score', target: number },
 *   seed: number,
 *   stoneHpInitial: number[][],
 *   stonesTotalLayers: number,
 * }}
 */
export function getLevelConfig(level) {
  const lv = Math.max(1, Math.min(TOTAL_LEVELS, level | 0))
  const shape = getLevelShape(lv)
  const rows = shape.rows
  const cols = shape.cols
  const colors = lv <= 6 ? 5 : 6
  const moves = clamp(28 - Math.floor((lv - 1) / 2), 16, 28)
  const activeCells = countActive(shape.mask)
  const seed = lv * 9173 + 17
  const stoneHpInitial = buildInitialStoneHp(rows, cols, shape.mask, seed, lv)
  const stonesTotalLayers = sumStoneHpGrid(stoneHpInitial)

  let objective
  // Чередуем тип цели; цвет-цель в "collect" зависит от level (стабильно).
  if (lv % 3 === 0) {
    const target = 800 + lv * 350
    objective = { type: 'score', target }
  } else {
    const colorIdx = (lv * 7 + 3) % colors
    // Цель собрать масштабируется по доступной площади формы
    const baseTarget = 14 + Math.floor(lv * 1.6)
    const scale = Math.max(0.55, Math.min(1, activeCells / (BOARD_CANVAS_SIZE * BOARD_CANVAS_SIZE)))
    const target = clamp(Math.round(baseTarget * scale), 10, 42)
    objective = { type: 'collect', color: colorIdx, target }
  }

  return {
    id: lv,
    rows,
    cols,
    colors,
    moves,
    objective,
    seed,
    mask: shape.mask,
    stoneHpInitial,
    stonesTotalLayers,
  }
}

/**
 * Учебный уровень (первый запуск): фиксированная доска, без камней, с гарантированным ходом.
 * Используется UI-слоем (не включён в прогресс как отдельный id).
 */
export function getTutorialLevelConfig() {
  const rows = BOARD_CANVAS_SIZE
  const cols = BOARD_CANVAS_SIZE
  const mask = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 1))
  const colors = 5
  const moves = 12
  // Цель простая и наглядная
  const objective = { type: 'collect', color: 3, target: 6 } // "пончик"
  const seed = 1_234_567
  const stoneHpInitial = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0))

  // Обучающий ход: свайп из (2,1) вправо (dc=+1) — матч из трёх фишек цвета 3 (ряд r=2).
  // Цвета: 0..4
  const presetBoard = [
    [0, 1, 2, 3, 4, 1],
    [1, 2, 3, 4, 0, 2],
    // swap (2,1)<->(2,2) => три «3» подряд в колонках 2–4
    [2, 3, 1, 3, 3, 4],
    [4, 0, 2, 0, 2, 1],
    [3, 1, 4, 2, 0, 3],
    [1, 4, 0, 1, 4, 2],
  ]

  return {
    id: 1,
    rows,
    cols,
    colors,
    moves,
    objective,
    seed,
    mask,
    stoneHpInitial,
    stonesTotalLayers: 0,
    presetBoard,
    tutorial: true,
  }
}

export function buildLevelBoard(config) {
  const rng = createRng(config.seed)
  if (config && Array.isArray(config.presetBoard) && config.presetBoard.length) {
    return config.presetBoard.map((row) => row.slice())
  }
  return generateBoard(config.rows, config.cols, config.colors, rng, config.mask)
}

export function describeObjective(objective) {
  if (objective.type === 'score') {
    return `Набрать ${objective.target} очков`
  }
  const color = COLOR_PALETTE[objective.color]
  return `Собрать ${objective.target} × ${color?.label ?? 'фишек'}`
}

export function evaluateStars(level, result) {
  // 1★ — цель достигнута; +1★ если осталось >= 25% ходов; +1★ если >= 50%.
  if (!result.won) return 0
  const used = level.moves - result.movesLeft
  const leftRatio = result.movesLeft / level.moves
  if (used <= 0) return 3
  if (leftRatio >= 0.5) return 3
  if (leftRatio >= 0.25) return 2
  return 1
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
