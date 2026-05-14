import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devAssetsProxyTarget = env.VITE_DEV_ASSETS_PROXY_TARGET

  return {
    base: './',
    plugins: [
      vue(),
      vueDevTools(),
      {
        name: 'yandex-games-sdk-in-html',
        transformIndexHtml(html) {
          /**
           * Тег sdk до init: https://yandex.ru/dev/games/doc/ru/sdk/sdk-about
           * Локально с моками платформы: https://yandex.ru/dev/games/doc/ru/concepts/local-launch
           * (терминал 1: `npm run dev`, терминал 2: `npm run dev:yandex-proxy` — открывать URL с порта прокси, не Vite).
           */
          const sdkSrc =
            mode === 'development'
              ? 'https://sdk.games.s3.yandex.net/sdk.js'
              : './sdk.js'
          return html.replace(
            '<!-- __YANDEX_GAMES_SDK__ -->',
            `<!-- Yandex Games SDK -->
    <script defer src="${sdkSrc}"></script>`,
          )
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: (devAssetsProxyTarget
          ? {
              '/__dev-assets': {
                target: devAssetsProxyTarget,
                changeOrigin: true,
                secure: false,
                rewrite: (p) => p.replace(/^\/__dev-assets/, '/assets'),
              },
            }
          : {}),
    },
  }
})
