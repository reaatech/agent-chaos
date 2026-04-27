# @agent-chaos/cli

> Command-line interface for agent-chaos.

## Installation

```bash
npm install -g @agent-chaos/cli
```

## Commands

### `init`

Initialize a new agent-chaos project with a `scenarios/` directory and a sample scenario.

```bash
agent-chaos init
```

### `generate`

Generate a scenario template from the built-in collection.

```bash
agent-chaos generate network-degradation --output ./scenarios
```

Available templates: `network-degradation`, `provider-outage`, `rate-limit-storm`, `token-exhaustion`, `contradiction`.

### `validate`

Validate a scenario file against the JSON Schema.

```bash
agent-chaos validate ./scenarios/network-degradation.yaml
```

Supports both YAML (`.yaml`, `.yml`) and JSON (`.json`) formats.

### `run`

Load and display a scenario with optional hot-reload via file watching.

```bash
agent-chaos run ./scenarios/network-degradation.yaml --watch
```

## Programmatic Usage

```typescript
import { runCommand } from '@agent-chaos/cli';

await runCommand('./scenarios/my-scenario.yaml', { watch: true });
```
