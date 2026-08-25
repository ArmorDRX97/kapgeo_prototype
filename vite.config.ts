import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // GitHub Pages needs the repository prefix in the built artifact, while the
  // local Vite server should keep browser-history routes at the domain root.
  base: command === 'build' ? '/kapgeo_prototype/' : '/',
  plugins: [react()],
  server: {
    port: 4173,
    host: '127.0.0.1',
  },
  preview: {
    port: 4173,
    host: '127.0.0.1',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      reporter: ['text', 'html'],
    },
  },
}))
