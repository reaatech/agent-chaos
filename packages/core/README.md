# @agent-chaos/core

> Core fault injection engine for agent-chaos.

## Installation

```bash
npm install @agent-chaos/core
```

## Usage

```typescript
import { createChaosEngine } from '@agent-chaos/core';

const engine = createChaosEngine({ mode: 'inject' });

engine.loadScenario({
  name: 'network-degradation',
  targets: [
    {
      selector: 'api.*',
      faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 500 }, probability: 0.3 }],
    },
  ],
});

const response = await engine.intercept({
  id: '1',
  name: 'api.search',
  arguments: { query: 'hello' },
  timestamp: Date.now(),
});
```

## API

- `createChaosEngine(config?)` — Create a new chaos engine.
- `ChaosEngine` — The engine class supporting scenarios, injectors, and event recording.
- `Middleware` — Intercepts tool calls and applies faults.
- `Logger` — Structured logging with JSON/text formats.
- Injectors: `LatencyInjector`, `TimeoutInjector`, `RateLimitInjector`, `MalformedOutputInjector`, `TokenLimitInjector`, `StaleContextInjector`, `ContradictionInjector`, `PartialFailureInjector`.
