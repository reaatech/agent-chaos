# @reaatech/agent-chaos-scenarios

[![npm version](https://img.shields.io/npm/v/@reaatech/agent-chaos-scenarios.svg)](https://www.npmjs.com/package/@reaatech/agent-chaos-scenarios)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-chaos/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/agent-chaos/ci.yml?branch=main&label=CI)](https://github.com/reaatech/agent-chaos/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Scenario loader, schema validator, and built-in templates for agent-chaos. Load chaos scenarios from YAML and JSON files, validate them against a JSON Schema, compose them via `extends`, and hot-reload on file changes — the configuration backbone of the agent-chaos fault injection toolkit.

## Installation

```bash
npm install @reaatech/agent-chaos-scenarios
# or
pnpm add @reaatech/agent-chaos-scenarios
```

## Feature Overview

- **YAML and JSON parsing** — load single scenarios or entire directories
- **JSON Schema validation** — validate against a Draft 07 schema with detailed error reporting
- **Scenario composition** — inherit from one or more parent scenarios via `extends` (up to 20 levels deep)
- **Circular reference detection** — built-in cycle detection with clear error messages
- **Hot reloading** — `fs.watch`-based file watching with 100ms debounce
- **Caching** — loaded scenarios are cached by absolute path with concurrent-load protection
- **5 built-in templates** — network-degradation, provider-outage, rate-limit-storm, token-exhaustion, contradiction
- **Zero runtime dependencies** beyond `yaml`, `ajv`, and `ajv-formats`
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import { createScenarioLoader, SchemaValidator } from "@reaatech/agent-chaos-scenarios";

// Load a single scenario from YAML
const loader = createScenarioLoader();
const scenario = await loader.load("./scenarios/network-degradation.yaml");

// Load all scenarios in a directory (skips invalid files)
const allScenarios = await loader.loadAll("./scenarios/");

// Validate a scenario programmatically
const validator = new SchemaValidator();
const result = await validator.validate(scenario);

if (!result.valid) {
  for (const error of result.errors ?? []) {
    console.log(`${error.path}: ${error.message}`);
  }
}
```

## API Reference

### `ScenarioLoader` (class)

Loads, parses, caches, validates, and watches chaos scenarios.

```typescript
class ScenarioLoader {
  constructor(options?: ScenarioLoaderOptions);

  load(filePath: string): Promise<Scenario>;                       // Load single scenario (cached)
  loadAll(directoryPath: string): Promise<Scenario[]>;              // Load all supported files in directory
  validate(scenario: Scenario, filePath?: string): Promise<void>;   // Validate against JSON Schema
  watch(filePath: string): void;                                    // Start watching for file changes
  unwatch(filePath?: string): void;                                 // Stop watching (all if no argument)
  onReload(callback: (scenario: Scenario) => void): () => void;     // Register reload listener; returns unbind
  clearCache(): void;                                               // Clear all cached scenarios
  getLoadedScenarios(): Scenario[];                                 // Return all cached scenarios
}

function createScenarioLoader(options?: ScenarioLoaderOptions): ScenarioLoader;
```

#### `ScenarioLoaderOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `formats` | `("yaml" \| "json")[]` | `["yaml", "json"]` | Supported file formats |
| `validation` | `boolean` | `true` | Enable/disable schema validation |
| `schemaPath` | `string` | built-in schema | Path to a custom JSON Schema file |

### `SchemaValidator` (class)

Validates scenarios against the built-in JSON Schema (Draft 07).

```typescript
class SchemaValidator {
  constructor(schemaPath?: string);  // default: built-in ./schemas/scenario-schema.json

  validate(scenario: Scenario): Promise<ValidationResult>;            // Validate a Scenario object
  validateFile(content: string, format: "yaml" | "json"): Promise<ValidationResult>;  // Validate raw file content
}

interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;      // JSON path to the error (e.g. "/targets/0/faults/0/config/minDelay")
    message: string;   // Human-readable message
    keyword: string;   // JSON Schema keyword that failed
  }>;
}
```

### Error Classes

Typed errors for precise error handling:

| Class | Extends | Properties | When |
|-------|---------|------------|------|
| `ScenarioLoadError` | `Error` | `filePath` | Missing file, circular extends, max depth exceeded |
| `ScenarioParseError` | `Error` | `filePath` | Invalid YAML or JSON syntax |
| `ScenarioValidationError` | `Error` | `filePath`, `messages[]`, `details?` | Schema validation failure |

## Scenario Composition

Scenarios can compose from one or more parent scenarios via the `extends` field:

```yaml
# child.yaml
name: Production Network
extends:
  - base-network.yaml
  - base-provider.yaml
targets:
  - selector: "api.v2.*"
    faults:
      - type: timeout
        config:
          timeout: 5000
```

| Rule | Behavior |
|------|----------|
| **Max depth** | 20 levels of `extends` |
| **Circular detection** | Built-in; throws `ScenarioLoadError` with the full chain path |
| **Target merging** | Child targets with same selector **replace** parent targets |
| **Override merging** | Child overrides with same selector **replace** parent overrides |
| **Defaults merging** | Child defaults override parent defaults; unmatched parent defaults are preserved |

## Hot Reloading

Watch a scenario file and respond to changes in real time:

```typescript
const loader = createScenarioLoader();

await loader.load("./scenarios/my-scenario.yaml");

loader.watch("./scenarios/my-scenario.yaml");
loader.onReload((reloaded) => {
  console.log("Scenario reloaded:", reloaded.name);
  engine.unloadScenario(oldName);
  engine.loadScenario(reloaded);
});

// Later
loader.unwatch(); // Stop all watchers
```

- Uses `fs.watch` with a 100ms debounce
- Handles file `change`, `rename`, and deletion events
- Prevents duplicate watchers on the same file

## Built-in Templates

Five pre-built scenario templates ship with this package:

| Template | Package Path |
|----------|-------------|
| `network-degradation` | `@reaatech/agent-chaos-scenarios/templates/network-degradation.yaml` |
| `provider-outage` | `@reaatech/agent-chaos-scenarios/templates/provider-outage.yaml` |
| `rate-limit-storm` | `@reaatech/agent-chaos-scenarios/templates/rate-limit-storm.yaml` |
| `token-exhaustion` | `@reaatech/agent-chaos-scenarios/templates/token-exhaustion.yaml` |
| `contradiction` | `@reaatech/agent-chaos-scenarios/templates/contradiction.yaml` |

Resolve templates programmatically:

```typescript
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const path = require.resolve("@reaatech/agent-chaos-scenarios/templates/network-degradation.yaml");
```

## JSON Schema

The built-in Draft 07 schema validates:

- `name` — required string (minLength 1)
- `version` — semver pattern (`^\d+\.\d+\.\d+$`)
- `defaults.probability` — number 0–1
- `defaults.delay` — number ≥ 0
- `targets` — required array, minItems 1, each with `selector` and `faults`
- `faults` — required array, minItems 1, with type-specific `allOf`/`if`/`then` conditional validation
- `overrides` — optional array of `{ selector, priority?, faults }`
- `metadata` — optional `{ author?, tags?, createdAt?, updatedAt? }`

Use a custom schema:

```typescript
const validator = new SchemaValidator("./path/to/my-schema.json");
```

## Related Packages

- [`@reaatech/agent-chaos-core`](https://www.npmjs.com/package/@reaatech/agent-chaos-core) — Core fault injection engine (consumes scenarios)
- [`@reaatech/agent-chaos-cli`](https://www.npmjs.com/package/@reaatech/agent-chaos-cli) — Command-line interface (uses the loader and validator)

## License

[MIT](./LICENSE)
