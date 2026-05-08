<template>
  <div ref="wrapEl" class="m3board-wrap">
    <div
      ref="boardEl"
      class="m3board"
      :style="boardStyle"
      role="grid"
      :aria-rowcount="rows"
      :aria-colcount="cols"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <template v-for="(row, r) in board" :key="r">
        <div
          v-for="(cell, c) in row"
          :key="`${r}-${c}`"
          class="m3board__cell"
          :class="{
            'm3board__cell--hole': cell === BLOCKED,
            'm3board__cell--booster-target':
              boosterAim && cell !== BLOCKED && !hasStone(r, c),
          }"
          :data-m3-cell="`${r},${c}`"
          role="gridcell"
          :aria-rowindex="r + 1"
          :aria-colindex="c + 1"
        >
          <Match3Cell
            v-if="cell !== BLOCKED"
            :value="cell"
            :stone-layers="stoneHp[r]?.[c] ?? 0"
            :selected="!!selected && selected.r === r && selected.c === c"
            :matching="matchedKeys?.has(`${r},${c}`) || false"
            :spawning="spawnedKeys?.has(`${r},${c}`) || false"
            :drag-offset="getDragOffset(r, c)"
            :hint-shake="hintCellKey !== '' && hintCellKey === `${r},${c}`"
            :tutorial-highlight="
              (tutorialFromKey !== '' && tutorialFromKey === `${r},${c}`) ||
              (tutorialToKey !== '' && tutorialToKey === `${r},${c}`)
            "
            :tutorial-role="
              tutorialFromKey !== '' && tutorialFromKey === `${r},${c}`
                ? 'from'
                : tutorialToKey !== '' && tutorialToKey === `${r},${c}`
                  ? 'to'
                  : null
            "
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import Match3Cell from '@/components/match3/Match3Cell.vue'
import { BLOCKED } from '@/game/match3Engine.js'

const props = defineProps({
  board: { type: Array, required: true },
  /** Слои камня по [row][col], тот же размер что и доска */
  stoneHp: { type: Array, default: () => [] },
  selected: { type: Object, default: null },
  matchedKeys: { type: Set, default: () => new Set() },
  spawnedKeys: { type: Set, default: () => new Set() },
  disabled: { type: Boolean, default: false },
  /** "r,c" ячейки для подсказки (покачивание после бездействия). */
  hintCellKey: { type: String, default: '' },
  /** Учебник: подсветить конкретные клетки (ключ "r,c"). */
  tutorialFromKey: { type: String, default: '' },
  tutorialToKey: { type: String, default: '' },
  /** Режим прицеливания бустера — подсветка сетки до тапа по клетке */
  boosterAim: { type: Boolean, default: false },
})

const emit = defineEmits(['tap', 'swipe'])

const wrapEl = ref(null)
const boardEl = ref(null)
const rows = computed(() => props.board.length)
const cols = computed(() => (props.board[0]?.length ?? 0))

const cellPx = ref(0)
const boardScale = ref(1)
let ro = null

function recomputeLayout() {
  const wrap = wrapEl.value
  const board = boardEl.value
  const c = cols.value
  const r = rows.value
  if (!wrap || !board || !c || !r) return

  const wrapRect = wrap.getBoundingClientRect()
  const wrapCs = window.getComputedStyle(wrap)
  const padL = parseFloat(wrapCs.paddingLeft) || 0
  const padR = parseFloat(wrapCs.paddingRight) || 0
  const padT = parseFloat(wrapCs.paddingTop) || 0
  const padB = parseFloat(wrapCs.paddingBottom) || 0
  const availW = Math.max(0, wrapRect.width - padL - padR)
  const availH = Math.max(0, wrapRect.height - padT - padB)

  const boardCs = window.getComputedStyle(board)
  const gap = parseFloat(boardCs.gap) || 0

  // 1) Выбираем максимально возможный квадрат по ширине.
  const byW = (availW - gap * (c - 1)) / c
  const nextCell = Math.max(1, Math.floor(byW))
  cellPx.value = nextCell

  // 2) Если по высоте не помещается — уменьшаем масштабом (квадраты сохраняются).
  const needH = nextCell * r + gap * (r - 1)
  const scale = availH > 0 ? Math.min(1, availH / needH) : 1
  boardScale.value = Number.isFinite(scale) && scale > 0 ? scale : 1
}

onMounted(() => {
  recomputeLayout()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => recomputeLayout())
    if (wrapEl.value) ro.observe(wrapEl.value)
  } else {
    window.addEventListener('resize', recomputeLayout, { passive: true })
  }
})

onBeforeUnmount(() => {
  if (ro) {
    ro.disconnect()
    ro = null
  } else {
    window.removeEventListener('resize', recomputeLayout)
  }
})

