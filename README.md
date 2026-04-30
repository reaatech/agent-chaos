<!--
Copyright (c) 2026 Rick Somers. Licensed under the MIT License.
See LICENSE file in the project root for full license information.
-->

<h1 align="center">Agent Chaos</h1>

<p align="center">
  <strong>Fault injection toolkit for agent systems.</strong><br />
  If your agent only works on the happy path, it doesn't work.
</p>

<p align="center">
  <a href="https://github.com/reaatech/agent-chaos/actions"><img src="https://img.shields.io/github/actions/workflow/status/reaatech/agent-chaos/ci.yml?branch=main&style=flat-square" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@reaatech/agent-chaos-core"><img src="https://img.shields.io/npm/v/@reaatech/agent-chaos-core?style=flat-square&color=blue" alt="npm" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?style=flat-square" alt="Node" /></a>
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange?style=flat-square" alt="pnpm" /></a>
</p>

---

## Overview

Agent Chaos is a middleware-based fault injection system that sits between your agent and its tools/providers, injecting realistic failure scenarios to validate resilience patterns like circuit breakers, confidence gates, and fallback trees.

You've built circuit breakers, confidence gates, and fallback trees — Agent Chaos proves those patterns hold under real-world conditions.

### Why Agent Chaos?

- **Nothing like this exists publicly.** There's chaos engineering for microservices (Chaos Monkey, Litmus), but nothing purpose-built for agent tool-use reliability.
- **Framework agnostic.** Works with LangChain, LlamaIndex, Vercel AI SDK, or any custom agent implementation.
- **Pluggable architecture.** Extensible injectors let you model exactly the failure modes your system faces.

---

## Features

| Category                    | Capability                                                                       |
| --------------------------- | -------------------------------------------------------------------------------- |
| **8 Fault Injection Types** | Latency, timeouts, rate limits, malformed output, token exhaustion, and more     |
| **Scenario-Driven**         | Declarative YAML/JSON configuration with probability-based fault selection       |
| **Middleware Architecture** | Transparent interceptor pattern — no changes to your agent code                  |
| **Targeted Injection**      | Apply faults to specific tools, providers, or globally with glob-based selectors |
| **Temporal Patterns**       | Schedule chaos during specific time windows                                      |
| **Cascading Failures**      | Define chains of failures across multiple tools                                  |
| **Hot Reloading**           | Update scenarios at runtime without restarting                                   |
| **Observability Built-In**  | Structured logging, metrics collection, and OpenTelemetry tracing                |
| **CI/CD Ready**             | CLI-first design with JSON, JUnit XML, and HTML report outputs                   |
| **TypeScript First**        | Full type safety with strict mode and comprehensive type definitions             |

---

## Fault Injection Types

| Fault                     | Description                                   | Tests                                          |
| ------------------------- | --------------------------------------------- | ---------------------------------------------- |
| **Latency Spikes**        | Inject random delays in tool responses        | Timeout handling, UX degradation               |
| **Timeouts**              | Simulate complete provider unavailability     | Circuit breaker activation                     |
| **Rate Limits**           | Return 429 responses with retry headers       | Retry logic, backoff strategies                |
| **Malformed Output**      | Return invalid/unexpected JSON                | Input validation, error recovery               |
| **Token Limit Exceeded**  | Simulate context window exhaustion            | Token management, summarization fallbacks      |
| **Stale Context**         | Return outdated/cached responses              | Cache invalidation, freshness checks           |
| **Contradictory Results** | Return conflicting information across tools   | Conflict resolution, confidence scoring        |
| **Partial Failures**      | Selectively fail some tools while others work | Graceful degradation, fallback tree validation |

---

## Quick Start

### CLI

```bash
# Install globally
npm install -g @reaatech/agent-chaos-cli

# Initialize a new project
agent-chaos init

# Generate a scenario template
agent-chaos generate network-degradation --output ./scenarios

# Validate your scenario
agent-chaos validate ./scenarios/network-degradation.yaml

# Run the scenario
agent-chaos run ./scenarios/network-degradation.yaml
```

### Programmatic API

```typescript
import { createChaosEngine } from '@reaatech/agent-chaos-core';

const engine = createChaosEngine({ mode: 'inject' });

engine.loadScenario({
  name: 'network-degradation',
  targets: [
    {
      selector: 'api.*',
      faults: [
        {
          type: 'latency',
          config: { minDelay: 100, maxDelay: 500 },
          probability: 0.3,
        },
      ],
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

### Scenario File Example

```yaml
# scenarios/network-degradation.yaml
name: Network Degradation
description: Simulates network-level failures across tool calls

