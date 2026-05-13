/**
 * Подбирает [stoneSalt, gemSkew] для каждого уровня (детерминированный playable старт).
 * Запуск из корня: node scripts/compute-level-pack.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRng } from '../src/game/rng.js'
import {
  TOTAL_LEVELS,
  getLevelShape,
  buildInitialStoneHp,
} from '../src/game/levelGenerator.js'
import { generateBoard, hasAnyMove, findMatches } from '../src/game/match3Engine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function baseSeedForLevel(lv) {
  return lv <= 30
    ? lv * 9173 + 17
    : (lv * 9173 + 17 + ((lv * lv) >>> 0) % 1_000_003 + lv * 0x9e3779b1) >>> 0
}

function boardOk(board, stoneHp) {
  return findMatches(board, stoneHp).length === 0 && hasAnyMove(board, stoneHp)
}

function findPack(lv) {
  const shape = getLevelShape(lv)
  const rows = shape.rows
  const cols = shape.cols
  const colors = lv <= 6 ? 5 : 6
  const seed = baseSeedForLevel(lv)
  const maxStoneSalt = 500
  const maxGemSkew = 2500
  for (let stoneSalt = 0; stoneSalt < maxStoneSalt; stoneSalt += 1) {
    const stoneRngSeed = (seed + stoneSalt * 0x3c6ef372) >>> 0
    const stoneHpInitial = buildInitialStoneHp(rows, cols, shape.mask, stoneRngSeed, lv)
    for (let gemSkew = 0; gemSkew < maxGemSkew; gemSkew += 1) {
      const rng = createRng((seed + gemSkew * 0x7f4a7c15) >>> 0)
      const board = generateBoard(rows, cols, colors, rng, shape.mask, stoneHpInitial)
      if (boardOk(board, stoneHpInitial)) {
        return [stoneSalt, gemSkew]
      }
    }
  }
  return null
}

/** @type {number[][]} */
const packs = []
for (let lv = 1; lv <= TOTAL_LEVELS; lv += 1) {
  const p = findPack(lv)
  if (!p) {
    console.error(`[fatal] level ${lv}: no pack`)
    process.exit(1)
  }
  if (p[0] !== 0 || p[1] !== 0) console.error(`level ${lv} pack [stoneSalt=${p[0]}, gemSkew=${p[1]}]`)
  packs.push(p)
}

const out = `/**\n * Пара [stoneSalt, gemSkew] на уровень (индекс 0 = уровень 1).\n * Пересчёт: node scripts/compute-level-pack.mjs\n */\nexport const LEVEL_PACK_SEEDS = ${JSON.stringify(packs)}\n`
writeFileSync(join(__dirname, '../src/game/levelPackSeeds.js'), out, 'utf8')
console.error(`written src/game/levelPackSeeds.js (${TOTAL_LEVELS} levels)`)
