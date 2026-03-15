import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest.setup.ts',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules/',
      'dist/',
      'vitest.setup.ts',
      'android/**',
      'e2e/',
      'src/main.tsx',
      'src/vite-env.d.ts',
      '**/*.d.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'vitest.setup.ts',
        'android/**',
        'e2e/',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.d.ts'
      ]
    }
  }
})