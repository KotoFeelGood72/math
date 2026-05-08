/**
 * Синхронизировать ассеты из Figma MCP asset URLs в локальную папку.
 *
 * Источник: текстовый дамп get_design_context (в нём строки вида:
 *   const imgFoo = "https://www.figma.com/api/mcp/asset/<id>";
 * )
 *
 * Usage:
 *   node scripts/figma-sync-assets.js "<path-to-dump.txt>" "src/assets/figma/raid-rush"
 */
import fs from 'fs'
import path from 'path'

function usageAndExit() {
  console.error(
    'Usage: node scripts/figma-sync-assets.js "<dump.txt>" "<outDir>"',
  )
  process.exit(1)
}

const [, , dumpPath, outDirArg] = process.argv
if (!dumpPath || !outDirArg) usageAndExit()

const outDir = path.resolve(process.cwd(), outDirArg)
const dumpAbs = path.resolve(process.cwd(), dumpPath)

if (!fs.existsSync(dumpAbs)) {
  console.error('Файл дампа не найден:', dumpAbs)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

const text = fs.readFileSync(dumpAbs, 'utf8')
const re = /^const\s+([A-Za-z0-9_]+)\s*=\s*"(?<url>https:\/\/www\.figma\.com\/api\/mcp\/asset\/[^"]+)";/gm

/** @type {{ name: string, url: string }[]} */
const items = []
for (const m of text.matchAll(re)) {
  const name = m[1]
  const url = m.groups?.url
  if (!url) continue
  items.push({ name, url })
}

if (items.length === 0) {
  console.error('Не нашёл ассеты в дампе. Ожидаю строки вида: const imgX = "https://www.figma.com/api/mcp/asset/...";')
  process.exit(1)
}

// Дедуп по url (на случай повторов)
const byUrl = new Map()
for (const it of items) if (!byUrl.has(it.url)) byUrl.set(it.url, it.name)

const entries = Array.from(byUrl.entries()).map(([url, name]) => ({ url, name }))

console.log(`Найдено ассетов: ${entries.length}. Скачиваю в: ${outDir}`)

let ok = 0
let fail = 0

for (const { url, name } of entries) {
  const outFile = path.join(outDir, `${name}.png`)
  if (fs.existsSync(outFile)) {
    ok += 1
    continue
  }
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(outFile, buf)
    ok += 1
  } catch (e) {
    fail += 1
    console.error('Не удалось скачать:', name, url, String(e?.message || e))
  }
}

console.log(`Готово. Успешно: ${ok}, ошибок: ${fail}`)

