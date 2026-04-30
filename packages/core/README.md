# @reaatech/agent-chaos-core

[![npm version](https://img.shields.io/npm/v/@reaatech/agent-chaos-core.svg)](https://www.npmjs.com/package/@reaatech/agent-chaos-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-chaos/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/agent-chaos/ci.yml?branch=main&label=CI)](https://github.com/reaatech/agent-chaos/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Middleware-based fault injection engine for agent systems. If your agent only works on the happy path, it doesn't work. Provides eight fault injection types, a scenario-driven configuration system, probability-based fault selection with seeded randomness, and a pluggable injector architecture — all behind a single `engine.intercept()` call.

## Installation

```bash
npm install @reaatech/agent-chaos-core
# or
pnpm add @reaatech/agent-chaos-core
```

## Feature Overview

- **8 fault injection types** — latency, timeout, rate limit, malformed output, token exhaustion, stale context, contradiction, and partial failure
- **Scenario-driven** — declarative YAML/JSON configuration with probability-based fault selection and glob-based tool targeting
- **Middleware architecture** — transparent interceptor pattern; no changes to your agent code
- **Pluggable injectors** — implement the `Injector` interface to model your own failure modes
- **Seeded randomness** — deterministic fault selection for reproducible test runs via `SeededRandom`
- **4 probability distributions** — uniform, exponential, normal, and burst for latency injection
- **Conditional faults** — gate faults behind time-window, call-count, and error-rate conditions
- **Zero runtime dependencies** beyond `minimatch` — lightweight and tree-shakeable
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import { createChaosEngine } from "@reaatech/agent-chaos-core";

const engine = createChaosEngine({ mode: "inject" });

engine.loadScenario({
  name: "network-degradation",
  targets: [
    {
      selector: "api.*",
      faults: [
        { type: "latency", config: { minDelay: 100, maxDelay: 500 }, probability: 0.3 },
        { type: "timeout", config: { timeout: 3000 }, probability: 0.1 },
      ],
    },
  ],
});

const response = await engine.intercept({
  id: "1",
  name: "api.search",
  arguments: { query: "hello" },
  timestamp: Date.now(),
});

console.log(response.error ? `FAULT: ${response.error.code}` : "OK");
```

## Engine Modes

The engine operates in one of three modes, switchable at any time:

| Mode | Behavior |
|------|----------|
| `"inject"` | Faults are injected based on loaded scenarios (default) |
| `"passthrough"` | All calls pass through unmodified |
| `"record"` | Calls pass through but all events are collected via `engine.record()` |

```typescript
engine.setMode("record");
```

## Scenario Format

Scenarios define which tools to target and what faults to inject. Targets use glob patterns via `minimatch` (`*`, `**`, `?`, `{a,b}`). Overrides are additive — they add to existing targets rather than replacing them.

```typescript
interface Scenario {
  name: string;                         // Required unique name
  description?: string;
  version?: string;                     // Semver string (e.g. "1.0.0")
  extends?: string | string[];          // Parent scenario paths (up to 20 levels deep)
  defaults?: { probability?: number; delay?: number };
  targets: TargetConfig[];              // Primary fault targets
  overrides?: OverrideConfig[];         // Additive targets, evaluated by priority
  metadata?: { author?; tags?; createdAt?; updatedAt? };
}
```

Each `TargetConfig` has a `selector: string` and `faults: FaultConfig[]`. Each `FaultConfig` has a `type`, `config` (type-specific), optional `probability` (0–1), and optional `conditions` (time-window / call-count / error-rate).

## API Reference

### `createChaosEngine(config?)`

Factory that returns a `ChaosEngine` pre-registered with all 8 standard injectors.

```typescript
function createChaosEngine(config?: ChaosEngineConfig): ChaosEngine;

interface ChaosEngineConfig {
  scenarios?: Scenario[];           // Pre-loaded scenarios
  mode?: EngineMode;                // "inject" (default) | "passthrough" | "record"
  middlewareTimeout?: number;       // ms, default 30000, 0 = no timeout
  observability?: { logging?: { level?: "debug" | "info" | "warn" | "error"; format?: "json" | "text"; destination?: string } };
  randomSource?: RandomSource;      // default: MathRandom
}
```

### `ChaosEngine` (class)

```typescript
class ChaosEngine {
  mode: EngineMode;
  scenarios: Scenario[];
  injectors: Map<FaultType, Injector>;

  constructor(config?: ChaosEngineConfig);

  loadScenario(scenario: Scenario): void;          // Load a scenario (emits "scenario_loaded" event)
  unloadScenario(scenarioName: string): void;      // Remove by name
  setMode(mode: EngineMode): void;
  intercept(call: ToolCall): Promise<ToolResponse>; // Main entry point — process a tool call through middleware
  registerInjector(injector: Injector): void;       // Register a custom injector
  record(): ChaosEvent[];                           // Get all recorded events
  reset(): void;                                    // Clear events, call history, and injector state
}
```

### `Middleware` (class)

Intercepts tool calls and applies faults from loaded scenarios.

```typescript
class Middleware {
  constructor(engine: ChaosEngine, config?: MiddlewareConfig);

  execute(call: ToolCall, scenarios: Scenario[]): Promise<ToolResponse>;
  getCallHistory(): Array<{ call: ToolCall; response: ToolResponse }>;
  clearCallHistory(): void;
}

interface MiddlewareConfig {
  timeout?: number;        // ms, 0 = no timeout
  randomSource?: RandomSource;
  logger?: Logger;
}
```

### `Logger` (class)

Structured logging with JSON or text output. Writes to `stdout`/`stderr` or a file path.

```typescript
class Logger {
  constructor(config?: { logging?: { level?: "debug" | "info" | "warn" | "error"; format?: "json" | "text"; destination?: string } });

  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
```

### `RandomSource` (interface + implementations)

```typescript
interface RandomSource {
  random(): number;  // Returns 0–1
}

class MathRandom implements RandomSource { random(): number; }
class SeededRandom implements RandomSource {
  constructor(seed: number);  // Mulberry32 PRNG
  random(): number;           // Deterministic, repeatable
}
```

### `Injector` Interface

The contract for all fault injectors. Implement this to create custom fault types.

```typescript
interface Injector {
  readonly type: FaultConfig["type"];
  canInject(fault: FaultConfig, context: InjectionContext): boolean;
  inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult>;
  resetCallCount?(): void;  // Optional — only TokenLimitInjector implements this
}

interface InjectionContext {
  toolCall: ToolCall;
  scenario: Scenario;
  previousCalls: ToolCall[];
  previousResponses: ToolResponse[];
  randomSource: RandomSource;
}

interface InjectionResult {
  shouldInject: boolean;
  mockResponse?: ToolResponse;
  error?: ToolError;
}
```

### Standard Injectors

All eight injectors are registered by default. Each implements the `Injector` interface with a no-arg constructor.

| Class | `type` | Behavior |
|-------|--------|----------|
| `LatencyInjector` | `"latency"` | Sleeps for a sampled delay (supports uniform, exponential, normal, and burst distributions) |
| `TimeoutInjector` | `"timeout"` | Returns a `TIMEOUT` error immediately |
| `RateLimitInjector` | `"rateLimit"` | Returns a `RATE_LIMIT_EXCEEDED` error with optional retry headers |
| `TokenLimitInjector` | `"tokenLimit"` | Tracks per-tool call counts; triggers after `triggerAfter` calls |
| `MalformedOutputInjector` | `"malformedOutput"` | Corrupts output (5 patterns: truncated, invalidJson, missingFields, wrongType, extraFields) |
| `StaleContextInjector` | `"staleContext"` | Returns expired/outdated cached results |
| `ContradictionInjector` | `"contradiction"` | Returns conflicting values across tool fields |
| `PartialFailureInjector` | `"partialFailure"` | Probabilistic partial failure with optional degraded results |

Create all at once:

```typescript
import { createStandardInjectors } from "@reaatech/agent-chaos-core";
const injectors = createStandardInjectors();
```

### Fault Type Config Shapes

| Fault Type | Required | Optional |
|------------|----------|----------|
| `"latency"` | `minDelay`, `maxDelay` | `distribution`: `"uniform"` (default), `"exponential"`, `"normal"`, `"burst"` |
| `"timeout"` | `timeout` | `message` |
| `"rateLimit"` | — | `retryAfter` (default: 60), `includeHeaders`, `message` |
| `"tokenLimit"` | — | `triggerAfter` (default: 1), `remainingTokens` (default: 100), `maxTokens` (default: 4096), `includeSuggestions` |
| `"malformedOutput"` | — | `patterns[]`: `"truncated"`, `"invalidJson"`, `"missingFields"`, `"wrongType"`, `"extraFields"` |
| `"staleContext"` | — | `stalenessSeconds` (default: 3600), `markAsFresh` |
| `"contradiction"` | `conflicts: Array<{ field, values[] }>` | — |
| `"partialFailure"` | — | `failureRate` (default: 0.5), `errorTypes[]`, `degradedResult` |

### Distribution Functions

```typescript
type DistributionType = "uniform" | "exponential" | "normal" | "burst";

function sampleDistribution(
  config: { type: DistributionType; min: number; max: number; threshold?: number },
  random?: RandomSource
): number;
```

### Type Definitions

```typescript
interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface ToolResponse {
  id: string;
  toolName: string;
  result: unknown;
  error?: ToolError;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface ToolError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ChaosEvent {
  type: "fault_injected" | "tool_called" | "scenario_loaded" | "scenario_unloaded";
  timestamp: number;
  data: Record<string, unknown>;
}
```

## Usage Patterns

### Custom Injector

```typescript
import { Injector, InjectionContext, InjectionResult, FaultConfig } from "@reaatech/agent-chaos-core";

class CircuitBreakerInjector implements Injector {
  readonly type = "circuitBreaker" as const;

  canInject(_fault: FaultConfig, context: InjectionContext): boolean {
    const failures = context.previousResponses.filter((r) => r.error).length;
    const successes = context.previousResponses.filter((r) => !r.error).length;
    return failures > successes;
  }

  async inject(_fault: FaultConfig, _context: InjectionContext): Promise<InjectionResult> {
    return {
      shouldInject: true,
      mockResponse: {
        id: crypto.randomUUID(),
        toolName: "custom",
        result: null,
        duration: 0,
        timestamp: Date.now(),
        error: { code: "CIRCUIT_OPEN", message: "Circuit breaker is open" },
      },
    };
  }
}

engine.registerInjector(new CircuitBreakerInjector());
```

### Deterministic Testing

```typescript
import { createChaosEngine, SeededRandom } from "@reaatech/agent-chaos-core";

const engine = createChaosEngine({
  mode: "inject",
  randomSource: new SeededRandom(42),
});

// All fault selection is now deterministic and repeatable
```

## Related Packages

- [`@reaatech/agent-chaos-cli`](https://www.npmjs.com/package/@reaatech/agent-chaos-cli) — Command-line interface for validate, generate, and run
- [`@reaatech/agent-chaos-scenarios`](https://www.npmjs.com/package/@reaatech/agent-chaos-scenarios) — Scenario loader, schema validator, and built-in templates

## License

[MIT](./LICENSE)
