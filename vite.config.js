import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service worker propio (src/sw.js) en lugar del generado: abrir la app
      // necesita "red primero, con un límite de 4 s, y si no, la copia de esta
      // misma versión", y el generado no permite ese límite sin guardar
      // también copias de las páginas, que pueden quedar desfasadas.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bitácora',
        short_name: 'Bitácora',
        description: 'Registro de recorridos, riegos y cobros',
        // Los colores de la app, no los de Bootstrap: la barra del sistema y la
        // pantalla de arranque al abrirla instalada se funden con el fondo.
        theme_color: '#f2f2f7',
        background_color: '#f2f2f7',
        lang: 'es',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        // El maskable es un icono aparte, con el fondo hasta el borde y el
        // dibujo dentro del círculo seguro: Android lo recorta con la forma
        // que elige cada fabricante, y reutilizar el normal cortaba el dibujo.
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
        suppressWarnings: true,
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      }
    })
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          pdf: ['jspdf', 'jspdf-autotable'],
          utils: ['axios', 'html2canvas']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/index.css',
        './src/components/layout/Layout.jsx'
      ]
    }
  }
})
