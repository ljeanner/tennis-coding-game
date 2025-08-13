import { defineConfig } from 'vite'

export default defineConfig({
  // Ensure assets are properly handled
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
  
  // Development server configuration
  server: {
    port: 3000,
    open: true
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
})
