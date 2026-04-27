# Skill: init-monorepo

## Description

Initialize a pnpm workspace with Turborepo for the agent-chaos monorepo structure. This skill sets up the foundational project structure with all necessary configuration files.

## Prerequisites

- Node.js 20+ LTS installed
- pnpm 9+ installed
- Empty or new project directory

## Input Parameters

| Parameter | Type   | Required | Description                                                                                                 |
| --------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------- |
| name      | string | yes      | Project name (e.g., "agent-chaos")                                                                          |
| packages  | array  | no       | List of package names to create (default: ["core", "scenarios", "cli", "adapters", "observability", "e2e"]) |

## Execution Steps

1. Create root package.json with workspace configuration
2. Create pnpm-workspace.yaml with packages glob
3. Create turbo.json with build pipeline configuration
4. Create packages/ directory structure
5. Initialize each package with package.json
6. Create shared configuration files (tsconfig.base.json, .eslintrc.js, .prettierrc)
7. Create .gitignore for Node.js projects
8. Create initial README.md

## Output

- Complete monorepo structure ready for development
- All packages configured with workspace references
- Turborepo pipeline configured for build, test, lint
- Shared TypeScript, ESLint, and Prettier configurations

## Example Usage

```
Please execute the "init-monorepo" skill with:
- name: agent-chaos
- packages: ["core", "scenarios", "cli", "adapters", "observability", "e2e"]
```

## Error Handling

- If pnpm is not installed, provide installation instructions
- If directory is not empty, warn user and request confirmation
- If package initialization fails, rollback created files

## Files Created

```
agent-chaos/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── scenarios/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── cli/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── adapters/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── observability/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── e2e/
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .eslintrc.js
├── .prettierrc
├── .gitignore
└── README.md
```
