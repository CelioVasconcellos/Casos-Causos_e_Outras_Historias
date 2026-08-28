import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'http://localhost:8000'

// Plugin: headers de cache para producao (vite preview / servidor estatico).
// - index.html e rotas: SEM cache (sempre buscam a versao nova a cada deploy)
// - /assets/* (JS/CSS com hash no nome): cache longo + immutable (mudam de nome a cada build)
function cacheHeaders() {
  const setHeaders = (req, res, next) => {
    const url = req.url || ''
    if (url.startsWith('/assets/')) {
      // Arquivos com hash no nome: cache de 1 ano, imutavel
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    } else {
      // HTML e demais rotas: sem cache, sempre revalida
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
    }
    next()
  }
  return {
    name: 'cache-headers',
    configurePreviewServer(server) {
      server.middlewares.use(setHeaders)
    },
    configureServer(server) {
      server.middlewares.use(setHeaders)
    }
  }
}

  return {
  plugins: [react(), cacheHeaders()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
      '/sitemap.xml': apiTarget,
      '/robots.txt': apiTarget,
      '/google4fe5ed31260d9f02.html': apiTarget
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'casos-causos-e-outras-historias.onrender.com'
    ],
    proxy: {
      '/sitemap.xml': apiTarget,
      '/robots.txt': apiTarget,
      '/google4fe5ed31260d9f02.html': apiTarget
    }
  }
  }
})
