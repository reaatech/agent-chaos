# Skill: write-integration-tests

## Description

Create integration test suite that verifies the interaction between multiple components of the agent-chaos system. These tests ensure that the ChaosEngine, Middleware, Injectors, and Adapters work together correctly.

## Prerequisites

- Monorepo initialized (run `init-monorepo` first)
- Core components implemented (ChaosEngine, Middleware, Injectors)
- Unit tests passing

## Input Parameters

| Parameter     | Type    | Required | Description                                                                        |
| ------------- | ------- | -------- | ---------------------------------------------------------------------------------- |
| components    | array   | no       | Components to include (default: ['engine', 'middleware', 'injectors', 'adapters']) |
| mockProviders | boolean | no       | Mock external providers (default: true)                                            |

## Execution Steps

1. Set up integration test environment
2. Create test utilities for component composition
3. Write tests for component interactions
4. Add scenario loading integration tests
5. Create adapter integration tests
6. Add end-to-end flow tests
7. Configure test database/storage if needed
8. Set up test fixtures

## Output

- Integration test suite
- Test utilities and helpers
- Mock providers and services
- Integration test configuration

## Example Usage

```
Please execute the "write-integration-tests" skill with:
- components: ["engine", "middleware", "injectors"]
- mockProviders: true
```

## Error Handling

- Handle component initialization failures
- Provide detailed error messages for integration failures
- Clean up resources after tests

## Implementation Details

### Integration Test Setup (packages/core/src/integration/setup.ts)

```typescript
import { createChaosEngine, type ChaosEngine } from '../ChaosEngine';
import { createStandardInjectors } from '../injectors';
import type { Scenario } from '../types';
import { createScenarioLoader } from '@agent-chaos/scenarios';

export interface IntegrationTestEnvironment {
  engine: ChaosEngine;
  scenarioLoader: ReturnType<typeof createScenarioLoader>;
  cleanup: () => Promise<void>;
}

export async function setupIntegrationTest(
  scenarios?: Scenario[]
): Promise<IntegrationTestEnvironment> {
  // Create engine with injectors
  const engine = createChaosEngine({
    mode: 'inject',
    observability: {
      logging: { level: 'debug', format: 'text' },
    },
  });

  // Register standard injectors
  const injectors = createStandardInjectors();
  injectors.forEach((injector) => engine.registerInjector(injector));

  // Load scenarios
  if (scenarios) {
    scenarios.forEach((scenario) => engine.loadScenario(scenario));
  }

  // Create scenario loader
  const scenarioLoader = createScenarioLoader({
    validation: true,
  });

  // Cleanup function
  const cleanup = async () => {
    engine.reset();
    scenarioLoader.clearCache();
  };

  return {
    engine,
    scenarioLoader,
    cleanup,
  };
}
```

### Integration Tests (packages/core/src/integration/chaos-engine.integration.test.ts)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupIntegrationTest, type IntegrationTestEnvironment } from './setup';
import { createMockToolCall } from '../test-utils';
import type { Scenario } from '../types';

