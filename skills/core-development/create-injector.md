# Skill: create-injector

## Description

Generate a new fault injector for the agent-chaos system. This skill creates injectors that implement specific fault types like latency, rate limiting, malformed outputs, etc.

## Prerequisites

- Monorepo initialized (run `init-monorepo` first)
- ChaosEngine implemented (run `create-engine` first)
- Middleware implemented (run `create-middleware` recommended)
- Core types defined

## Input Parameters

| Parameter | Type   | Required | Description                                                                                                                       |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| name      | string | yes      | Injector name (e.g., "LatencyInjector")                                                                                           |
| type      | string | yes      | Fault type: 'latency', 'timeout', 'rateLimit', 'malformedOutput', 'tokenLimit', 'staleContext', 'contradiction', 'partialFailure' |
| config    | object | no       | Default configuration for the injector                                                                                            |

## Execution Steps

1. Create injector class file in packages/core/src/injectors/
2. Implement Injector interface (canInject, inject methods)
3. Add type-specific configuration validation
4. Implement fault injection logic
5. Add error handling and edge cases
6. Create unit tests for the injector
7. Export injector from injectors index
8. Register injector in ChaosEngine

## Output

- Injector class implementation
- Configuration validation
- Unit tests
- Exported and registered in core package

## Example Usage

```
Please execute the "create-injector" skill with:
- name: LatencyInjector
- type: latency
- config: { minDelay: 1000, maxDelay: 5000, distribution: "exponential" }
```

## Error Handling

- Validate configuration on injector creation
- Handle edge cases (zero delay, negative values, etc.)
- Provide meaningful error messages for invalid configs
- Gracefully handle injection failures

## Implementation Details

### Base Injector Interface (packages/core/src/types/injector.ts)

```typescript
export interface Injector {
  type: FaultType;
  canInject(fault: FaultConfig, context: InjectionContext): boolean;
  inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult>;
}

export interface InjectionContext {
  toolCall: ToolCall;
  scenario: Scenario;
  previousCalls: ToolCall[];
  previousResponses: ToolResponse[];
}

export interface InjectionResult {
  shouldInject: boolean;
  modifiedCall?: ToolCall;
  mockResponse?: ToolResponse;
  error?: ToolError;
}
```

### Example: LatencyInjector (packages/core/src/injectors/LatencyInjector.ts)

```typescript
import type {
  Injector,
  FaultConfig,
  InjectionContext,
  InjectionResult,
  ToolResponse,
  ToolError,
} from '../types';
import { Logger } from '../utils/Logger';

export interface LatencyConfig {
  minDelay: number;
  maxDelay: number;
  distribution?: 'uniform' | 'exponential' | 'normal';
}

export class LatencyInjector implements Injector {
  public readonly type = 'latency';
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  canInject(fault: FaultConfig, context: InjectionContext): boolean {
    // Validate configuration
    if (!this.isValidConfig(fault.config)) {
      this.logger.warn('Invalid latency configuration', { config: fault.config });
      return false;
    }
    const config = fault.config;
    if (config.minDelay === undefined || config.maxDelay === undefined) {
      this.logger.warn('Invalid latency configuration', { config });
      return false;
    }

    if (config.minDelay < 0 || config.maxDelay < 0) {
      this.logger.warn('Negative delay values not allowed', { config });
      return false;
    }

    if (config.minDelay > config.maxDelay) {
      this.logger.warn('minDelay cannot be greater than maxDelay', { config });
      return false;
    }

    return true;
  }

  async inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult> {
    const config = fault.config as LatencyConfig;
    const delay = this.calculateDelay(config);

    this.logger.debug('Injecting latency', {
      tool: context.toolCall.name,
      delay,
    });

    // Delay execution
    await this.sleep(delay);

    // Return success - the call will proceed normally after the delay
    return {
      shouldInject: true,
    };
  }

  private calculateDelay(config: LatencyConfig): number {
    const { minDelay, maxDelay, distribution = 'uniform' } = config;

    switch (distribution) {
      case 'uniform':
        return Math.random() * (maxDelay - minDelay) + minDelay;

      case 'exponential':
        // Exponential distribution favoring lower delays
        const lambda = 1 / (maxDelay - minDelay);
        return minDelay + Math.floor(-Math.log(1 - Math.random()) / lambda);

      case 'normal':
        // Normal distribution centered around midpoint
        const mean = (minDelay + maxDelay) / 2;
        const stdDev = (maxDelay - minDelay) / 6; // 99.7% within range
        const z = this.gaussianRandom();
        return Math.max(minDelay, Math.min(maxDelay, mean + z * stdDev));

      default:
        return Math.random() * (maxDelay - minDelay) + minDelay;
    }
  }

  private gaussianRandom(): number {
    // Box-Muller transform
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Example: RateLimitInjector (packages/core/src/injectors/RateLimitInjector.ts)

```typescript
import type {
  Injector,
  FaultConfig,
  InjectionContext,
  InjectionResult,
  ToolResponse,
  ToolError,
} from '../types';
import { Logger } from '../utils/Logger';

export interface RateLimitConfig {
  retryAfter?: number;
  includeHeaders?: boolean;
  message?: string;
}

export class RateLimitInjector implements Injector {
  public readonly type = 'rateLimit';
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  canInject(fault: FaultConfig, context: InjectionContext): boolean {
    const config = fault.config as RateLimitConfig;

    // Rate limit config is optional, use defaults if not provided
    if (config && config.retryAfter !== undefined && config.retryAfter < 0) {
      this.logger.warn('Invalid retryAfter value', { retryAfter: config.retryAfter });
      return false;
    }

    return true;
  }

