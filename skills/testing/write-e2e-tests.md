# Skill: write-e2e-tests

## Description

Build end-to-end tests that simulate real-world agent chaos scenarios. These tests run the complete system with actual or mocked agent frameworks to verify the full fault injection workflow.

## Prerequisites

- All core components implemented
- Integration tests passing
- Agent framework adapters available

## Input Parameters

| Parameter | Type  | Required | Description                                     |
| --------- | ----- | -------- | ----------------------------------------------- |
| scenarios | array | no       | Scenarios to test (default: all templates)      |
| agents    | array | no       | Agent types to test against (default: ['mock']) |

## Execution Steps

1. Set up e2e test environment
2. Create mock agent implementations
3. Write scenario-based e2e tests
4. Add performance and stress tests
5. Create visual regression tests (optional)
6. Set up test reporting
7. Configure CI/CD for e2e tests
8. Add test data cleanup

## Output

- E2E test suite
- Mock agent implementations
- Test reporting configuration
- CI/CD integration

## Example Usage

```
Please execute the "write-e2e-tests" skill with:
- scenarios: ["network-degradation", "token-exhaustion"]
- agents: ["mock", "langchain"]
```

## Implementation Highlights

### E2E Test Structure

```typescript
// packages/e2e/src/network-degradation.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createChaosEngine, createAdapter } from '@agent-chaos/core';
import { MockAgent } from './mocks/MockAgent';

describe('Network Degradation E2E', () => {
  let engine: ChaosEngine;
  let agent: MockAgent;

  beforeAll(async () => {
    engine = createChaosEngine({ mode: 'inject' });
    agent = new MockAgent(engine);
    await agent.initialize();
  });

  afterAll(async () => {
    await agent.cleanup();
  });

  it('should handle latency spikes gracefully', async () => {
    const scenario = await loadScenario('network-degradation');
    engine.loadScenario(scenario);

    const result = await agent.execute('What is the weather?');

    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.duration).toBeGreaterThan(100);
  });
});
```
