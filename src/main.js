import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { addCollection } from '@iconify/vue'
import mdiSubset from '@/iconify/mdiSubset.json'
import 'swiper/css'
import router from './router'
import { ensureYandexGamesDevShim } from '@/yandex/yandexGamesDevShim.js'

/** Локальный поднабор MDI: без CDN (в iframe Яндекс.Игр api.iconify.design часто недоступен). */
addCollection(mdiSubset)

/**
 * На localhost вне iframe Яндекса CDN-sdk не выставляет `YaGames` —
 * подменяем его до старта Vue, чтобы `YaGames.init()` работал прямо как в доке.
 * В iframe Яндекс.Игр и в production шим — no-op.
 */
ensureYandexGamesDevShim()

async function main() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const { default: App } = await import('./App.vue')
  const app = createApp(App)
  app.use(pinia)
  app.use(router)
  app.mount('#app')
}

void main().catch((err) => {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error('[Match3] bootstrap', err)
  }
})
