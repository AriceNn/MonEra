import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    })
  ],
  build: {
    // Chunk size warning limit - suppress for now (we're optimizing)
    chunkSizeWarningLimit: 1000,
    
    // Manual chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor libraries
          'vendor-react': ['react', 'react-dom'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['date-fns', 'uuid', 'papaparse']
        },
        // Optimize chunk names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    
    // Optimize minification - use defaults
    minify: 'esbuild',  // esbuild is faster than terser
    
    // Enable parallel builds
    target: 'esnext',
    
    // Disable source maps in production (save build time)
    sourcemap: false,
    
    // CSS optimization
    cssCodeSplit: true,
    
    // Reduce transpile target for faster builds
    reportCompressedSize: false
  }
})

