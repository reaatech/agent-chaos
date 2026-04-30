# Skill: create-scenario-loader

## Description

Build the scenario file parser and loader that reads YAML/JSON configuration files and validates them against the schema. This skill creates the ScenarioLoader class for loading and validating chaos scenarios.

## Prerequisites

- Monorepo initialized (run `init-monorepo` first)
- Core types defined (run `create-engine` first)
- TypeScript configured

## Input Parameters

| Parameter  | Type    | Required | Description                                        |
| ---------- | ------- | -------- | -------------------------------------------------- |
| formats    | array   | no       | Supported file formats (default: ['yaml', 'json']) |
| validation | boolean | no       | Enable schema validation (default: true)           |

## Execution Steps

1. Create JSON Schema for scenario validation
2. Implement ScenarioLoader class with file parsing
3. Add YAML and JSON parsing support
4. Implement schema validation with AJV
5. Add error reporting with line numbers
6. Create scenario templates directory
7. Add hot-reload support (optional)
8. Export from scenarios package

## Output

- ScenarioLoader class implementation
- JSON Schema for validation
- Pre-built scenario templates
- Error reporting utilities

## Example Usage

```
Please execute the "create-scenario-loader" skill with:
- formats: ["yaml", "json"]
- validation: true
```

## Error Handling

- Provide detailed parsing errors with line numbers
- Validate all required fields
- Report schema validation errors clearly
- Handle file not found gracefully

## Implementation Details

