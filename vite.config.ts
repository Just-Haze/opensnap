import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import fs from 'fs'

// Custom plugin to copy preload script without transformation
function copyPreload() {
  return {
    name: 'copy-preload',
    writeBundle() {
      const src = path.resolve(__dirname, 'electron/preload.cjs')
      const dest = path.resolve(__dirname, 'dist-electron/preload.cjs')
      
      // Ensure dist-electron exists
      if (!fs.existsSync(path.dirname(dest))) {
        fs.mkdirSync(path.dirname(dest), { recursive: true })
      }
      
      // Copy the preload script without any transformation
      fs.copyFileSync(src, dest)
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(args) {
          args.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          },
          plugins: [copyPreload()]
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
