import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Serve existing root-level assets (assets/, images/) during dev
function serveRootAssets() {
  return {
    name: 'serve-root-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || ''
        if (!url.startsWith('/assets/') && !url.startsWith('/images/')) return next()
        const filePath = path.join(process.cwd(), url)
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase()
          const mime = {
            '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg',
            '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp'
          }
          res.setHeader('Content-Type', mime[ext] || 'application/octet-stream')
          fs.createReadStream(filePath).pipe(res)
          return
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), serveRootAssets()],
  publicDir: 'public',
})
