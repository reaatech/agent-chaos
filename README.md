# Agent Chaos

> Fault injection toolkit for agent systems. If your agent only works on the happy path, it doesn't work.

## Overview

Agent Chaos is a middleware-based fault injection system that sits between your agent and its tools/providers, injecting realistic failure scenarios to validate resilience patterns like circuit breakers, confidence gates, and fallback trees.

## Quick Start

```bash
# Install the CLI
npm install -g @agent-chaos/cli

# Initialize a project
agent-chaos init

# Generate a scenario template
agent-chaos generate network-degradation --output ./scenarios

# Validate your scenario
agent-chaos validate ./scenarios/network-degradation.yaml

# Run the scenario
agent-chaos run ./scenarios/network-degradation.yaml
```

## Programmatic Usage

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

## Documentation

- [Development Plan](./DEV_PLAN.md)
- [Agent Skills](./AGENTS.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Examples](./examples/)

## Packages

| Package                      | Description                                       | Status        |
| ---------------------------- | ------------------------------------------------- | ------------- |
| `@agent-chaos/core`          | Fault injection engine, middleware, and injectors | Published     |
| `@agent-chaos/scenarios`     | Scenario loader, validator, and templates         | Published     |
| `@agent-chaos/cli`           | Command-line interface                            | Published     |
| `@agent-chaos/adapters`      | Framework adapters                                | Planned (0.2) |
| `@agent-chaos/observability` | Observability tools                               | Planned (0.2) |

## License

MIT
