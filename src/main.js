import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'swiper/css'
import App from './App.vue'
import router from './router'
import { useYandexGamesStore } from '@/stores/yandexGames'

async function main() {
  const pinia = createPinia()
  const yandexGames = useYandexGamesStore(pinia)
  await yandexGames.initSdk()

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
