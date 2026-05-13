/**
 * Проверка: у каждого уровня стартовая доска без мгновенного матча и с ≥1 допустимым ходом.
 * Запуск из корня: node scripts/verify-match3-levels.mjs
 */
import { getLevelConfig, buildLevelBoard, TOTAL_LEVELS } from '../src/game/levelGenerator.js'
import { hasAnyMove, findMatches } from '../src/game/match3Engine.js'

const signatures = new Map()
let failed = false

for (let lv = 1; lv <= TOTAL_LEVELS; lv += 1) {
  const cfg = getLevelConfig(lv)
  const board = buildLevelBoard(cfg)
  const sig = board.map((row) => row.join(',')).join('|')

  const prev = signatures.get(sig)
  if (prev !== undefined) {
    console.warn(`[warn] одинаковая стартовая доска: уровни ${prev} и ${lv}`)
  } else {
    signatures.set(sig, lv)
  }

  if (findMatches(board, cfg.stoneHpInitial).length > 0) {
    console.error(`[fail] уровень ${lv}: есть стартовый матч`)
    failed = true
  }
  if (!hasAnyMove(board, cfg.stoneHpInitial)) {
    console.error(`[fail] уровень ${lv}: нет ни одного хода`)
    failed = true
  }
}

if (failed) process.exit(1)
console.log(
  `OK: ${TOTAL_LEVELS} уровней, уникальных стартовых досок: ${signatures.size}`,
)
