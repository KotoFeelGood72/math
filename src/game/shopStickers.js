/**
 * PNG-наклейки для сетки магазина: `src/assets/images/sticker/*.png`
 * (имена с числом сортируются: 1.png, 2.png, …)
 */
const stickerModules = import.meta.glob('../assets/images/sticker/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

/**
 * @returns {string[]} отсортированные URL всех найденных наклеек
 */
export function listStickerUrls() {
  const entries = Object.keys(stickerModules).map((path) => {
    const m = path.match(/(\d+)\.png$/i)
    const n = m ? parseInt(m[1], 10) : 999
    return { n, url: /** @type {string} */ (stickerModules[path]) }
  })
  entries.sort((a, b) => a.n - b.n)
  return entries.map((e) => e.url)
}

/** Ровно 4 URL для сетки 2×2 (при нехватке файлов — по кругу). */
export function getStickerUrls2x2() {
  const list = listStickerUrls()
  const fallback =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
        '<rect fill="#e8dcc8" width="64" height="64" rx="12"/>' +
        '<text x="32" y="38" text-anchor="middle" font-size="14" fill="#8a6a4a" font-family="sans-serif">?</text>' +
        '</svg>',
    )
  const base = list.length ? list : [fallback]
  const out = []
  for (let i = 0; i < 4; i += 1) out.push(base[i % base.length])
  return out
}
