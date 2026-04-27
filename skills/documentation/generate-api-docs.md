# Skill: generate-api-docs

## Description

Generate comprehensive Typedoc API documentation for the agent-chaos project. This skill creates detailed API reference documentation with examples, type definitions, and usage guidelines.

## Prerequisites

- All packages implemented
- TypeScript compilation successful
- Documentation comments in source code

## Input Parameters

| Parameter       | Type    | Required | Description                                                 |
| --------------- | ------- | -------- | ----------------------------------------------------------- |
| packages        | array   | no       | Packages to document (default: all)                         |
| format          | string  | no       | Output format: 'html', 'markdown', 'json' (default: 'html') |
| includeExamples | boolean | no       | Include code examples (default: true)                       |

## Execution Steps

1. Parse TypeScript source files
2. Extract JSDoc comments
3. Generate API reference documentation
4. Create navigation structure
5. Add code examples
6. Generate search index
7. Deploy to documentation site (optional)

## Output

- HTML API documentation
- Search functionality
- Type definitions reference
- Usage examples

## Example Usage

```
Please execute the "generate-api-docs" skill with:
- packages: ["core", "adapters"]
- format: "html"
- includeExamples: true
```

## Implementation

### Typedoc Configuration (typedoc.json)

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": [
    "packages/core/src/index.ts",
    "packages/scenarios/src/index.ts",
    "packages/cli/src/index.ts",
    "packages/adapters/src/index.ts",
    "packages/observability/src/index.ts"
  ],
  "out": "docs/api",
  "name": "Agent Chaos API Reference",
  "includeVersion": true,
  "readme": "none",
  "plugin": ["typedoc-plugin-markdown", "typedoc-plugin-examples"],
  "theme": "default",
  "excludePrivate": true,
  "excludeProtected": false,
  "excludeExternals": true,
  "categorizeByGroup": true,
  "categoryOrder": ["Classes", "Interfaces", "Types", "Functions", "Variables", "*"],
  "navigationLinks": {
    "GitHub": "https://github.com/reaatech/agent-chaos"
  }
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "docs:api": "typedoc",
    "docs:api:watch": "typedoc --watch",
    "docs:build": "pnpm docs:api && pnpm docs:guide",
    "docs:deploy": "pnpm docs:build && vercel --prod"
  },
  "devDependencies": {
    "typedoc": "^0.25.4",
    "typedoc-plugin-markdown": "^3.17.1",
    "typedoc-plugin-examples": "^0.1.0"
  }
}
```
