# Skill: create-engine

## Description

Build the ChaosEngine core class that orchestrates fault injection. The ChaosEngine is the central component that loads scenarios, manages injectors, and coordinates the middleware chain.

## Prerequisites

- Monorepo initialized (run `init-monorepo` first)
- TypeScript configured (run `configure-typescript` recommended)
- Core package exists in packages/core/

## Input Parameters

| Parameter     | Type    | Required | Description                                                                |
| ------------- | ------- | -------- | -------------------------------------------------------------------------- |
| mode          | string  | no       | Default engine mode: 'passthrough', 'inject', 'record' (default: 'inject') |
| observability | boolean | no       | Enable observability features (default: true)                              |

## Execution Steps

1. Create core type definitions in packages/core/src/types/
2. Implement ChaosEngine class with scenario management
3. Add probability-based fault selection logic
4. Implement middleware chain execution
5. Add event emission for observability
6. Create factory function for engine instantiation
7. Add configuration validation
8. Export public API from packages/core/src/index.ts

## Output

- ChaosEngine class implementation
- Type definitions for engine configuration
- Factory functions for engine creation
- Public API exports

## Example Usage

```
Please execute the "create-engine" skill with:
- mode: "inject"
- observability: true
```

## Error Handling

- If scenario loading fails, provide detailed error messages
- If invalid configuration detected, throw descriptive errors
- If injector registration fails, log warning and continue with available injectors

## Implementation Details

### Core Types (packages/core/src/types/engine.ts)

```typescript
export type EngineMode = 'passthrough' | 'inject' | 'record';

export interface ChaosEngineConfig {
  mode?: EngineMode;
  scenarios?: Scenario[];
  observability?: ObservabilityConfig;
  defaultProbability?: number;
}

export interface ChaosEngine {
  mode: EngineMode;
  scenarios: Scenario[];
  injectors: Map<FaultType, Injector>;

  loadScenario(scenario: Scenario): void;
  unloadScenario(scenarioName: string): void;
  setMode(mode: EngineMode): void;
  intercept(call: ToolCall): Promise<ToolResponse>;
  record(): ChaosEvent[];
  reset(): void;
}
```

### ChaosEngine Implementation (packages/core/src/ChaosEngine.ts)

```typescript
import { v4 as uuidv4 } from 'uuid';
import type {
  ChaosEngine,
  ChaosEngineConfig,
  ToolCall,
  ToolResponse,
  Scenario,
  Injector,
  FaultType,
  ChaosEvent,
} from './types';
import { ScenarioLoader } from './ScenarioLoader';
import { Middleware } from './Middleware';
import { Logger } from './utils/Logger';

export class ChaosEngine implements ChaosEngine {
  public mode: EngineMode;
  public scenarios: Scenario[] = [];
  public injectors: Map<FaultType, Injector> = new Map();

  private scenarioLoader: ScenarioLoader;
  private middleware: Middleware;
  private logger: Logger;
  private events: ChaosEvent[] = [];
  private callHistory: { call: ToolCall; response: ToolResponse }[] = [];

  constructor(config: ChaosEngineConfig = {}) {
    this.mode = config.mode ?? 'inject';
    this.logger = new Logger(config.observability);
    this.scenarioLoader = new ScenarioLoader();
    this.middleware = new Middleware(this);

    if (config.scenarios) {
      config.scenarios.forEach((scenario) => this.loadScenario(scenario));
    }
  }

  loadScenario(scenario: Scenario): void {
    this.scenarioLoader.validate(scenario);
    this.scenarios.push(scenario);
    this.logger.info('Scenario loaded', { name: scenario.name });
    this.emitEvent({
      type: 'scenario_loaded',
      timestamp: Date.now(),
      data: { scenarioName: scenario.name },
    });
  }

  unloadScenario(scenarioName: string): void {
    const index = this.scenarios.findIndex((s) => s.name === scenarioName);
    if (index !== -1) {
      this.scenarios.splice(index, 1);
      this.logger.info('Scenario unloaded', { name: scenarioName });
    }
  }

  setMode(mode: EngineMode): void {
    this.mode = mode;
    this.logger.info('Engine mode changed', { mode });
  }

  async intercept(call: ToolCall): Promise<ToolResponse> {
    if (this.mode === 'passthrough') {
      return this.passthrough(call);
    }

    return this.middleware.execute(call, this.scenarios);
  }

  registerInjector(injector: Injector): void {
    this.injectors.set(injector.type, injector);
    this.logger.debug('Injector registered', { type: injector.type });
  }

  record(): ChaosEvent[] {
    return [...this.events];
  }

  reset(): void {
    this.events = [];
    this.callHistory = [];
    this.logger.info('Engine reset');
  }

  private passthrough(call: ToolCall): Promise<ToolResponse> {
    // In passthrough mode, calls are not modified
    return Promise.resolve({
      id: call.id,
      toolName: call.name,
      result: null,
      duration: 0,
      timestamp: Date.now(),
    });
  }

  private emitEvent(event: ChaosEvent): void {
    this.events.push(event);
    this.logger.debug('Event emitted', { type: event.type });
  }
}

export function createChaosEngine(config: ChaosEngineConfig = {}): ChaosEngine {
  return new ChaosEngine(config);
}
```

### Public API (packages/core/src/index.ts)

```typescript
export { ChaosEngine, createChaosEngine } from './ChaosEngine';
export { Middleware } from './Middleware';
export { ScenarioLoader } from './ScenarioLoader';
export * from './types';
export * from './injectors';
```
