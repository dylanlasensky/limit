import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Isolated unit test configuration.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // Bound concurrency so jsdom suites do not starve UI waits on shared runners.
    maxWorkers: 2,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}', 'worker/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