  async inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult> {
    const config = fault.config as RateLimitConfig;
    const retryAfter = config.retryAfter ?? 60;

    this.logger.info('Injecting rate limit', {
      tool: context.toolCall.name,
      retryAfter,
    });

    const error: ToolError = {
      code: 'RATE_LIMIT_EXCEEDED',
      message: config.message ?? 'Rate limit exceeded. Please retry later.',
      details: {
        retryAfter,
        tool: context.toolCall.name,
        timestamp: Date.now(),
      },
    };

    const mockResponse: ToolResponse = {
      id: context.toolCall.id,
      toolName: context.toolCall.name,
      result: null,
      error,
      duration: 0,
      timestamp: Date.now(),
      metadata: config.includeHeaders
        ? {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + retryAfter * 1000).toString(),
          }
        : undefined,
    };

    return {
      shouldInject: true,
      mockResponse,
    };
  }
}
```

### Example: MalformedOutputInjector (packages/core/src/injectors/MalformedOutputInjector.ts)

```typescript
import type {
  Injector,
  FaultConfig,
  InjectionContext,
  InjectionResult,
  ToolResponse,
} from '../types';
import { Logger } from '../utils/Logger';

export interface MalformedOutputConfig {
  patterns?: ('truncated' | 'invalidJson' | 'missingFields' | 'wrongType' | 'extraFields')[];
  severity?: 'low' | 'medium' | 'high';
}

export class MalformedOutputInjector implements Injector {
  public readonly type = 'malformedOutput';
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  canInject(fault: FaultConfig, context: InjectionContext): boolean {
    const config = fault.config as MalformedOutputConfig;

    if (config.patterns && config.patterns.length === 0) {
      this.logger.warn('No malformed output patterns specified');
      return false;
    }

    return true;
  }

  async inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult> {
    const config = fault.config as MalformedOutputConfig;
    const patterns = config.patterns ?? ['truncated', 'invalidJson', 'missingFields'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    this.logger.info('Injecting malformed output', {
      tool: context.toolCall.name,
      pattern,
    });

    let malformedResult: unknown;

    switch (pattern) {
      case 'truncated':
        malformedResult = this.generateTruncatedOutput();
        break;

      case 'invalidJson':
        malformedResult = this.generateInvalidJson();
        break;

      case 'missingFields':
        malformedResult = this.generateMissingFields();
        break;

      case 'wrongType':
        malformedResult = this.generateWrongType();
        break;

      case 'extraFields':
        malformedResult = this.generateExtraFields();
        break;

      default:
        malformedResult = { error: 'Unknown malformed pattern' };
    }

    const mockResponse: ToolResponse = {
      id: context.toolCall.id,
      toolName: context.toolCall.name,
      result: malformedResult,
      duration: Math.random() * 100,
      timestamp: Date.now(),
      metadata: {
        malformed: true,
        pattern,
      },
    };

    return {
      shouldInject: true,
      mockResponse,
    };
  }

  private generateTruncatedOutput(): string {
    const complete = '{"status": "success", "data": {"items": [1, 2, 3, 4, 5]}}';
    const truncatePoint = Math.floor(Math.random() * complete.length);
    return complete.substring(0, truncatePoint);
  }

  private generateInvalidJson(): string {
    const invalidJsons = [
      '{key: "value"}', // Missing quotes on key
      '{"key": "value",}', // Trailing comma
      '{"key": undefined}', // undefined is not valid JSON
      '{key: "value"', // Missing closing brace
      '["item1", "item2",]', // Trailing comma in array
    ];
    return invalidJsons[Math.floor(Math.random() * invalidJsons.length)];
  }

  private generateMissingFields(): Record<string, unknown> {
    // Return object with missing expected fields
    return {
      status: 'partial',
      // Missing 'data' field that agent might expect
    };
  }

  private generateWrongType(): unknown {
    const wrongTypes = [
      null,
      undefined,
      42,
      true,
      'just a string instead of object',
      [],
      () => {}, // Functions can't be serialized
    ];
    return wrongTypes[Math.floor(Math.random() * wrongTypes.length)];
  }

  private generateExtraFields(): Record<string, unknown> {
    return {
      status: 'success',
      data: { items: [1, 2, 3] },
      // Extra unexpected fields
      _internal: 'should not be here',
      __proto__: { polluted: true },
      constructor: { prototype: {} },
    };
  }
}
```

### Register Injectors (packages/core/src/injectors/index.ts)

```typescript
export { ContradictionInjector } from './ContradictionInjector.js';
export { LatencyInjector } from './LatencyInjector.js';
export { MalformedOutputInjector } from './MalformedOutputInjector.js';
export { PartialFailureInjector } from './PartialFailureInjector.js';
export { RateLimitInjector } from './RateLimitInjector.js';
export { StaleContextInjector } from './StaleContextInjector.js';
export { TimeoutInjector } from './TimeoutInjector.js';
export { TokenLimitInjector } from './TokenLimitInjector.js';

// Factory function to create all standard injectors
import { LatencyInjector } from './LatencyInjector';
import { RateLimitInjector } from './RateLimitInjector';
import { MalformedOutputInjector } from './MalformedOutputInjector';
import type { Injector } from '../types';

export function createStandardInjectors(): Injector[] {
  return [
    new LatencyInjector(),
    new RateLimitInjector(),
    new MalformedOutputInjector(),
    // Add other standard injectors
  ];
}
```

### Update ChaosEngine to Register Injectors

```typescript
// In ChaosEngine constructor or initialization
import { createStandardInjectors } from './injectors';

// In constructor:
const standardInjectors = createStandardInjectors();
standardInjectors.forEach((injector) => this.registerInjector(injector));
```
