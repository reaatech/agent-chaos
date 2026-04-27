# Agent Skills for Agent-Chaos Development

This document describes the AI agent skills available for developing the agent-chaos project. Each skill is a focused capability that an AI agent can execute to assist with specific development tasks.

## Overview

The agent skills are organized into categories:

| Category             | Description                          | Skills                                                                                              |
| -------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Project Setup**    | Initialize and configure the project | `init-monorepo`, `configure-typescript`, `setup-tooling`                                            |
| **Core Development** | Build core functionality             | `create-injector`, `create-middleware`, `create-engine`, `create-adapter`, `create-scenario-loader` |
| **Testing**          | Write and run tests                  | `write-unit-tests`, `write-integration-tests`, `write-e2e-tests`, `run-test-suite`                  |
| **Documentation**    | Generate documentation               | `generate-api-docs`, `write-examples`, `create-tutorial`                                            |
| **Code Quality**     | Maintain code standards              | `lint-fix`, `type-check`, `format-code`                                                             |
| **Build & Deploy**   | Build and publish packages           | `build-packages`, `publish-npm`, `create-release`                                                   |

## Skill File Structure

Each skill is defined in a separate file in the `skills/` directory:

```
skills/
├── project-setup/
│   ├── init-monorepo.md
│   ├── configure-typescript.md
│   └── setup-tooling.md
├── core-development/
│   ├── create-injector.md
│   ├── create-middleware.md
│   ├── create-engine.md
│   ├── create-adapter.md
│   └── create-scenario-loader.md
├── testing/
│   ├── write-unit-tests.md
│   ├── write-integration-tests.md
│   ├── write-e2e-tests.md
│   └── run-test-suite.md
├── documentation/
│   ├── generate-api-docs.md
│   ├── write-examples.md
│   └── create-tutorial.md
├── code-quality/
│   ├── lint-fix.md
│   ├── type-check.md
│   └── format-code.md
└── build-deploy/
    ├── build-packages.md
    ├── publish-npm.md
    └── create-release.md
```

## Skill Definition Format

Each skill file follows this structure:

```markdown
# Skill: [Skill Name]

## Description

[Brief description of what this skill does]

## Prerequisites

- [List of required conditions or prior skills]

## Input Parameters

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| param1    | string | yes      | Description |

## Execution Steps

1. [Step 1]
2. [Step 2]
   ...

## Output

[Description of what this skill produces]

## Example Usage

[Example of how to invoke this skill]

## Error Handling

[How errors are handled]
```

## Using Agent Skills

### Via CLI (Future)

```bash
# Run a specific skill
agent-chaos-dev skill run create-injector --name=LatencyInjector --type=latency

# Chain multiple skills
agent-chaos-dev skill chain init-monorepo configure-typescript setup-tooling
```

### Via AI Agent Prompt

When working with an AI agent, reference the skill by name and provide the required parameters:

```
Please execute the "create-injector" skill with:
- name: RateLimitInjector
- type: rateLimit
- config: { retryAfter: 60, includeHeaders: true }
```

## Skill Dependencies

```
init-monorepo
    ↓
configure-typescript → setup-tooling
    ↓
create-engine → create-middleware → create-injector
    ↓
create-adapter
create-scenario-loader
    ↓
write-unit-tests → write-integration-tests → write-e2e-tests
    ↓
build-packages → publish-npm
```

## Contributing New Skills

To add a new skill:

1. Create a new markdown file in the appropriate category directory
2. Follow the skill definition format
3. Add the skill to this AGENTS.md index
4. Update the dependency graph if needed

## Available Skills Summary

### Project Setup Skills

| Skill                  | Description                              |
| ---------------------- | ---------------------------------------- |
| `init-monorepo`        | Initialize pnpm workspace with Turborepo |
| `configure-typescript` | Set up TypeScript with strict mode       |
| `setup-tooling`        | Configure ESLint, Prettier, Husky        |

### Core Development Skills

| Skill                    | Description                   |
| ------------------------ | ----------------------------- |
| `create-injector`        | Generate a new fault injector |
| `create-middleware`      | Create middleware interceptor |
| `create-engine`          | Build ChaosEngine core        |
| `create-adapter`         | Create framework adapter      |
| `create-scenario-loader` | Build scenario file parser    |

### Testing Skills

| Skill                     | Description                      |
| ------------------------- | -------------------------------- |
| `write-unit-tests`        | Generate unit tests for a module |
| `write-integration-tests` | Create integration test suite    |
| `write-e2e-tests`         | Build end-to-end tests           |
| `run-test-suite`          | Execute all tests with coverage  |

### Documentation Skills

| Skill               | Description                        |
| ------------------- | ---------------------------------- |
| `generate-api-docs` | Generate Typedoc API documentation |
| `write-examples`    | Create usage examples              |
| `create-tutorial`   | Write step-by-step tutorial        |

### Code Quality Skills

| Skill         | Description                  |
| ------------- | ---------------------------- |
| `lint-fix`    | Run ESLint with auto-fix     |
| `type-check`  | Run TypeScript type checking |
| `format-code` | Format code with Prettier    |

### Build & Deploy Skills

| Skill            | Description                          |
| ---------------- | ------------------------------------ |
| `build-packages` | Build all packages in monorepo       |
| `publish-npm`    | Publish packages to npm              |
| `create-release` | Create GitHub release with changelog |
