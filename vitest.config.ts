import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/__tests__/**/*.test.ts',
      'apps/**/__tests__/**/*.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
});


