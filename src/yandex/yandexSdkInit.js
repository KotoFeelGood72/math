/**
 * Инициализация Yandex Games SDK ровно по доке:
 * https://yandex.ru/dev/games/doc/ru/sdk/sdk-about
 *
 *   <script src="/sdk.js"></script>          ← в index.html
 *   const ysdk = await YaGames.init()         ← здесь
 *
 * `YaGames` обычно уже определён к моменту запуска бандла (тег в `<head>`
 * без async). Короткий waiter оставлен страховкой на случай, если разметку
 * подменяет оболочка площадки и скрипт ещё догружается.
 */

const YAGAMES_WAIT_TIMEOUT_MS = 8000
const YAGAMES_POLL_INTERVAL_MS = 50

function waitForYaGames(timeoutMs) {
  if (typeof window !== 'undefined' && window.YaGames) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const t0 = Date.now()
    const id = setInterval(() => {
      if (typeof window !== 'undefined' && window.YaGames) {
        clearInterval(id)
        resolve()
        return
      }
      if (Date.now() - t0 > timeoutMs) {
        clearInterval(id)
        reject(
          new Error(
            `Yandex Games SDK не подключён: проверьте <script src="/sdk.js"> в index.html`,
          ),
        )
      }
    }, YAGAMES_POLL_INTERVAL_MS)
  })
}

/**
 * @param {{ timeoutMs?: number, signed?: boolean }} [opts]
 *   `signed: true` — если платежи обрабатываются на сервере.
 * @returns {Promise<import('ysdk').SDK>}
 */
export async function initYandexGamesSdk(opts = {}) {
  await waitForYaGames(opts.timeoutMs ?? YAGAMES_WAIT_TIMEOUT_MS)
  return opts.signed ? window.YaGames.init({ signed: true }) : window.YaGames.init()
}
