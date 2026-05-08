/**
 * Резервная динамическая загрузка sdk.js, если в `public/index.html` ещё нет тега `<script src="…sdk.js">`.
 * Для модерации: относительный путь через BASE_URL в HTML; без абсолютных URL на CDN.
 * В dev SDK не подключаем (см. ранний return в `loadYandexGamesSdk`).
 */
/** Таймаут, если скрипт не отдаётся / не появляется `YaGames`. */
const LOAD_SDK_TIMEOUT_MS = 25000
/** После onload иногда YaGames появляется на следующем тике. */
const YAGAMES_AFTER_LOAD_GRACE_MS = 4000

/**
 * Только относительные пути: без вычисления абсолютного URL из `location` (автопроверка Консоли).
 * Сначала `./sdk.js` — игра отдаётся из подкаталога; `/sdk.js` ведёт на корень домена и там часто 404.
 * Файл `public/sdk.js` копируется в корень `dist/` рядом с index.html (обязателен для production-архива).
 */
function sdkSrcCandidates() {
  return ['./sdk.js', '/sdk.js']
}

function aviaTrace(stage, detail) {
  if (typeof console !== 'undefined' && typeof console.info === 'function') {
    console.info('[Avia][sdk-load]', stage, detail !== undefined ? detail : '')
  }
}

let loadPromise = null

/**
 * В DOM уже есть тег sdk.js (например, со стороны оболочки), но `YaGames` ещё не выставлен — ждём, второй тег не вставляем.
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function waitForYaGamesFromExistingScript(timeoutMs) {
  aviaTrace('wait-existing-sdk', { timeoutMs })
  return new Promise((resolve, reject) => {
    const t0 = Date.now()
    const id = setInterval(() => {
      if (window.YaGames) {
        clearInterval(id)
        aviaTrace('YaGames появился (существующий тег)', {
          ms: Date.now() - t0,
        })
        resolve()
        return
      }
      if (Date.now() - t0 > timeoutMs) {
        clearInterval(id)
        reject(
          new Error(
            'YaGames не появился: возможно, sdk.js в документе не тот или не загрузился',
          ),
        )
      }
    }, 25)
  })
}

function findExistingSdkScriptEl() {
  const list = document.querySelectorAll('script[src]')
  for (const el of list) {
    const src = el.getAttribute('src') || ''
    if (/\/sdk\.js(\?|$)/.test(src) || src.endsWith('sdk.js')) {
      return el
    }
  }
  return null
}

/**
 * Подключает sdk.js, если глобальный YaGames ещё недоступен.
 * Если тег sdk.js уже в документе — только ждём появления `YaGames`, дубликат не создаём (SDK v2).
 * @returns {Promise<void>}
 */
export function loadYandexGamesSdk() {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }
  // В локальной разработке не тянем SDK Яндекса: тег в index.html оставляем для требований прод-сборки.
  if (import.meta.env.DEV) {
    aviaTrace('DEV: пропуск загрузки Yandex Games SDK')
    return Promise.resolve()
  }
  if (window.YaGames) {
    aviaTrace('YaGames уже в window, пропуск загрузки')
    return Promise.resolve()
  }
  if (loadPromise) {
    aviaTrace('повторный вызов — ждём текущую загрузку')
    return loadPromise
  }
  const existingSdk = findExistingSdkScriptEl()
  if (existingSdk) {
    aviaTrace('в документе уже есть тег sdk.js', {
      src: existingSdk.getAttribute('src'),
    })
    loadPromise = waitForYaGamesFromExistingScript(LOAD_SDK_TIMEOUT_MS).catch(
      (err) => {
        loadPromise = null
        aviaTrace('ошибка ожидания существующего sdk', String(err))
        throw err
      },
    )
    return loadPromise
  }
  const candidates = sdkSrcCandidates()
  aviaTrace('кандидаты URL', candidates)
  loadPromise = Promise.race([
    new Promise((resolve, reject) => {
      let attempt = 0

      const tryNext = () => {
        if (window.YaGames) {
          resolve()
          return
        }
        if (attempt >= candidates.length) {
          loadPromise = null
          reject(new Error('Не удалось загрузить Yandex Games SDK'))
          return
        }
        const src = candidates[attempt]
        attempt += 1
        aviaTrace('пробуем загрузить', src)
        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.onload = () => {
          if (window.YaGames) {
            aviaTrace('onload: YaGames сразу', { src })
            resolve()
            return
          }
          const t0 = Date.now()
          const poll = setInterval(() => {
            if (window.YaGames) {
              clearInterval(poll)
              aviaTrace('onload: YaGames после ожидания', {
                src,
                ms: Date.now() - t0,
              })
              resolve()
            } else if (Date.now() - t0 > YAGAMES_AFTER_LOAD_GRACE_MS) {
              clearInterval(poll)
              aviaTrace('onload: YaGames не определён, другой URL', { src })
              script.remove()
              tryNext()
            }
          }, 25)
        }
        script.onerror = () => {
          aviaTrace('onerror скрипта', src)
          script.remove()
          tryNext()
        }
        document.head.appendChild(script)
      }

      tryNext()
    }),
    new Promise((_, reject) => {
      setTimeout(() => {
        loadPromise = null
        reject(new Error(`Таймаут загрузки sdk.js (${LOAD_SDK_TIMEOUT_MS} мс)`))
      }, LOAD_SDK_TIMEOUT_MS)
    }),
  ])
  return loadPromise
}
