import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@reaatech/agent-chaos-core': new URL('../core/src', import.meta.url).pathname,
      '@reaatech/agent-chaos-scenarios': new URL('../scenarios/src', import.meta.url).pathname,
      '@reaatech/agent-chaos-cli': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      exclude: ['src/index.ts', '**/*.test.ts', '**/*.spec.ts', 'dist', 'node_modules'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
