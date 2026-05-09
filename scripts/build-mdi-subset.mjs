/**
 * Собирает только используемые в проекте MDI-иконки в один лёгкий Iconify JSON.
 * Запуск: node scripts/build-mdi-subset.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const mdiPath = join(root, 'node_modules/@iconify-json/mdi/icons.json')
const outDir = join(root, 'src/iconify')
const outPath = join(outDir, 'mdiSubset.json')

/** Имена без префикса mdi — должны совпадать с вызовами Icon в коде */
const NEEDED = [
  'cog',
  'star',
  'cash',
  'gamepad-variant',
  'map-outline',
  'help-circle-outline',
  'chevron-left',
  'pause',
  'foot-print',
  'movie-open-play',
  'menu',
  'play',
  'rocket',
  'bomb',
  'lock',
  'chevron-right',
  'volume-off',
  'volume-high',
  'check-decagram',
  'replay',
  'check',
  'sword',
  'shield',
  'crown-outline',
  'diamond-stone',
  'key',
  'crystal-ball',
  'script-text-outline',
  'trumpet',
  'star-four-points-outline',
  'gift-outline',
  'necklace',
]

const full = JSON.parse(readFileSync(mdiPath, 'utf8'))
const icons = {}
for (const name of NEEDED) {
  if (!full.icons[name]) {
    console.warn(`[build-mdi-subset] нет иконки mdi:${name}`)
    continue
  }
  icons[name] = full.icons[name]
}

const subset = {
  prefix: full.prefix,
  icons,
  width: full.width,
  height: full.height,
}

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, `${JSON.stringify(subset)}\n`, 'utf8')
console.log(`[build-mdi-subset] записано ${Object.keys(icons).length} иконок → ${outPath}`)
