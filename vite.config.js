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
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        ...(devAssetsProxyTarget
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
    },
  }
})
