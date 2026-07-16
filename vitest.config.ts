import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './test/server-only-mock.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    reporters: ['verbose', 'junit'],
    outputFile: { junit: 'test-results/junit.xml' },
    env: { ANTHROPIC_API_KEY: 'test-key-not-real' },
    setupFiles: ['./test/setup.ts'],
    include: ['lib/**/*.test.ts', 'test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/**/*.test.ts',
        'lib/test-data/**',
        'lib/db/**',
        'lib/types.ts',
        'lib/eval-data.ts',
        'lib/utils.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
      reporter: ['text', 'html'],
    },
  },
})