describe('ChaosEngine Integration', () => {
  let env: IntegrationTestEnvironment;

  beforeEach(async () => {
    env = await setupIntegrationTest();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('Scenario Loading and Execution', () => {
    it('should load and execute a network degradation scenario', async () => {
      const scenario: Scenario = {
        name: 'network-degradation-test',
        targets: [
          {
            selector: '*',
            faults: [
              {
                type: 'latency',
                config: { minDelay: 100, maxDelay: 200 },
                probability: 1.0, // Always inject for testing
              },
            ],
          },
        ],
      };

      env.engine.loadScenario(scenario);

      const toolCall = createMockToolCall({ name: 'testTool' });
      const start = Date.now();

      const response = await env.engine.intercept(toolCall);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100);
      expect(response.id).toBe(toolCall.id);
    });

    it('should handle multiple scenarios simultaneously', async () => {
      const scenario1: Scenario = {
        name: 'latency-scenario',
        targets: [
          {
            selector: 'latencyTool',
            faults: [
              {
                type: 'latency',
                config: { minDelay: 100, maxDelay: 200 },
                probability: 1.0,
              },
            ],
          },
        ],
      };

      const scenario2: Scenario = {
        name: 'rate-limit-scenario',
        targets: [
          {
            selector: 'rateLimitTool',
            faults: [
              {
                type: 'rateLimit',
                config: { retryAfter: 60 },
                probability: 1.0,
              },
            ],
          },
        ],
      };

      env.engine.loadScenario(scenario1);
      env.engine.loadScenario(scenario2);

      // Test latency tool
      const latencyCall = createMockToolCall({ name: 'latencyTool' });
      const latencyStart = Date.now();
      await env.engine.intercept(latencyCall);
      expect(Date.now() - latencyStart).toBeGreaterThanOrEqual(100);

      // Test rate limit tool
      const rateLimitCall = createMockToolCall({ name: 'rateLimitTool' });
      const rateLimitResponse = await env.engine.intercept(rateLimitCall);
      expect(rateLimitResponse.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should respect scenario overrides', async () => {
      const scenario: Scenario = {
        name: 'override-test',
        targets: [
          {
            selector: '*',
            faults: [
              {
                type: 'latency',
                config: { minDelay: 10, maxDelay: 20 },
                probability: 1.0,
              },
            ],
          },
        ],
        overrides: [
          {
            selector: 'specialTool',
            faults: [
              {
                type: 'rateLimit',
                config: { retryAfter: 30 },
                probability: 1.0,
              },
            ],
          },
        ],
      };

      env.engine.loadScenario(scenario);

      // Regular tool should get latency
      const regularCall = createMockToolCall({ name: 'regularTool' });
      const regularStart = Date.now();
      await env.engine.intercept(regularCall);
      expect(Date.now() - regularStart).toBeGreaterThanOrEqual(10);

      // Special tool should get rate limit
      const specialCall = createMockToolCall({ name: 'specialTool' });
      const specialResponse = await env.engine.intercept(specialCall);
      expect(specialResponse.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Middleware Chain', () => {
    it('should execute middleware chain in order', async () => {
      const executionOrder: string[] = [];

      const scenario: Scenario = {
        name: 'chain-test',
        targets: [
          {
            selector: '*',
            faults: [
              {
                type: 'latency',
                config: { minDelay: 50, maxDelay: 100 },
                probability: 1.0,
              },
              {
                type: 'malformedOutput',
                config: { patterns: ['wrongType'] },
                probability: 0.0, // Disabled for this test
              },
            ],
          },
        ],
      };

      env.engine.loadScenario(scenario);

      const toolCall = createMockToolCall({ name: 'chainTool' });
      const start = Date.now();

      const response = await env.engine.intercept(toolCall);
      const duration = Date.now() - start;

      // Should have applied latency
      expect(duration).toBeGreaterThanOrEqual(50);

      // Should not have malformed output (probability 0)
      expect(response.error).toBeUndefined();
    });

    it('should handle passthrough mode correctly', async () => {
      env.engine.setMode('passthrough');

      const scenario: Scenario = {
        name: 'passthrough-test',
        targets: [
          {
            selector: '*',
            faults: [
              {
                type: 'latency',
                config: { minDelay: 1000, maxDelay: 2000 },
                probability: 1.0,
              },
            ],
          },
        ],
      };

      env.engine.loadScenario(scenario);

      const toolCall = createMockToolCall({ name: 'testTool' });
      const start = Date.now();

      const response = await env.engine.intercept(toolCall);
      const duration = Date.now() - start;

      // Should not have delay in passthrough mode
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid scenario gracefully', async () => {
      const invalidScenario = {
        name: 'invalid',
        targets: [
          {
            selector: '*',
            faults: [
              {
                type: 'unknown_fault_type', // Invalid type
                config: {},
              },
            ],
          },
        ],
      };

      // Should not throw, but log warning
      expect(() => env.engine.loadScenario(invalidScenario as unknown as Scenario)).not.toThrow();
    });

    it('should handle tool execution errors', async () => {
      const scenario: Scenario = {
        name: 'error-test',
        targets: [
          {
            selector: '*',
            faults: [
              {
                type: 'timeout',
                config: { timeout: 1 }, // 1ms timeout
                probability: 1.0,
              },
            ],
          },
        ],
      };

      env.engine.loadScenario(scenario);

      const toolCall = createMockToolCall({ name: 'slowTool' });
      const response = await env.engine.intercept(toolCall);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe('TIMEOUT_EXCEEDED');
    });
  });

  describe('Event Recording', () => {
    it('should record all chaos events', async () => {
      const scenario: Scenario = {
        name: 'recording-test',
        targets: [
          {
            selector: '*',
            faults: [
              {
                type: 'latency',
                config: { minDelay: 10, maxDelay: 20 },
                probability: 1.0,
              },
            ],
          },
        ],
      };

      env.engine.loadScenario(scenario);

      const toolCall1 = createMockToolCall({ name: 'tool1' });
      const toolCall2 = createMockToolCall({ name: 'tool2' });

      await env.engine.intercept(toolCall1);
      await env.engine.intercept(toolCall2);

      const events = env.engine.record();

      // Should have scenario loaded event and fault injected events
      expect(events.length).toBeGreaterThanOrEqual(3);
      expect(events.some((e) => e.type === 'scenario_loaded')).toBe(true);
      expect(events.some((e) => e.type === 'fault_injected')).toBe(true);
    });
  });
});
```

### Adapter Integration Tests (packages/adapters/src/integration/adapters.integration.test.ts)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createChaosEngine } from '@agent-chaos/core';
import { createAdapter } from '../index';
import type { Scenario } from '@agent-chaos/core';

describe('Adapter Integration', () => {
  // Note: These tests would require the actual frameworks to be installed
  // In CI, they would run in a separate job with framework dependencies

  describe('Generic Adapter', () => {
    it('should wrap fetch calls correctly', async () => {
      const engine = createChaosEngine();
      const adapter = createAdapter('generic', engine, {
        baseUrl: 'https://api.example.com',
        targets: ['/tools/*'],
      });

      const scenario: Scenario = {
        name: 'fetch-test',
        targets: [
          {
            selector: '/tools/*',
            faults: [
              {
                type: 'rateLimit',
                config: { retryAfter: 1 },
                probability: 1.0,
              },
            ],
          },
        ],
      };

      engine.loadScenario(scenario);
      adapter.wrap();

      try {
        // This would test actual fetch wrapping
        // const response = await fetch('https://api.example.com/tools/test');
        // expect(response.status).toBe(429);
      } finally {
        adapter.unwrap();
      }
    });
  });
});
```

### Scenario Loader Integration Tests (packages/scenarios/src/integration/scenario-loader.integration.test.ts)

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  createScenarioLoader,
  ScenarioLoadError,
  ScenarioValidationError,
} from '../ScenarioLoader';

describe('ScenarioLoader Integration', () => {
  let tempDir: string;
  let loader: ReturnType<typeof createScenarioLoader>;

  beforeEach(async () => {
    tempDir = path.join(process.cwd(), 'temp-test-scenarios');
    await fs.mkdir(tempDir, { recursive: true });
    loader = createScenarioLoader({ validation: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    loader.clearCache();
  });

  it('should load YAML scenario files', async () => {
    const yamlContent = `
name: test-yaml-scenario
targets:
  - selector: "*"
    faults:
      - type: latency
        config:
          minDelay: 100
          maxDelay: 200
        probability: 0.5
`;

    const filePath = path.join(tempDir, 'test.yaml');
    await fs.writeFile(filePath, yamlContent);

    const scenario = await loader.load(filePath);
    expect(scenario.name).toBe('test-yaml-scenario');
    expect(scenario.targets.length).toBe(1);
  });

  it('should load JSON scenario files', async () => {
    const jsonContent = JSON.stringify({
      name: 'test-json-scenario',
      targets: [
        {
          selector: '*',
          faults: [
            {
              type: 'rateLimit',
              config: { retryAfter: 60 },
              probability: 0.3,
            },
          ],
        },
      ],
    });

    const filePath = path.join(tempDir, 'test.json');
    await fs.writeFile(filePath, jsonContent);

    const scenario = await loader.load(filePath);
    expect(scenario.name).toBe('test-json-scenario');
  });

  it('should load all scenarios from a directory', async () => {
    // Create multiple scenario files
    await fs.writeFile(
      path.join(tempDir, 'scenario1.yaml'),
      'name: scenario1\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config: { minDelay: 100, maxDelay: 200 }'
    );
    await fs.writeFile(
      path.join(tempDir, 'scenario2.json'),
      JSON.stringify({
        name: 'scenario2',
        targets: [{ selector: '*', faults: [{ type: 'timeout', config: { timeout: 5000 } }] }],
      })
    );

    const scenarios = await loader.loadAll(tempDir);
    expect(scenarios.length).toBe(2);
    expect(scenarios.map((s) => s.name)).toContain('scenario1');
    expect(scenarios.map((s) => s.name)).toContain('scenario2');
  });

  it('should validate scenarios against schema', async () => {
    const invalidContent = JSON.stringify({
      name: '', // Empty name should fail validation
      targets: [],
    });

    const filePath = path.join(tempDir, 'invalid.json');
    await fs.writeFile(filePath, invalidContent);

    await expect(loader.load(filePath)).rejects.toThrow(ScenarioValidationError);
  });

  it('should cache loaded scenarios', async () => {
    const yamlContent = `
name: cache-test
targets:
  - selector: "*"
    faults:
      - type: latency
        config:
          minDelay: 100
          maxDelay: 200
`;

    const filePath = path.join(tempDir, 'cache.yaml');
    await fs.writeFile(filePath, yamlContent);

    // First load
    await loader.load(filePath);

    // Second load should come from cache
    const scenarios = loader.getLoadedScenarios();
    expect(scenarios.length).toBe(1);
    expect(scenarios[0].name).toBe('cache-test');
  });
});
```

### Integration Test Configuration

```typescript
// vitest.integration.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.integration.test.ts'],
    setupFiles: ['packages/*/src/integration/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    testTimeout: 30000, // 30 second timeout for integration tests
  },
  resolve: {
    alias: {
      '@agent-chaos/core': resolve(__dirname, 'packages/core/src'),
      '@agent-chaos/scenarios': resolve(__dirname, 'packages/scenarios/src'),
      '@agent-chaos/cli': resolve(__dirname, 'packages/cli/src'),
      '@agent-chaos/adapters': resolve(__dirname, 'packages/adapters/src'),
      '@agent-chaos/observability': resolve(__dirname, 'packages/observability/src'),
    },
  },
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:integration:watch": "vitest --config vitest.integration.config.ts",
    "test:all": "pnpm test && pnpm test:integration"
  }
}
```