const boardStyle = computed(() => {
  const c = cols.value
  const r = rows.value
  const s = cellPx.value
  if (!c || !r || !s) {
    return {
      gridTemplateColumns: `repeat(${c || 0}, 1fr)`,
      gridTemplateRows: `repeat(${r || 0}, 1fr)`,
    }
  }
  return {
    gridTemplateColumns: `repeat(${c}, ${s}px)`,
    gridTemplateRows: `repeat(${r}, ${s}px)`,
    width: 'fit-content',
    height: 'fit-content',
    transform: `scale(${boardScale.value})`,
    transformOrigin: 'center',
  }
})

/* === Drag state === */
const DRAG_THRESHOLD = 6 // px — после какого сдвига считаем, что начался драг
const COMMIT_RATIO = 0.35 // доля от ширины ячейки, после которой коммитим своп

const drag = reactive({
  /** @type {{ r: number, c: number, startX: number, startY: number, cellW: number, cellH: number } | null} */
  origin: null,
  /** @type {{ x: number, y: number }} */
  offset: { x: 0, y: 0 },
  /** @type {'h' | 'v' | null} */
  dir: null,
  pointerId: -1,
})

function getCellFromPoint(x, y) {
  const el = boardEl.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const cs = window.getComputedStyle(el)
  const padL = parseFloat(cs.paddingLeft) || 0
  const padR = parseFloat(cs.paddingRight) || 0
  const padT = parseFloat(cs.paddingTop) || 0
  const padB = parseFloat(cs.paddingBottom) || 0
  const innerW = rect.width - padL - padR
  const innerH = rect.height - padT - padB
  const cellW = innerW / cols.value
  const cellH = innerH / rows.value
  const lx = x - rect.left - padL
  const ly = y - rect.top - padT
  const c = Math.floor(lx / cellW)
  const r = Math.floor(ly / cellH)
  if (r < 0 || c < 0 || r >= rows.value || c >= cols.value) return null
  return { r, c, cellW, cellH }
}

function resetDrag() {
  drag.origin = null
  drag.offset = { x: 0, y: 0 }
  drag.dir = null
  drag.pointerId = -1
}

function hasStone(r, c) {
  return (props.stoneHp?.[r]?.[c] ?? 0) > 0
}

function onPointerDown(e) {
  if (props.disabled) return
  const cell = getCellFromPoint(e.clientX, e.clientY)
  if (!cell) return
  // Учебник: разрешаем взаимодействие только с указанными клетками.
  if (props.tutorialFromKey || props.tutorialToKey) {
    const key = `${cell.r},${cell.c}`
    if (key !== props.tutorialFromKey && key !== props.tutorialToKey) return
  }
  if (hasStone(cell.r, cell.c)) return
  drag.origin = {
    r: cell.r,
    c: cell.c,
    startX: e.clientX,
    startY: e.clientY,
    cellW: cell.cellW,
    cellH: cell.cellH,
  }
  drag.offset = { x: 0, y: 0 }
  drag.dir = null
  drag.pointerId = e.pointerId
  // pointer capture: события move/up придут даже если палец вышел за границы доски
  if (boardEl.value && typeof boardEl.value.setPointerCapture === 'function') {
    try {
      boardEl.value.setPointerCapture(e.pointerId)
    } catch {
      /* старые движки могут не поддерживать */
    }
  }
}

function onPointerMove(e) {
  if (!drag.origin || e.pointerId !== drag.pointerId) return
  const dx = e.clientX - drag.origin.startX
  const dy = e.clientY - drag.origin.startY
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (!drag.dir && Math.max(ax, ay) >= DRAG_THRESHOLD) {
    drag.dir = ax > ay ? 'h' : 'v'
  }
  if (drag.dir === 'h') {
    const max = drag.origin.cellW
    const sign = dx > 0 ? 1 : -1
    // Не даём «улететь» за границу поля
    const blockedByEdge =
      (sign > 0 && drag.origin.c + 1 >= cols.value) ||
      (sign < 0 && drag.origin.c - 1 < 0)
    const blockedByStone = hasStone(drag.origin.r, drag.origin.c + sign)
    const limit = blockedByStone ? 0 : blockedByEdge ? max * 0.18 : max
    drag.offset = { x: clamp(dx, -limit, limit), y: 0 }
  } else if (drag.dir === 'v') {
    const max = drag.origin.cellH
    const sign = dy > 0 ? 1 : -1
    const blockedByEdge =
      (sign > 0 && drag.origin.r + 1 >= rows.value) ||
      (sign < 0 && drag.origin.r - 1 < 0)
    const blockedByStone = hasStone(drag.origin.r + sign, drag.origin.c)
    const limit = blockedByStone ? 0 : blockedByEdge ? max * 0.18 : max
    drag.offset = { x: 0, y: clamp(dy, -limit, limit) }
  }
}

