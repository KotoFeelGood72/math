import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  buildLevelBoard,
  evaluateStars,
  getLevelConfig,
  getTutorialLevelConfig,
} from '@/game/levelGenerator.js'
import {
  BLOCKED,
  EMPTY,
  allBoardCells,
  applyGravity,
  cloneBoard,
  collectBomb3x3Cells,
  collectColorCells,
  decideSpecialsFromMatches,
  expandSpecials,
  findMatches,
  getColor,
  getKind,
  hasAnyMove,
  inside,
  isAdjacent,
  isRainbow,
  isSpecial,
  pickMostCommonColor,
  placeSpecial,
  refill,
  removeCells,
  reshuffleBoardPreservingPieces,
  swap as swapBoard,
} from '@/game/match3Engine.js'
import { createRng } from '@/game/rng.js'
import { inferClearFx } from '@/game/inferClearFx.js'
import { useMatch3ProgressStore } from '@/stores/match3Progress.js'
import { useMatch3StatsStore } from '@/stores/match3Stats.js'

const SWAP_INVALID_MS = 160
const MATCH_FLASH_MS = 280
const SPAWN_MS = 320
/** Если стек отката пуст — бустер «время» даёт доп. ходы вместо отмены хода. */
const CLOCK_EXTRA_MOVES_WHEN_NO_UNDO = 3
/** Перемешивание при «нет ходов» за монеты (см. модалку на экране игры). */
export const NO_MOVES_SHUFFLE_COIN_COST = 35

