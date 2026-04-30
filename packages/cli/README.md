# @reaatech/agent-chaos-cli

[![npm version](https://img.shields.io/npm/v/@reaatech/agent-chaos-cli.svg)](https://www.npmjs.com/package/@reaatech/agent-chaos-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-chaos/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/agent-chaos/ci.yml?branch=main&label=CI)](https://github.com/reaatech/agent-chaos/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Command-line interface for agent-chaos. Validate scenario files against the JSON Schema, generate scenario templates from a built-in library, run chaos scenarios with hot-reload support, and initialize new chaos testing projects — all from your terminal.

## Installation

```bash
npm install -g @reaatech/agent-chaos-cli
# or run without global install
npx @reaatech/agent-chaos-cli validate ./scenario.yaml
```

## Feature Overview

- **4 commands** — `init`, `generate`, `validate`, and `run` for end-to-end scenario management
- **5 built-in templates** — network-degradation, provider-outage, rate-limit-storm, token-exhaustion, and contradiction
- **Hot reload** — `--watch` flag reloads scenarios on file changes without restarting
- **JSON and YAML** — both `.yaml`/`.yml` and `.json` scenario formats supported
- **Programmatic API** — command functions exported for use in scripts and CI
- **CI/CD ready** — zero-install usage via `npx`; validation exits with non-zero on failure

## Quick Start

```bash
# Initialize a new project
agent-chaos init

# Generate a scenario template
agent-chaos generate network-degradation --output ./scenarios

# Validate your scenario
agent-chaos validate ./scenarios/network-degradation.yaml

# Run a scenario (10 sample tool calls with fault injection)
agent-chaos run ./scenarios/network-degradation.yaml
```

## Commands

### `init`

Creates a `scenarios/` directory and a sample `hello-world.yaml` scenario (latency fault, 100–500ms, 10% probability).

```bash
agent-chaos init
```

### `generate`

Copies a built-in template from `@reaatech/agent-chaos-scenarios/templates/` to your output directory.

```bash
agent-chaos generate <type> [--output <dir>]
```

| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Output directory (default: `.`) |

Available template types:

| Type | Description |
|------|-------------|
| `network-degradation` | Latency (exponential 1–30s, 15%), timeout (5s, 5%), rate limit (60s, 5%) + webSearch/database overrides |
| `provider-outage` | Timeout 1s at 50%, rate limit 300s at 30% |
| `rate-limit-storm` | Cascading rate limits + burst latency + `api.*` override |
| `token-exhaustion` | Token limit (trigger after 5 calls) + stale context |
| `contradiction` | Contradictory data across weather, stock, and database tools |

### `validate`

Validates a scenario file against the built-in JSON Schema.

```bash
agent-chaos validate <file>
```

Supports `.yaml`, `.yml`, and `.json`. Prints a green checkmark on success or lists each validation error with its JSON path on failure. Exits with code 1 on validation failure.

### `run`

Loads a scenario, registers it with the chaos engine, and runs 10 sample tool calls to demonstrate fault injection.

```bash
agent-chaos run <scenario> [--watch]
```

| Option | Description |
|--------|-------------|
| `-w, --watch` | Watch the file for changes and hot-reload the scenario |

The run command prints each tool call's pass/fail status and a summary with total calls, faults injected, registered injectors, and loaded scenarios.

## Programmatic API

All command functions are exported for use in scripts and CI pipelines:

```typescript
import {
  runCommand,
  validateCommand,
  generateCommand,
  initCommand,
} from "@reaatech/agent-chaos-cli";

await initCommand();
await generateCommand("network-degradation", { output: "./scenarios" });
await validateCommand("./scenarios/network-degradation.yaml");
await runCommand("./scenarios/network-degradation.yaml", { watch: true });
```

### Function Signatures

```typescript
function initCommand(): Promise<void>;
function generateCommand(type: string, options: { output?: string }): Promise<void>;
function validateCommand(filePath: string): Promise<void>;
function runCommand(scenarioPath: string, options: { watch?: boolean }): Promise<void>;
```

## CI/CD Integration

Validate scenarios in CI without a global install:

```bash
npx @reaatech/agent-chaos-cli validate ./scenarios/*.yaml
```

Or via GitHub Actions:

```yaml
steps:
  - run: npx @reaatech/agent-chaos-cli validate ./scenarios/network-degradation.yaml
```

## Related Packages

- [`@reaatech/agent-chaos-core`](https://www.npmjs.com/package/@reaatech/agent-chaos-core) — Core fault injection engine
- [`@reaatech/agent-chaos-scenarios`](https://www.npmjs.com/package/@reaatech/agent-chaos-scenarios) — Scenario loader, schema validator, and templates

## License

[MIT](./LICENSE)
