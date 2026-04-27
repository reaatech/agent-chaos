# Skill: create-middleware

## Description

Create the Middleware class that intercepts tool calls and applies fault injection. The middleware sits between the agent and its tools, transparently wrapping calls and responses.

## Prerequisites

- Monorepo initialized (run `init-monorepo` first)
- ChaosEngine implemented (run `create-engine` first)
- Core types defined

## Input Parameters

| Parameter | Type    | Required | Description                                           |
| --------- | ------- | -------- | ----------------------------------------------------- |
| async     | boolean | no       | Support async tool calls (default: true)              |
| timeout   | number  | no       | Default timeout for tool calls in ms (default: 30000) |

## Execution Steps

1. Create Middleware class with tool call interception
2. Implement scenario matching logic (selector patterns)
3. Add fault selection based on probability
4. Implement response wrapping and modification
5. Add error propagation handling
6. Create middleware chain support
7. Add hooks for observability
8. Export from core package

## Output

- Middleware class implementation
- Tool call interception logic
- Response modification capabilities
- Error handling and propagation

## Example Usage

```
Please execute the "create-middleware" skill with:
- async: true
- timeout: 30000
```

## Error Handling

- If tool call fails, propagate error with context
- If no matching scenario found, passthrough call
- If injector fails, log error and passthrough

## Implementation Details

### Middleware Types (packages/core/src/types/middleware.ts)

```typescript
export interface MiddlewareConfig {
  async?: boolean;
  timeout?: number;
}

export interface MiddlewareContext {
  call: ToolCall;
  scenarios: Scenario[];
  engine: ChaosEngine;
  previousCalls: ToolCall[];
  previousResponses: ToolResponse[];
}

export interface MiddlewareHandler {
  (context: MiddlewareContext): Promise<ToolResponse>;
}
```

### Middleware Implementation (packages/core/src/Middleware.ts)

```typescript
import type {
  ToolCall,
  ToolResponse,
  Scenario,
  FaultConfig,
  InjectionContext,
  ChaosEngine,
} from './types';
import { Logger } from './utils/Logger';
import { matchSelector } from './utils/selector';

export class Middleware {
  private engine: ChaosEngine;
  private logger: Logger;
  private defaultTimeout: number;
  private callHistory: { call: ToolCall; response: ToolResponse }[] = [];

  constructor(engine: ChaosEngine, config: { timeout?: number } = {}) {
    this.engine = engine;
    this.logger = new Logger();
    this.defaultTimeout = config.timeout ?? 30000;
  }

  async execute(call: ToolCall, scenarios: Scenario[]): Promise<ToolResponse> {
    const startTime = Date.now();

    // Build context with call history
    const context: MiddlewareContext = {
      call,
      scenarios,
      engine: this.engine,
      previousCalls: this.callHistory.map((h) => h.call),
      previousResponses: this.callHistory.map((h) => h.response),
    };

    try {
      // Find applicable faults for this tool
      const applicableFaults = this.findApplicableFaults(call.name, scenarios);

      if (applicableFaults.length === 0) {
        // No faults apply, passthrough
        return this.passthrough(call, startTime);
      }

      // Select fault based on probability
      const selectedFault = this.selectFault(applicableFaults);

      if (!selectedFault) {
        // No fault selected based on probability
        return this.passthrough(call, startTime);
      }

      // Execute fault injection
      const injector = this.engine.injectors.get(selectedFault.type);
      if (!injector) {
        this.logger.warn('No injector found for fault type', { type: selectedFault.type });
        return this.passthrough(call, startTime);
      }

      // Build injection context
      const injectionContext: InjectionContext = {
        toolCall: call,
        scenario: scenarios[0], // Primary scenario
        previousCalls: context.previousCalls,
        previousResponses: context.previousResponses,
      };

      // Check if injector should inject
      if (!injector.canInject(selectedFault, injectionContext)) {
        return this.passthrough(call, startTime);
      }

      // Execute injection
      const result = await injector.inject(selectedFault, injectionContext);

      if (result.shouldInject) {
        const response = result.mockResponse ?? {
          id: call.id,
          toolName: call.name,
          result: null,
          error: result.error,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        };

        this.recordCall(call, response);
        this.logger.info('Fault injected', {
          tool: call.name,
          faultType: selectedFault.type,
        });

        return response;
      }

      return this.passthrough(call, startTime);
    } catch (error) {
      this.logger.error('Middleware execution failed', {
        tool: call.name,
        error: error instanceof Error ? error.message : error,
      });

      // On error, return error response
      return {
        id: call.id,
        toolName: call.name,
        result: null,
        error: {
          code: 'MIDDLEWARE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  private findApplicableFaults(toolName: string, scenarios: Scenario[]): FaultConfig[] {
    const faults: FaultConfig[] = [];

    for (const scenario of scenarios) {
      // Check targets
      for (const target of scenario.targets) {
        if (matchSelector(toolName, target.selector)) {
          faults.push(...target.faults);
        }
      }

      // Check overrides (higher priority)
      if (scenario.overrides) {
        for (const override of scenario.overrides) {
          if (matchSelector(toolName, override.selector)) {
            faults.push(...override.faults);
          }
        }
      }
    }

    return faults;
  }

  private selectFault(faults: FaultConfig[]): FaultConfig | null {
    // Sort by priority (overrides first)
    const sorted = [...faults].sort((a, b) => {
      const priorityA = a.probability ?? 0.1;
      const priorityB = b.probability ?? 0.1;
      return priorityB - priorityA;
    });

    // Select based on probability
    for (const fault of sorted) {
      const probability = fault.probability ?? 0.1;
      if (Math.random() < probability) {
        return fault;
      }
    }

    return null;
  }

  private async passthrough(call: ToolCall, startTime: number): Promise<ToolResponse> {
    // In a real implementation, this would call the actual tool
    // For now, return a success response
    const response: ToolResponse = {
      id: call.id,
      toolName: call.name,
      result: null,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };

    this.recordCall(call, response);
    return response;
  }

  private recordCall(call: ToolCall, response: ToolResponse): void {
    this.callHistory.push({ call, response });

    // Keep only last 1000 calls to prevent memory issues
    if (this.callHistory.length > 1000) {
      this.callHistory.shift();
    }
  }

  getCallHistory(): { call: ToolCall; response: ToolResponse }[] {
    return [...this.callHistory];
  }

  clearCallHistory(): void {
    this.callHistory = [];
  }
}
```

### Selector Matching Utility (packages/core/src/utils/selector.ts)

```typescript
import minimatch from 'minimatch';

export function matchSelector(toolName: string, selector: string): boolean {
  // Exact match
  if (selector === '*') return true;
  if (selector === toolName) return true;

  // Pattern matching (supports wildcards)
  return minimatch(toolName, selector);
}
```

### Export from Core Package (packages/core/src/index.ts)

```typescript
// Add to existing exports
export { Middleware } from './Middleware';
export * from './types/middleware';
export { matchSelector } from './utils/selector';
```
