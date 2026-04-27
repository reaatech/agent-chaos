# @agent-chaos/scenarios

> Scenario loader, schema validator, and templates for agent-chaos.

## Installation

```bash
npm install @agent-chaos/scenarios
```

## Usage

### Loading a scenario from YAML

```typescript
import { createScenarioLoader } from '@agent-chaos/scenarios';

const loader = createScenarioLoader();

const scenario = await loader.load('./scenarios/network-degradation.yaml');
console.log(scenario.name);

// Load all scenarios from a directory
const scenarios = await loader.loadAll('./scenarios/');
```

### Validating a scenario

```typescript
import { SchemaValidator } from '@agent-chaos/scenarios';

const validator = new SchemaValidator();
const result = await validator.validate(scenario);

if (!result.valid) {
  for (const error of result.errors ?? []) {
    console.log(`${error.path}: ${error.message}`);
  }
}
```

### Hot-reload with file watching

```typescript
const loader = createScenarioLoader();

loader.watch('./scenarios/my-scenario.yaml');
loader.onReload((reloaded) => {
  console.log('Scenario reloaded:', reloaded.name);
});
```

### Scenario composition via `extends`

```yaml
name: My Extended Scenario
extends: ./base-scenario.yaml
targets:
  - selector: 'api.v2.*'
    faults:
      - type: timeout
        config:
          timeout: 5000
```

## API

- `createScenarioLoader(options?)` — Create a new scenario loader.
- `ScenarioLoader` — Loads, validates, caches, and watches YAML/JSON scenarios.
- `SchemaValidator` — Validates scenarios against the JSON Schema.
- `ScenarioLoadError` / `ScenarioParseError` / `ScenarioValidationError` — Typed error classes.

## Templates

Built-in scenario templates are available at:

- `@agent-chaos/scenarios/templates/network-degradation.yaml`
- `@agent-chaos/scenarios/templates/provider-outage.yaml`
- `@agent-chaos/scenarios/templates/rate-limit-storm.yaml`
- `@agent-chaos/scenarios/templates/token-exhaustion.yaml`
- `@agent-chaos/scenarios/templates/contradiction.yaml`
