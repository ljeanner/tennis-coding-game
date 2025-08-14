import { defineConfig } from 'vite'

export default defineConfig({
  // Ensure assets are properly handled
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
  
  // Development server configuration
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        // Proxy target should point to the API dev server (not the Vite server)
        target: 'http://localhost:7000',
        changeOrigin: true,
        // remove the leading /api before forwarding to the API server
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
})
