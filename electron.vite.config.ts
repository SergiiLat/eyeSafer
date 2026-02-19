import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          settings: resolve(__dirname, 'src/preload/settings.preload.ts'),
          overlay: resolve(__dirname, 'src/preload/overlay.preload.ts'),
          camera: resolve(__dirname, 'src/preload/camera.preload.ts')
        }
      }
    }
  },
  renderer: {
    publicDir: resolve(__dirname, 'public'),
    build: {
      rollupOptions: {
        input: {
          settings: resolve(__dirname, 'src/renderer/settings/index.html'),
          overlay: resolve(__dirname, 'src/renderer/overlay/index.html'),
          camera: resolve(__dirname, 'src/renderer/camera/index.html')
        }
      }
    },
    plugins: [svelte()],
    css: {
      postcss: resolve(__dirname, 'postcss.config.js')
    }
  }
})