export const useMatch3GameStore = defineStore('match3-game', () => {
  /** @type {import('vue').Ref<ReturnType<typeof getLevelConfig> | null>} */
  const config = ref(null)
  /** @type {import('vue').Ref<number[][]>} */
  const board = ref([])
  /** Слои камня под фишкой по координатам доски (0 = нет). */
  /** @type {import('vue').Ref<number[][]>} */
  const stoneHp = ref([])
  /** @type {import('vue').Ref<{ r: number, c: number } | null>} */
  const selected = ref(null)
  const score = ref(0)
  const movesLeft = ref(0)
  const collected = ref(0)
  const status = ref('idle')
  /** @type {import('vue').Ref<'moves' | 'surrender' | null>} — зачем проигрыш (модалка / сразу к результату). */
  const lostReason = ref(null)
  const stars = ref(0)
  const coinsEarned = ref(0)
  const isBusy = ref(false)
  const lastCascadeCount = ref(0)
  const matchedKeys = ref(new Set())
  /** Визуальный эффект очередной волны очистки (молнии / лучи). */
  const clearFx = ref(null)
  const spawnedKeys = ref(new Set())
  const lastUserSwap = ref(null)
  /** Бесплатное перемешивание при «нет ходов» — не более одного за уровень. */
  const noMovesFreeShuffleUsed = ref(false)

  /** Снимки для отката хода (макс. 3 последних хода с бустерами). */
  /** @type {import('vue').Ref<object[]>} */
  const undoStack = ref([])
  const boosterBomb = ref(3)
  const boosterClock = ref(3)
  const boosterStar = ref(3)

  let rng = createRng(1)

  const objective = computed(() => config.value?.objective ?? null)

  const objectiveProgress = computed(() => {
    const obj = objective.value
    if (!obj) return { current: 0, target: 0, ratio: 0 }
    if (obj.type === 'score') {
      return {
        current: score.value,
        target: obj.target,
        ratio: Math.min(1, score.value / obj.target),
      }
    }
    return {
      current: collected.value,
      target: obj.target,
      ratio: Math.min(1, collected.value / obj.target),
    }
  })

  const stoneProgress = computed(() => {
    const target = config.value?.stonesTotalLayers ?? 0
    if (target <= 0) {
      return { broken: 0, target: 0, remaining: 0, ratio: 1 }
    }
    let rem = 0
    for (const row of stoneHp.value) {
      for (const v of row) rem += v | 0
    }
    const broken = Math.max(0, target - rem)
    return {
      broken,
      target,
      remaining: rem,
      ratio: Math.min(1, broken / target),
    }
  })

  function isStoneCell(r, c) {
    return (stoneHp.value?.[r]?.[c] ?? 0) > 0
  }

  function startLevel(levelId, opts = null) {
    const useTutorial = !!opts?.tutorial
    const cfg = useTutorial ? getTutorialLevelConfig() : getLevelConfig(levelId)
    config.value = cfg
    rng = createRng(cfg.seed ^ Date.now())
    const stones = cfg.stoneHpInitial.map((row) => row.slice())
    let built = buildLevelBoard(cfg)
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (hasAnyMove(built, stones)) break
      built = buildLevelBoard({
        ...cfg,
        seed: (cfg.seed ^ (attempt + 1) * 0x9e3779b9) >>> 0,
      })
    }
    board.value = built
    stoneHp.value = stones
    selected.value = null
    score.value = 0
    movesLeft.value = cfg.moves
    collected.value = 0
    status.value = 'playing'
    lostReason.value = null
    stars.value = 0
    coinsEarned.value = 0
    isBusy.value = false
    lastCascadeCount.value = 0
    matchedKeys.value = new Set()
    clearFx.value = null
    spawnedKeys.value = new Set()
    lastUserSwap.value = null
    noMovesFreeShuffleUsed.value = false
    useMatch3StatsStore().noteLevelStarted()
    undoStack.value = []
    const extra = useTutorial
      ? { bomb: 0, clock: 0, star: 0 }
      : useMatch3ProgressStore().pullBoostersForLevel()
    const progress = useMatch3ProgressStore()
    const basePerKind = useTutorial ? 3 : progress.takePlayBoosterBasePerKind()
    boosterBomb.value = basePerKind + extra.bomb
    boosterClock.value = basePerKind + extra.clock
    boosterStar.value = basePerKind + extra.star
  }

  function pushUndoSnapshot() {
    const snap = {
      board: cloneBoard(board.value),
      stoneHp: stoneHp.value.map((row) => row.slice()),
      score: score.value,
      movesLeft: movesLeft.value,
      collected: collected.value,
      boosterBomb: boosterBomb.value,
      boosterClock: boosterClock.value,
      boosterStar: boosterStar.value,
    }
    const u = [...undoStack.value, snap]
    undoStack.value = u.length > 3 ? u.slice(-3) : u
  }

  function restoreFromUndoSnapshot(snap) {
    board.value = cloneBoard(snap.board)
    stoneHp.value = snap.stoneHp.map((row) => row.slice())
    score.value = snap.score
    movesLeft.value = snap.movesLeft
    collected.value = snap.collected
    boosterBomb.value = snap.boosterBomb
    boosterClock.value = snap.boosterClock
    boosterStar.value = snap.boosterStar
    matchedKeys.value = new Set()
    clearFx.value = null
    spawnedKeys.value = new Set()
    selected.value = null
  }

  async function tapCell(r, c) {
    if (status.value !== 'playing' || isBusy.value) return
    if (board.value[r]?.[c] === BLOCKED) {
      selected.value = null
      return
    }
    if (isStoneCell(r, c)) {
      selected.value = null
      return
    }
    const target = { r, c }
    if (!selected.value) {
      selected.value = target
      return
    }
    if (selected.value.r === r && selected.value.c === c) {
      selected.value = null
      return
    }
    if (!isAdjacent(selected.value, target)) {
      selected.value = target
      return
    }
    const a = selected.value
    selected.value = null
    await attemptSwap(a, target)
  }

  async function swipe(r, c, dr, dc) {
    if (status.value !== 'playing' || isBusy.value) return
    const a = { r, c }
    const b = { r: r + dr, c: c + dc }
    if (
      b.r < 0 ||
      b.c < 0 ||
      b.r >= board.value.length ||
      b.c >= board.value[0].length
    ) {
      return
    }
    if (
      board.value[a.r]?.[a.c] === BLOCKED ||
      board.value[b.r]?.[b.c] === BLOCKED
    ) {
      return
    }
    if (isStoneCell(a.r, a.c) || isStoneCell(b.r, b.c)) {
      return
    }
    selected.value = null
    await attemptSwap(a, b)
  }

  async function attemptSwap(a, b) {
    if (!isAdjacent(a, b)) return
    if (isStoneCell(a.r, a.c) || isStoneCell(b.r, b.c)) return
    isBusy.value = true
    const stats = useMatch3StatsStore()
    const aVal = board.value[a.r][a.c]
    const bVal = board.value[b.r][b.c]

    // === RAINBOW: своп с радужной активирует её сразу, без поиска матчей ===
    if (isRainbow(aVal) || isRainbow(bVal)) {
      lastUserSwap.value = { a: { ...a }, b: { ...b } }
      const rainbowPos = isRainbow(aVal) ? a : b
      const otherPos = isRainbow(aVal) ? b : a
      const otherVal = isRainbow(aVal) ? bVal : aVal

      pushUndoSnapshot()
      // Делаем своп визуально, чтобы радуга «попала» в ячейку и затем взорвалась
      board.value = swapBoard(board.value, a, b)
      movesLeft.value -= 1
      stats.addMove()
      stats.noteSpecialUsed('rainbow')

      let initial
      if (isRainbow(otherVal)) {
        initial = allBoardCells(board.value)
      } else {
        initial = collectColorCells(board.value, getColor(otherVal))
        // обязательно чистим саму радугу
        initial.add(`${rainbowPos.r},${rainbowPos.c}`)
        initial.add(`${otherPos.r},${otherPos.c}`)
      }
      await runCascadesFromInitialClear(initial)
      afterTurn()
      isBusy.value = false
      return
    }

    // === Обычный своп ===
    const swapped = swapBoard(board.value, a, b)
    const matches = findMatches(swapped, stoneHp.value)
    // Если бустер «попал» в существующий матч цвета — это уже учтено в matches.
    // Если своп никаких матчей не даёт и не задействует бустер — отскок.
    if (matches.length === 0) {
      board.value = swapped
      await wait(SWAP_INVALID_MS)
      board.value = swapBoard(swapped, a, b)
      isBusy.value = false
      return
    }
    lastUserSwap.value = { a: { ...a }, b: { ...b } }
    pushUndoSnapshot()
    board.value = swapped
    movesLeft.value -= 1
    stats.addMove()
    // triggerPos — куда пользователь «дотянул» фишку (вторая клетка свопа)
    await runCascades(b)
    afterTurn()
    isBusy.value = false
  }

  /** Каскад, начатый радугой/иной активацией: без поиска матчей на первом шаге. */
  async function runCascadesFromInitialClear(initialClearSet) {
    const stats = useMatch3StatsStore()
    const cfg = config.value
    if (!cfg) return

    // Шаг 1 — раскрыть бустеры внутри стартового набора
    const expandedOnce = expandSpecials(board.value, initialClearSet)
    clearFx.value = inferClearFx(board.value, expandedOnce)
    matchedKeys.value = new Set(expandedOnce)
    await wait(MATCH_FLASH_MS)
    const expanded = expandedOnce
    // Снять подсветку до смены доски: иначе новые фишки наследуют «matching» и
    // остаются с opacity:0 после завершения m3-pulse (280ms).
    matchedKeys.value = new Set()
    await applyClearedAndRefill(expanded, cfg, /* triggerPos */ null, /* createSpecials */ [])
    matchedKeys.value = new Set()
    clearFx.value = null

    // Дальше — обычные каскады
    await runCascades(null, /* skipFirstFlash */ false)
    void stats
  }

  async function runCascades(triggerPos, _skip = false) {
    const stats = useMatch3StatsStore()
    const cfg = config.value
    if (!cfg) return

    let cascades = 0
    let chainTrigger = triggerPos

    while (true) {
      const groups = findMatches(board.value, stoneHp.value)
      if (groups.length === 0) break

      // 1) подсветить совпадения
      const baseSet = new Set()
      for (const g of groups) for (const k of g.cells) baseSet.add(k)
      // включить и активацию бустеров, попавших в базовый набор
      const expanded = expandSpecials(board.value, baseSet)
      clearFx.value = inferClearFx(board.value, expanded)
      matchedKeys.value = new Set(expanded)

      await wait(MATCH_FLASH_MS)
      matchedKeys.value = new Set()

      // 2) определить, какие бустеры создаются по форме матчей
      const specialsToCreate = decideSpecialsFromMatches(
        board.value,
        groups,
        chainTrigger,
      )
      // удалить ячейки + поставить новые бустеры на место триггеров
      await applyClearedAndRefill(expanded, cfg, chainTrigger, specialsToCreate)
      matchedKeys.value = new Set()
      clearFx.value = null

      for (const sp of specialsToCreate) stats.noteSpecialCreated(sp.kind)
      const maxGroup = groups.reduce((m, g) => Math.max(m, g.cells.size), 0)
      stats.noteCombo(maxGroup)
      cascades += 1
      chainTrigger = null
    }

    lastCascadeCount.value = cascades
    stats.noteCascade(cascades)

    if (!hasAnyMove(board.value, stoneHp.value)) {
      status.value = 'no_moves'
    }
  }

  /** Внутренняя перестройка доски при тупике (раньше вызывалась автоматически из runCascades). */
  async function applyDeadlockBoardFix() {
    const cfg = config.value
    if (!cfg) return
    await wait(220)
    const shuffled = reshuffleBoardPreservingPieces(
      board.value,
      stoneHp.value,
      rng,
    )
    if (shuffled) {
      board.value = shuffled
      return
    }
    let rebuilt = board.value
    for (let i = 0; i < 48; i += 1) {
      rebuilt = buildLevelBoard({
        ...cfg,
        seed: (cfg.seed ^ Date.now() ^ (i * 0x9e3779b9)) >>> 0,
      })
      if (hasAnyMove(rebuilt, stoneHp.value)) break
    }
    board.value = rebuilt
  }

  async function resolveNoMovesShuffleFree() {
    if (status.value !== 'no_moves' || noMovesFreeShuffleUsed.value) return false
    await applyDeadlockBoardFix()
    noMovesFreeShuffleUsed.value = true
    status.value = 'playing'
    selected.value = null
    matchedKeys.value = new Set()
    clearFx.value = null
    spawnedKeys.value = new Set()
    return true
  }

  async function resolveNoMovesShuffleForCoins() {
    if (status.value !== 'no_moves') return false
    const progress = useMatch3ProgressStore()
    if (!progress.trySpendCoins(NO_MOVES_SHUFFLE_COIN_COST)) return false
    await applyDeadlockBoardFix()
    status.value = 'playing'
    selected.value = null
    matchedKeys.value = new Set()
    clearFx.value = null
    spawnedKeys.value = new Set()
    return true
  }

  /** Rewarded: +ходы и перестройка, иначе игрок снова без ходов. */
  async function resolveNoMovesAfterRewardedAd(delta) {
    if (status.value !== 'no_moves') return false
    const n = Math.max(1, delta | 0)
    movesLeft.value += n
    await applyDeadlockBoardFix()
    status.value = 'playing'
    selected.value = null
    matchedKeys.value = new Set()
    clearFx.value = null
    spawnedKeys.value = new Set()
    return true
  }

  function resolveNoMovesSurrender() {
    if (status.value !== 'no_moves') return false
    lostReason.value = 'surrender'
    stars.value = 0
    coinsEarned.value = 0
    status.value = 'lost'
    return true
  }

  /**
   * Удалить ячейки, начислить очки/цели, поставить бустеры, гравитация+доспавн.
   * Анимация спавна проигрывается классом spawning у новых ячеек.
   */
  async function applyClearedAndRefill(cellSet, cfg, triggerPos, specialsToCreate) {
    const stats = useMatch3StatsStore()

    // Не удаляем те ячейки, на которые сразу же поставим бустер — иначе
    // визуально фишка исчезнет и появится «новая», что менее наглядно.
    const protectedKeys = new Set()
    for (const sp of specialsToCreate) {
      protectedKeys.add(`${sp.pos.r},${sp.pos.c}`)
    }
    const toClear = new Set()
    for (const k of cellSet) if (!protectedKeys.has(k)) toClear.add(k)

    applyStoneDamage(toClear)

    const { board: cleared, removedByColor, totalRemoved } = removeCells(
      board.value,
      toClear,
    )

    // На месте бустера — заменяем содержимое ячейки на спецзначение
    let nextBoard = cleared
    for (const sp of specialsToCreate) {
      nextBoard = placeSpecial(nextBoard, sp.pos, sp.kind, sp.color)
    }
    board.value = nextBoard

    // Очки и цели
    const removedCount = totalRemoved
    let earned = removedCount * 10
    if (specialsToCreate.length > 0) earned += specialsToCreate.length * 60
    score.value += earned
    stats.addScore(earned)
    stats.addMatches(removedCount)
    if (cfg.objective.type === 'collect') {
      const got = removedByColor.get(cfg.objective.color) || 0
      collected.value += got
    }

    // Гравитация + доспавн
    const beforeGrav = nextBoard
    const gravBoard = applyGravity(beforeGrav)
    const refilled = refill(gravBoard, cfg.colors, rng)
    const spawnSet = new Set()
    for (let r = 0; r < refilled.length; r += 1) {
      for (let c = 0; c < refilled[0].length; c += 1) {
        if (beforeGrav[r][c] === EMPTY && refilled[r][c] !== EMPTY) {
          spawnSet.add(`${r},${c}`)
        }
      }
    }
    // Помечаем созданные бустеры тоже как «появившиеся», чтобы анимация привлекла внимание
    for (const sp of specialsToCreate) {
      spawnSet.add(`${sp.pos.r},${sp.pos.c}`)
    }
    board.value = refilled
    spawnedKeys.value = spawnSet
    await wait(SPAWN_MS)
    spawnedKeys.value = new Set()
    // triggerPos больше не используется — оставлено для совместимости
    void triggerPos
  }

  function applyStoneDamage(clearSet) {
    const sh = stoneHp.value
    if (!sh.length) return
    const rows = sh.length
    const cols = sh[0].length
    const next = sh.map((row) => row.slice())
    const damaged = new Set()
    const OFFSETS = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]
    for (const k of clearSet) {
      const [r, c] = k.split(',').map((s) => parseInt(s, 10))
      if (!Number.isFinite(r) || !Number.isFinite(c)) continue
      for (const [dr, dc] of OFFSETS) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue
        const key = `${nr},${nc}`
        if (damaged.has(key)) continue
        if (next[nr][nc] > 0) {
          next[nr][nc] -= 1
          damaged.add(key)
        }
      }
    }
    stoneHp.value = next
  }

  function afterTurn() {
    const cfg = config.value
    if (!cfg) return
    const obj = cfg.objective

    const stonesDone =
      (cfg.stonesTotalLayers ?? 0) <= 0 ||
      stoneProgress.value.remaining <= 0

    let mainDone = false
    if (obj.type === 'score') mainDone = score.value >= obj.target
    else mainDone = collected.value >= obj.target

    const won = stonesDone && mainDone

    if (won) {
      lostReason.value = null
      status.value = 'won'
      stars.value = evaluateStars(cfg, {
        won: true,
        movesLeft: movesLeft.value,
        score: score.value,
      })
      // Награда: монеты = звёзды × 25 + ~10% от очков
      coinsEarned.value = stars.value * 25 + Math.floor(score.value / 10)
      const stats = useMatch3StatsStore()
      stats.noteLevelWon(score.value)
      const progress = useMatch3ProgressStore()
      progress.recordResult(cfg.id, stars.value, score.value)
      progress.addCoins(coinsEarned.value)
      if (cfg.id === 1) {
        progress.markTutorialDone()
      }
      return
    }
    if (movesLeft.value <= 0) {
      lostReason.value = 'moves'
      status.value = 'lost'
      stars.value = 0
      coinsEarned.value = 0
    }
  }

  function wait(ms) {
    return new Promise((res) => setTimeout(res, ms))
  }

  function useClockBooster() {
    if (status.value !== 'playing' || isBusy.value) return false
    if (boosterClock.value <= 0) return false
    isBusy.value = true

    if (undoStack.value.length === 0) {
      boosterClock.value -= 1
      movesLeft.value += CLOCK_EXTRA_MOVES_WHEN_NO_UNDO
      isBusy.value = false
      return true
    }

    const snap = undoStack.value.pop()
    if (!snap) {
      isBusy.value = false
      return false
    }
    restoreFromUndoSnapshot(snap)
    // Снимок был до хода — в нём старое число часов; один бустер уже потрачен на откат.
    boosterClock.value = Math.max(0, snap.boosterClock - 1)
    isBusy.value = false
    return true
  }

  async function applyBombBooster(r, c) {
    if (status.value !== 'playing' || isBusy.value) return false
    if (boosterBomb.value <= 0) return false
    if (!inside(board.value, r, c)) return false
    if (board.value[r][c] === BLOCKED) return false
    const cfg = config.value
    if (!cfg) return false
    const initial = collectBomb3x3Cells(board.value, r, c)
    if (initial.size === 0) return false
    const stats = useMatch3StatsStore()
    isBusy.value = true
    pushUndoSnapshot()
    boosterBomb.value -= 1
    movesLeft.value -= 1
    stats.addMove()
    selected.value = null
    await runCascadesFromInitialClear(initial)
    afterTurn()
    isBusy.value = false
    return true
  }

  async function applyStarBooster(r, c) {
    if (status.value !== 'playing' || isBusy.value) return false
    if (boosterStar.value <= 0) return false
    if (!inside(board.value, r, c)) return false
    if (board.value[r][c] === BLOCKED || board.value[r][c] === EMPTY) {
      return false
    }
    const cfg = config.value
    if (!cfg) return false
    let color = getColor(board.value[r][c])
    if (color < 0) {
      color = pickMostCommonColor(board.value)
    }
    if (color < 0) return false
    const initial = collectColorCells(board.value, color)
    if (initial.size === 0) return false
    const stats = useMatch3StatsStore()
    isBusy.value = true
    pushUndoSnapshot()
    boosterStar.value -= 1
    movesLeft.value -= 1
    stats.addMove()
    selected.value = null
    await runCascadesFromInitialClear(initial)
    afterTurn()
    isBusy.value = false
    return true
  }

  /** Дополнительные ходы (награда за рекламу и т.п.). */
  function grantBonusMoves(delta) {
    if (status.value !== 'playing') return false
    const n = Math.max(1, delta | 0)
    movesLeft.value += n
    return true
  }

  const BOOSTER_MAX_FROM_ADS = 9

  /** +1 к выбранному бустеру после rewarded (не выше потолка). */
  function grantBoosterFromRewardAd(kind) {
    if (status.value !== 'playing') return false
    const cap = BOOSTER_MAX_FROM_ADS
    if (kind === 'bomb') {
      boosterBomb.value = Math.min(cap, boosterBomb.value + 1)
      return true
    }
    if (kind === 'clock') {
      boosterClock.value = Math.min(cap, boosterClock.value + 1)
      return true
    }
    if (kind === 'star') {
      boosterStar.value = Math.min(cap, boosterStar.value + 1)
      return true
    }
    return false
  }

  /** После «нет ходов»: вернуть статус игры и добавить ходы (rewarded). */
  function resumeAfterLossWithMoves(delta) {
    if (status.value !== 'lost') return false
    const n = Math.max(1, delta | 0)
    lostReason.value = null
    status.value = 'playing'
    movesLeft.value += n
    selected.value = null
    matchedKeys.value = new Set()
    clearFx.value = null
    spawnedKeys.value = new Set()
    return true
  }

  function quit() {
    status.value = 'idle'
    lostReason.value = null
    noMovesFreeShuffleUsed.value = false
    config.value = null
    board.value = []
    stoneHp.value = []
    selected.value = null
    score.value = 0
    movesLeft.value = 0
    collected.value = 0
    coinsEarned.value = 0
    isBusy.value = false
    matchedKeys.value = new Set()
    clearFx.value = null
    spawnedKeys.value = new Set()
    undoStack.value = []
  }

  return {
    config,
    board,
    stoneHp,
    selected,
    score,
    movesLeft,
    collected,
    status,
    lostReason,
    stars,
    coinsEarned,
    isBusy,
    lastCascadeCount,
    matchedKeys,
    clearFx,
    spawnedKeys,
    lastUserSwap,
    noMovesFreeShuffleUsed,
    boosterBomb,
    boosterClock,
    boosterStar,
    objective,
    objectiveProgress,
    stoneProgress,
    startLevel,
    tapCell,
    swipe,
    useClockBooster,
    applyBombBooster,
    applyStarBooster,
    grantBonusMoves,
    grantBoosterFromRewardAd,
    resumeAfterLossWithMoves,
    resolveNoMovesShuffleFree,
    resolveNoMovesShuffleForCoins,
    resolveNoMovesAfterRewardedAd,
    resolveNoMovesSurrender,
    quit,
  }
})

// Хелперы экспортируются на случай использования в шаблонах
export { isSpecial, isRainbow, getKind, getColor }
