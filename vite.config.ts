import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');

  const onwarn = (warning: { code?: string; id?: string; message: string }, warn: (warning: any) => void) => {
    if (
      warning.code === 'EVAL' &&
      warning.id?.includes('onnxruntime-web/dist/ort-web.min.js')
    ) {
      return;
    }

    warn(warning);
  };

  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 50 * 1024 * 1024 // 50MB for ONNX WASM files
        },
        manifest: {
          id: '/',
          name: 'Ask Amo',
          short_name: 'Ask Amo',
          description: 'Offline-first AI Chat with WebGPU',
          theme_color: '#0A0A0A',
          background_color: '#0A0A0A',
          display: 'standalone',
          display_override: ['standalone', 'browser'],
          start_url: '/',
          scope: '/',
          orientation: 'portrait-primary',
          lang: 'en',
          icons: [
            {
              src: 'icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ],
          shortcuts: [
            {
              name: 'New chat',
              short_name: 'New chat',
              description: 'Start a fresh conversation',
              url: '/?newChat=true'
            }
          ],
          prefer_related_applications: false,
          categories: ['productivity', 'utilities']
        },
        devOptions: {
          enabled: true
        }
      }),
      // Add visualizer plugin for bundle analysis in production mode
      mode === 'production' && process.env.ANALYZE === 'true' ? 
        visualizer({
          open: true,
          gzipSize: true,
          brotliSize: true,
          filename: 'stats.html'
        }) : undefined
    ].filter(Boolean),
    define: {
      // Define variables if needed
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    optimizeDeps: {
      exclude: ['@sqlite.org/sqlite-wasm'],
    },
    build: {
      reportCompressedSize: false,
      chunkSizeWarningLimit: 8000,
      rollupOptions: {
        maxParallelFileOps: 100,
        onwarn,
        output: {
          manualChunks(id) {
            if (id.includes('@mlc-ai/web-llm') || id.includes('webLlmWorker')) {
              return 'webllm';
            }

            if (id.includes('pdfjs-dist')) {
              return 'pdfjs';
            }

            if (id.includes('@xenova/transformers') || id.includes('onnxruntime-web')) {
              return 'transformers';
            }

            return undefined;
          },
        },
      },
    },
  };
});
