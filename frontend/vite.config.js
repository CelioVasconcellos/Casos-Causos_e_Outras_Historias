import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

export default defineConfig({
  plugins: [react(), cacheHeaders()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000'
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
    ]
  }
})
