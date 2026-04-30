# Skill: write-unit-tests

## Description

Generate comprehensive unit tests for a module in the agent-chaos project. This skill creates Vitest-based tests with proper mocking, assertions, and coverage.

## Prerequisites

- Monorepo initialized (run `init-monorepo` first)
- Module to test exists
- Vitest configured in the project

## Input Parameters

| Parameter    | Type    | Required | Description                                                    |
| ------------ | ------- | -------- | -------------------------------------------------------------- |
| module       | string  | yes      | Module path to test (e.g., "packages/core/src/ChaosEngine.ts") |
| coverage     | boolean | no       | Include coverage assertions (default: true)                    |
| mockExternal | boolean | no       | Mock external dependencies (default: true)                     |

## Execution Steps

1. Analyze module structure and dependencies
2. Create test file with .test.ts extension
3. Set up test fixtures and mocks
4. Write tests for all public methods
5. Add edge case and error handling tests
6. Include type safety tests
7. Add performance benchmarks (optional)
8. Configure test coverage thresholds

## Output

- Test file with comprehensive unit tests
- Mock implementations for dependencies
- Test fixtures and helpers
- Coverage configuration

## Example Usage

```
Please execute the "write-unit-tests" skill with:
- module: "packages/core/src/injectors/LatencyInjector.ts"
- coverage: true
- mockExternal: true
```

## Error Handling

- Handle missing dependencies gracefully
- Provide meaningful test failure messages
- Skip tests for unavailable features

## Implementation Details

### Test File Structure

```typescript
// packages/core/src/injectors/LatencyInjector.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LatencyInjector, type LatencyConfig } from './LatencyInjector';
import type { FaultConfig, InjectionContext, ToolCall, Scenario } from '../types';

describe('LatencyInjector', () => {
  let injector: LatencyInjector;
  let mockContext: InjectionContext;
  let mockFault: FaultConfig;

  beforeEach(() => {
    injector = new LatencyInjector();

    mockContext = {
      toolCall: {
        id: 'test-call-1',
        name: 'testTool',
        arguments: { key: 'value' },
        timestamp: Date.now(),
      },
      scenario: {
        name: 'test-scenario',
        targets: [],
        defaults: { probability: 0.1 },
      },
      previousCalls: [],
      previousResponses: [],
    };

    mockFault = {
      type: 'latency',
      config: {
        minDelay: 100,
        maxDelay: 500,
      },
    };
  });

  describe('canInject', () => {
    it('should return true for valid configuration', () => {
      const result = injector.canInject(mockFault, mockContext);
      expect(result).toBe(true);
    });

    it('should return false when minDelay is missing', () => {
      const invalidFault = {
        ...mockFault,
        config: { maxDelay: 500 },
      };
      const result = injector.canInject(invalidFault, mockContext);
      expect(result).toBe(false);
    });

    it('should return false when maxDelay is missing', () => {
      const invalidFault = {
        ...mockFault,
        config: { minDelay: 100 },
      };
      const result = injector.canInject(invalidFault, mockContext);
      expect(result).toBe(false);
    });

    it('should return false for negative delay values', () => {
      const invalidFault = {
        ...mockFault,
        config: { minDelay: -100, maxDelay: 500 },
      };
      const result = injector.canInject(invalidFault, mockContext);
      expect(result).toBe(false);
    });

    it('should return false when minDelay > maxDelay', () => {
      const invalidFault = {
        ...mockFault,
        config: { minDelay: 600, maxDelay: 500 },
      };
      const result = injector.canInject(invalidFault, mockContext);
      expect(result).toBe(false);
    });
  });

  describe('inject', () => {
    it('should delay execution by at least minDelay', async () => {
      const start = Date.now();
      const result = await injector.inject(mockFault, mockContext);
      const duration = Date.now() - start;

      expect(result.shouldInject).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should delay execution by at most maxDelay', async () => {
      const start = Date.now();
      const result = await injector.inject(mockFault, mockContext);
      const duration = Date.now() - start;

      expect(result.shouldInject).toBe(true);
      expect(duration).toBeLessThanOrEqual(500 + 50); // 50ms tolerance
    });

    it('should use uniform distribution by default', async () => {
      const delays: number[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await injector.inject(mockFault, mockContext);
        delays.push(Date.now() - start);
      }

      const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
      const expectedAvg = (100 + 500) / 2;

      // Average should be close to midpoint (with some tolerance)
      expect(avgDelay).toBeGreaterThanOrEqual(expectedAvg - 100);
      expect(avgDelay).toBeLessThanOrEqual(expectedAvg + 100);
    });

    it('should use exponential distribution when specified', async () => {
      const exponentialFault: FaultConfig = {
        type: 'latency',
        config: {
          minDelay: 100,
          maxDelay: 10000,
          distribution: 'exponential',
        },
      };

      const delays: number[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await injector.inject(exponentialFault, mockContext);
        delays.push(Date.now() - start);
      }

      // Exponential distribution should have more lower values
      const median = delays.sort((a, b) => a - b)[50];
      const expectedMedian = 100 + (10000 - 100) * 0.5; // Rough estimate

      expect(median).toBeLessThan(expectedMedian);
    });

    it('should return null mockResponse for passthrough', async () => {
      const result = await injector.inject(mockFault, mockContext);
      expect(result.mockResponse).toBeNull();
    });
  });

  describe('type safety', () => {
    it('should have correct type property', () => {
      expect(injector.type).toBe('latency');
    });
  });
});
```

### Test Configuration (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'packages/*/dist/', '**/*.d.ts', '**/*.test.ts'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    deps: {
      optimizer: {
        web: {
          include: ['@reaatech/agent-chaos-core'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@reaatech/agent-chaos-core': resolve(__dirname, 'packages/core/src'),
      '@reaatech/agent-chaos-scenarios': resolve(__dirname, 'packages/scenarios/src'),
      '@reaatech/agent-chaos-cli': resolve(__dirname, 'packages/cli/src'),
      '@reaatech/agent-chaos-adapters': resolve(__dirname, 'packages/adapters/src'),
      '@reaatech/agent-chaos-observability': resolve(__dirname, 'packages/observability/src'),
    },
  },
});
```

### Test Utilities

Create reusable helpers inside your test files or a local test helpers directory:

```typescript
// Example helpers inside a test file
function createMockToolCall(overrides?: Partial<ToolCall>): ToolCall {
  return {
    id: `test-call-${Date.now()}`,
    name: 'mockTool',
    arguments: {},
    timestamp: Date.now(),
    ...overrides,
  };
}

function createMockScenario(overrides?: Partial<Scenario>): Scenario {
  return {
    name: 'test-scenario',
    targets: [],
    ...overrides,
  };
}

function createMockInjectionContext(overrides?: Partial<InjectionContext>): InjectionContext {
  return {
    toolCall: createMockToolCall(),
    scenario: createMockScenario(),
    previousCalls: [],
    previousResponses: [],
    ...overrides,
  };
}
```

### Fake Timers

Use Vitest's built-in fake timers for time-based tests:

````typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

// In your test:
const promise = injector.inject(fault, context);
vi.advanceTimersByTime(100);
const result = await promise;
### Package.json Test Scripts
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  },
  "devDependencies": {
    "vitest": "^1.1.0",
    "@vitest/coverage-v8": "^1.1.0",
    "@vitest/ui": "^1.1.0"
  }
}
````