defaults:
  probability: 0.1

targets:
  - selector: '*'
    faults:
      - type: latency
        config:
          minDelay: 100
          maxDelay: 30000
          distribution: exponential
        probability: 0.15

      - type: timeout
        config:
          timeout: 5000
        probability: 0.05

      - type: rateLimit
        config:
          retryAfter: 60
          includeHeaders: true
        probability: 0.05

overrides:
  - selector: 'webSearch'
    faults:
      - type: malformedOutput
        config:
          patterns: [truncated, invalidJson, missingFields]
        probability: 0.1
```

---

## Packages

| Package                      | Description                                       | Status         |
| ---------------------------- | ------------------------------------------------- | -------------- |
| `@reaatech/agent-chaos-core`          | Fault injection engine, middleware, and injectors | Published      |
| `@reaatech/agent-chaos-scenarios`     | Scenario loader, validator, and templates         | Published      |
| `@reaatech/agent-chaos-cli`           | Command-line interface                            | Published      |
| `@reaatech/agent-chaos-adapters`      | LangChain, LlamaIndex, and Vercel AI SDK adapters | Planned (v0.2) |
| `@reaatech/agent-chaos-observability` | Metrics, structured logging, and OpenTelemetry    | Planned (v0.2) |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Agent System                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ LangChain │  │LlamaIndex│  │  Custom Agent │   │
│  └─────┬─────┘  └─────┬────┘  └───────┬──────┘   │
│        └──────────────┼───────────────┘           │
│                       ▼                           │
│            ┌─────────────────────┐                │
│            │   Agent Chaos       │                │
│            │   Middleware Layer  │                │
│            └─────────┬───────────┘                │
│                      ▼                            │
│            ┌─────────────────────┐                │
│            │   Chaos Engine      │                │
│            │   • Scenario Loader │                │
│            │   • Fault Selector  │                │
│            │   • Injector Chain  │                │
│            └─────────┬───────────┘                │
│                      ▼                            │
│            ┌─────────────────────┐                │
│            │   Injectors         │                │
│            │   Latency│Timeout   │                │
│            │   RateLimit│Token   │                │
│            │   Stale│Malformed   │                │
│            └─────────┬───────────┘                │
└──────────────────────┼────────────────────────────┘
                       ▼
              Tools & API Providers
```

---

## Documentation

| Document                                     | Description                             |
| -------------------------------------------- | --------------------------------------- |
| [Development Plan](./DEV_PLAN.md)            | Full product roadmap and architecture   |
| [Agent Skills](./AGENTS.md)                  | AI agent skills for project development |
| [Contributing Guidelines](./CONTRIBUTING.md) | How to contribute to the project        |
| [Code of Conduct](./CODE_OF_CONDUCT.md)      | Community standards                     |
| [Security Policy](./SECURITY.md)             | Vulnerability reporting                 |
| [Examples](./examples/)                      | Usage examples and integrations         |

---

## Development

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0

### Setup

```bash
git clone https://github.com/reaatech/agent-chaos.git
cd agent-chaos
pnpm install
pnpm build
```

### Commands

| Command           | Description                     |
| ----------------- | ------------------------------- |
| `pnpm build`      | Build all packages              |
| `pnpm test`       | Run the full test suite         |
| `pnpm lint`       | Lint all packages               |
| `pnpm type-check` | Run TypeScript type checking    |
| `pnpm format`     | Format code with Prettier       |
| `pnpm check`      | Run lint, type-check, and tests |

---

## Technology Stack

| Category              | Technology               |
| --------------------- | ------------------------ |
| **Runtime**           | Node.js 20+ LTS          |
| **Language**          | TypeScript 5.3+ (strict) |
| **Package Manager**   | pnpm 9+                  |
| **Monorepo**          | Turborepo                |
| **Build**             | tsup                     |
| **Testing**           | Vitest                   |
| **Linting**           | ESLint + Prettier        |
| **CI/CD**             | GitHub Actions           |
| **Commit Convention** | Conventional Commits     |

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on reporting bugs, suggesting features, and submitting pull requests.

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md) code of conduct.

---

## License

[MIT](./LICENSE) &copy; 2026 [Rick Somers](https://reaatech.com)
