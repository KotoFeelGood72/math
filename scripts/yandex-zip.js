/**
 * Содержимое dist/ в корень архива (как zip -r из папки dist), без Unix-команды zip.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import archiver from 'archiver'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const root = path.join(__dirname, '..')
const distDir = path.join(root, 'dist')
const outFile = path.join(root, 'yandex-games-build.zip')

if (!fs.existsSync(distDir)) {
  console.error('Папка dist не найдена. Сначала выполни npm run build.')
  process.exit(1)
}

const output = fs.createWriteStream(outFile)
const archive = archiver('zip', { zlib: { level: 9 } })

archive.on('warning', (err) => {
  if (err.code !== 'ENOENT') {
    console.error(err)
    process.exit(1)
  }
})

archive.on('error', (err) => {
  console.error(err)
  process.exit(1)
})

output.on('close', () => {
  console.log('Архив:', outFile, `(${archive.pointer()} байт)`)
})

archive.pipe(output)
archive.directory(distDir, false)

archive.finalize().catch((err) => {
  console.error(err)
  process.exit(1)
})