### JSON Schema (packages/scenarios/src/schemas/scenario-schema.json)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://raw.githubusercontent.com/reaatech/agent-chaos/main/packages/scenarios/scenario-schema.json",
  "title": "Agent Chaos Scenario",
  "description": "A chaos engineering scenario for agent systems",
  "type": "object",
  "required": ["name", "targets"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "description": "Unique name for the scenario"
    },
    "description": {
      "type": "string",
      "description": "Human-readable description of the scenario"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version of the scenario"
    },
    "defaults": {
      "type": "object",
      "properties": {
        "probability": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "default": 0.1
        },
        "delay": {
          "type": "number",
          "minimum": 0
        }
      }
    },
    "targets": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["selector", "faults"],
        "properties": {
          "selector": {
            "type": "string",
            "minLength": 1,
            "description": "Tool name pattern (supports wildcards)"
          },
          "faults": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": ["type"],
              "properties": {
                "type": {
                  "type": "string",
                  "enum": [
                    "latency",
                    "timeout",
                    "rateLimit",
                    "malformedOutput",
                    "tokenLimit",
                    "staleContext",
                    "contradiction",
                    "partialFailure"
                  ]
                },
                "config": {
                  "type": "object"
                },
                "probability": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1
                },
                "conditions": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": ["type"],
                    "properties": {
                      "type": {
                        "type": "string",
                        "enum": ["timeWindow", "callCount", "errorRate"]
                      },
                      "config": {
                        "type": "object"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "overrides": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["selector", "faults"],
        "properties": {
          "selector": {
            "type": "string"
          },
          "priority": {
            "type": "number",
            "default": 100
          },
          "faults": {
            "type": "array",
            "items": {
              "type": "object"
            }
          }
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "author": {
          "type": "string"
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "created": {
          "type": "string",
          "format": "date-time"
        }
      }
    }
  }
}
```

### ScenarioLoader Implementation (packages/scenarios/src/ScenarioLoader.ts)

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import YAML from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { Scenario } from '@reaatech/agent-chaos-core';
import { Logger } from './utils/Logger';

export interface ScenarioLoaderOptions {
  formats?: ('yaml' | 'json')[];
  validation?: boolean;
  schemaPath?: string;
}

export interface ValidationError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  details?: unknown;
}

export class ScenarioLoader {
  private logger: Logger;
  private ajv: Ajv;
  private supportedFormats: string[];
  private validationEnabled: boolean;
  private schemaPath: string;
  private loadedScenarios: Map<string, Scenario> = new Map();

  constructor(options: ScenarioLoaderOptions = {}) {
    this.logger = new Logger();
    this.supportedFormats = options.formats ?? ['yaml', 'json'];
    this.validationEnabled = options.validation ?? true;
    this.schemaPath = options.schemaPath ?? path.join(__dirname, '../schemas/scenario-schema.json');

    // Initialize AJV validator
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
  }

  async load(filePath: string): Promise<Scenario> {
    const absolutePath = path.resolve(filePath);

    // Check cache
    if (this.loadedScenarios.has(absolutePath)) {
      this.logger.debug('Loading from cache', { path: absolutePath });
      return this.loadedScenarios.get(absolutePath)!;
    }

    try {
      // Read file
      const content = await fs.readFile(absolutePath, 'utf-8');

      // Parse based on extension
      const scenario = this.parseContent(content, absolutePath);

      // Validate
      if (this.validationEnabled) {
        this.validate(scenario, absolutePath);
      }

      // Cache
      this.loadedScenarios.set(absolutePath, scenario);

      this.logger.info('Scenario loaded', {
        name: scenario.name,
        path: absolutePath,
      });

      return scenario;
    } catch (error) {
      if (error instanceof ScenarioLoadError) {
        throw error;
      }

      throw new ScenarioLoadError(
        absolutePath,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async loadAll(directoryPath: string): Promise<Scenario[]> {
    const absolutePath = path.resolve(directoryPath);
    const scenarios: Scenario[] = [];

    try {
      const files = await fs.readdir(absolutePath);

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const format = ext.slice(1);

        if (this.supportedFormats.includes(format)) {
          const filePath = path.join(absolutePath, file);
          try {
            const scenario = await this.load(filePath);
            scenarios.push(scenario);
          } catch (error) {
            this.logger.warn('Failed to load scenario', {
              file: filePath,
              error: error instanceof Error ? error.message : error,
            });
          }
        }
      }

      return scenarios;
    } catch (error) {
      throw new ScenarioLoadError(
        absolutePath,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  validate(scenario: Scenario, filePath?: string): void {
    if (!this.validationEnabled) {
      return;
    }

    // Load schema
    const schema = require(this.schemaPath);

    const valid = this.ajv.validate(schema, scenario);

    if (!valid) {
      const errors = this.ajv.errors || [];
      const errorMessages = errors.map((err) => {
        const path = err.instancePath || '/';
        return `${path}: ${err.message}`;
      });

      throw new ScenarioValidationError(filePath ?? 'unknown', errorMessages, errors);
    }

    this.logger.debug('Scenario validated', { name: scenario.name });
  }

  private parseContent(content: string, filePath: string): Scenario {
    const ext = path.extname(filePath).toLowerCase();

    try {
      switch (ext) {
        case '.yaml':
        case '.yml':
          return YAML.parse(content) as Scenario;

        case '.json':
          return JSON.parse(content) as Scenario;

        default:
          throw new Error(`Unsupported file format: ${ext}`);
      }
    } catch (error) {
      throw new ScenarioParseError(
        filePath,
        error instanceof Error ? error.message : 'Unknown parsing error'
      );
    }
  }

  clearCache(): void {
    this.loadedScenarios.clear();
    this.logger.debug('Scenario cache cleared');
  }

  getLoadedScenarios(): Scenario[] {
    return Array.from(this.loadedScenarios.values());
  }
}

// Custom error classes
export class ScenarioLoadError extends Error {
  constructor(
    public readonly filePath: string,
    message: string
  ) {
    super(`Failed to load scenario from ${filePath}: ${message}`);
    this.name = 'ScenarioLoadError';
  }
}

export class ScenarioParseError extends Error {
  constructor(
    public readonly filePath: string,
    message: string
  ) {
    super(`Failed to parse scenario ${filePath}: ${message}`);
    this.name = 'ScenarioParseError';
  }
}

export class ScenarioValidationError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly messages: string[],
    public readonly details?: unknown
  ) {
    super(`Validation failed for ${filePath}:\n${messages.join('\n')}`);
    this.name = 'ScenarioValidationError';
  }
}

export function createScenarioLoader(options: ScenarioLoaderOptions = {}): ScenarioLoader {
  return new ScenarioLoader(options);
}
```

### Scenario Templates (packages/scenarios/src/templates/)

#### Network Degradation Template (packages/scenarios/src/templates/network-degradation.yaml)

```yaml
name: Network Degradation Scenario
description: Simulates various network-related failures for testing agent resilience
version: '1.0.0'

defaults:
  probability: 0.1

targets:
  - selector: '*'
    faults:
      - type: latency
        config:
          minDelay: 1000
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
          patterns:
            - truncated
            - invalidJson
            - missingFields
        probability: 0.1

  - selector: 'database.*'
    faults:
      - type: partialFailure
        config:
          failureRate: 0.3
          errorTypes:
            - connectionRefused
            - queryTimeout

metadata:
  author: agent-chaos
  tags:
    - network
    - degradation
    - testing
  created: '2026-04-21T00:00:00.000Z'
```

#### Provider Outage Template (packages/scenarios/src/templates/provider-outage.yaml)

```yaml
name: Provider Outage Scenario
description: Simulates complete provider unavailability
version: '1.0.0'

targets:
  - selector: '*'
    faults:
      - type: timeout
        config:
          timeout: 1000
        probability: 0.5

      - type: rateLimit
        config:
          retryAfter: 300
          message: 'Service temporarily unavailable. Please try again later.'
        probability: 0.3

metadata:
  author: agent-chaos
  tags:
    - outage
    - provider
    - critical
```

#### Token Exhaustion Template (packages/scenarios/src/templates/token-exhaustion.yaml)

```yaml
name: Token Exhaustion Scenario
description: Simulates context window and token limit issues
version: '1.0.0'

targets:
  - selector: '*'
    faults:
      - type: tokenLimit
        config:
          triggerAfter: 5
          remainingTokens: 100
          maxTokens: 4096
          includeSuggestions: true
        probability: 0.2

      - type: staleContext
        config:
          stalenessSeconds: 3600
          markAsFresh: false
        probability: 0.1

metadata:
  author: agent-chaos
  tags:
    - tokens
    - context
    - limits
```

### Scenarios Package Index (packages/scenarios/src/index.ts)

```typescript
export {
  ScenarioLoader,
  createScenarioLoader,
  ScenarioLoadError,
  ScenarioParseError,
  ScenarioValidationError,
  type ScenarioLoaderOptions,
  type ValidationError,
} from './ScenarioLoader';

export { SchemaValidator } from './SchemaValidator';

// Re-export templates as strings for programmatic use
export const templates = {
  networkDegradation: require('./templates/network-degradation.yaml'),
  providerOutage: require('./templates/provider-outage.yaml'),
  tokenExhaustion: require('./templates/token-exhaustion.yaml'),
  rateLimitStorm: require('./templates/rate-limit-storm.yaml'),
  contradictoryWorld: require('./templates/contradictory-world.yaml'),
};
```

### Schema Validator (packages/scenarios/src/SchemaValidator.ts)

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { Scenario } from '@reaatech/agent-chaos-core';

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
    keyword: string;
  }>;
}

export class SchemaValidator {
  private ajv: Ajv;
  private schema: object;

  constructor(schemaPath?: string) {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);

    // Load schema
    this.schema = require(schemaPath ?? '../schemas/scenario-schema.json');
  }

  validate(scenario: Scenario): ValidationResult {
    const valid = this.ajv.validate(this.schema, scenario);

    if (valid) {
      return { valid: true };
    }

    const errors = (this.ajv.errors || []).map((err) => ({
      path: err.instancePath || '/',
      message: err.message || 'Unknown error',
      keyword: err.keyword || 'unknown',
    }));

    return { valid: false, errors };
  }

  validateFile(content: string, format: 'yaml' | 'json'): ValidationResult {
    let scenario: Scenario;

    try {
      if (format === 'yaml') {
        const YAML = require('yaml');
        scenario = YAML.parse(content);
      } else {
        scenario = JSON.parse(content);
      }
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: '/',
            message: `Failed to parse ${format}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            keyword: 'parse',
          },
        ],
      };
    }

    return this.validate(scenario);
  }
}
```