function onPointerUp(e) {
  if (!drag.origin || e.pointerId !== drag.pointerId) return
  const origin = drag.origin
  const dir = drag.dir
  const offset = { ...drag.offset }
  resetDrag()

  if (!dir) {
    // Просто тап без сдвига
    emit('tap', { r: origin.r, c: origin.c })
    return
  }
  const ratio =
    dir === 'h' ? offset.x / origin.cellW : offset.y / origin.cellH
  if (Math.abs(ratio) < COMMIT_RATIO) {
    // Не дотащил — отпустить и вернуть на место (CSS-transition ячейки)
    return
  }
  const sign = ratio > 0 ? 1 : -1
  // Проверка границ: если соседа нет — отмена
  if (dir === 'h') {
    const target = origin.c + sign
    if (target < 0 || target >= cols.value) return
    if (hasStone(origin.r, target)) return
    emit('swipe', { r: origin.r, c: origin.c, dr: 0, dc: sign })
  } else {
    const target = origin.r + sign
    if (target < 0 || target >= rows.value) return
    if (hasStone(target, origin.c)) return
    emit('swipe', { r: origin.r, c: origin.c, dr: sign, dc: 0 })
  }
}

function onPointerCancel(e) {
  if (e.pointerId !== drag.pointerId) return
  resetDrag()
}

/* Сосед, который «уезжает» навстречу перетаскиваемой фишке. */
const neighborTarget = computed(() => {
  if (!drag.origin || !drag.dir) return null
  const o = drag.origin
  const off = drag.offset
  if (drag.dir === 'h') {
    if (off.x === 0) return null
    const nc = off.x > 0 ? o.c + 1 : o.c - 1
    if (nc < 0 || nc >= cols.value) return null
    if (hasStone(o.r, nc)) return null
    return { r: o.r, c: nc, offset: { x: -off.x, y: 0 } }
  }
  if (drag.dir === 'v') {
    if (off.y === 0) return null
    const nr = off.y > 0 ? o.r + 1 : o.r - 1
    if (nr < 0 || nr >= rows.value) return null
    if (hasStone(nr, o.c)) return null
    return { r: nr, c: o.c, offset: { x: 0, y: -off.y } }
  }
  return null
})

function getDragOffset(r, c) {
  if (drag.origin && drag.origin.r === r && drag.origin.c === c) {
    return drag.offset
  }
  const n = neighborTarget.value
  if (n && n.r === r && n.c === c) {
    return n.offset
  }
  return null
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

/** Центр группы совпавших клеток в координатах viewport (летающие монетки к счёту). */
function getMatchCentroidScreen(keySet) {
  const elBoard = boardEl.value
  if (!elBoard || !keySet) return null
  let sx = 0
  let sy = 0
  let n = 0
  for (const k of keySet) {
    const cell = elBoard.querySelector(`[data-m3-cell="${k}"]`)
    if (!cell) continue
    const b = cell.getBoundingClientRect()
    sx += b.left + b.width / 2
    sy += b.top + b.height / 2
    n += 1
  }
  if (!n) return null
  return { x: sx / n, y: sy / n }
}

function getCellCenterScreen(r, c) {
  const elBoard = boardEl.value
  if (!elBoard) return null
  const cell = elBoard.querySelector(`[data-m3-cell="${r},${c}"]`)
  if (!cell) return null
  const b = cell.getBoundingClientRect()
  return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height }
}

defineExpose({ getMatchCentroidScreen, getCellCenterScreen })
</script>

<style scoped>
.m3board-wrap {
  width: 100%;
  max-height: 100%;
  padding: 0.1rem;
  box-sizing: border-box;
}

.m3board {
  display: grid;
  max-height: 100%;
  /* aspect-ratio задаётся динамически через :style и зависит от формы уровня */
  gap: 0;
  border-radius: 18px;
  background: transparent;
  box-sizing: border-box;
  /* Жесты только наши; браузерный скролл/zoom не должен мешать драгу */
  touch-action: none;
  user-select: none;
}

/* Совпадает с границей «стеклянной» плитки .m3cell::before (inset 4%, radius 14%), без вылета за ячейку */
.m3board__cell--booster-target::after {
  content: '';
  position: absolute;
  inset: 4%;
  border-radius: 14%;
  box-sizing: border-box;
  border: 2px solid rgba(255, 220, 100, 0.95);
  pointer-events: none;
  z-index: 4;
  animation: m3cell-booster-ring 1.15s ease-in-out infinite;
}

@keyframes m3cell-booster-ring {
  0%,
  100% {
    border-color: rgba(255, 210, 88, 0.92);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  }
  50% {
    border-color: rgba(255, 245, 170, 1);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.45),
      0 0 5px rgba(255, 195, 70, 0.45);
  }
}

.m3board__cell {
  position: relative;
  border-radius: 10px;
  /* Не клипуем — иначе пульс/glow и драг обрезаются на границе ячейки */
  overflow: visible;
}

.m3board__cell--hole {
  background: transparent;
  pointer-events: none;
}
</style>
