# Skill: write-examples

## Description

Create comprehensive usage examples demonstrating how to use agent-chaos in various scenarios. This skill generates working code examples that users can run and modify.

## Prerequisites

- Core packages implemented
- Basic documentation available
- Example directory structure created

## Input Parameters

| Parameter    | Type    | Required | Description                                                       |
| ------------ | ------- | -------- | ----------------------------------------------------------------- |
| categories   | array   | no       | Example categories (default: ['basic', 'frameworks', 'advanced']) |
| includeTests | boolean | no       | Include test files (default: true)                                |

## Execution Steps

1. Create example directory structure
2. Write basic usage examples
3. Create framework integration examples
4. Add advanced scenario examples
5. Include README for each example
6. Add package.json with dependencies
7. Create runnable example scripts
8. Add tests for examples

## Output

- Working code examples
- README documentation
- Package configurations
- Test files

## Example Usage

```
Please execute the "write-examples" skill with:
- categories: ["basic", "langchain", "custom-injectors"]
- includeTests: true
```

## Implementation

### Example Structure

```
examples/
├── basic-usage/
│   ├── src/
│   │   └── index.ts
│   ├── scenarios/
│   │   └── basic.yaml
│   ├── package.json
│   └── README.md
├── langchain-integration/
│   ├── src/
│   │   └── index.ts
│   ├── scenarios/
│   │   └── langchain-chaos.yaml
│   ├── package.json
│   └── README.md
├── custom-injectors/
│   ├── src/
│   │   ├── CustomInjector.ts
│   │   └── index.ts
│   ├── scenarios/
│   │   └── custom.yaml
│   ├── package.json
│   └── README.md
└── ci-cd-integration/
    ├── .github/
    │   └── workflows/
    │       └── chaos-tests.yml
    ├── scenarios/
    │   └── ci.yaml
    ├── package.json
    └── README.md
```

### Basic Usage Example (examples/basic-usage/src/index.ts)

```typescript
import { createChaosEngine, createStandardInjectors } from '@reaatech/agent-chaos-core';
import { createScenarioLoader } from '@reaatech/agent-chaos-scenarios';

async function main() {
  // 1. Create chaos engine
  const engine = createChaosEngine({
    mode: 'inject',
    observability: {
      logging: { level: 'info', format: 'text' },
    },
  });

  // 2. Register standard injectors
  const injectors = createStandardInjectors();
  injectors.forEach((injector) => engine.registerInjector(injector));

  // 3. Load scenario
  const loader = createScenarioLoader();
  const scenario = await loader.load('./scenarios/basic.yaml');
  engine.loadScenario(scenario);

  // 4. Simulate tool calls
  const toolCall = {
    id: 'call-1',
    name: 'weatherAPI',
    arguments: { location: 'San Francisco' },
    timestamp: Date.now(),
  };

  console.log('Making tool call...');
  const response = await engine.intercept(toolCall);

  console.log('Response:', response);
  console.log('Events recorded:', engine.record().length);
}

main().catch(console.error);
```

### Example README Template

````markdown
# Example: [Example Name]

This example demonstrates how to [description].

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
```
````

## Run

```bash
pnpm start
```

## What This Example Shows

- [Feature 1]
- [Feature 2]
- [Feature 3]

## Scenario Used

See `scenarios/[scenario].yaml` for the chaos scenario configuration.

## Learn More

- [Documentation](https://github.com/reaatech/agent-chaos/tree/main/docs)
- [API Reference](https://github.com/reaatech/agent-chaos/tree/main/docs/api)
