import { defineConfig } from 'vitest/config'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { resolve } from 'node:path'

// base is the repo name so github pages serves assets from the right path
export default defineConfig({
  base: process.env.GH_PAGES ? '/lookspell/' : '/',
  plugins: [basicSsl()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        app: resolve(import.meta.dirname, 'app/index.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
