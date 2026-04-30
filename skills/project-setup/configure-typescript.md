# Skill: configure-typescript

## Description

Set up TypeScript with strict mode across all packages in the monorepo. This skill configures TypeScript compiler options, path mappings, and ensures consistent type checking.

## Prerequisites

- Monorepo initialized (run `init-monorepo` first)
- Node.js 20+ LTS installed
- pnpm 9+ installed

## Input Parameters

| Parameter   | Type    | Required | Description                                       |
| ----------- | ------- | -------- | ------------------------------------------------- |
| strict      | boolean | no       | Enable strict TypeScript mode (default: true)     |
| target      | string  | no       | TypeScript compilation target (default: "ES2022") |
| module      | string  | no       | Module system (default: "NodeNext")               |
| declaration | boolean | no       | Generate .d.ts files (default: true)              |

## Execution Steps

1. Update tsconfig.base.json with strict compiler options
2. Configure path mappings for workspace packages
3. Update each package's tsconfig.json to extend base config
4. Add TypeScript-specific ESLint rules
5. Configure tsup for building with TypeScript
6. Add type-check script to all package.json files
7. Create types directory in core package for shared types

## Output

- Consistent TypeScript configuration across all packages
- Strict type checking enabled
- Path mappings for workspace references
- Build configuration for TypeScript compilation

## Example Usage

```
Please execute the "configure-typescript" skill with:
- strict: true
- target: "ES2022"
- module: "NodeNext"
- declaration: true
```

## Error Handling

- If TypeScript is already configured, merge new settings with existing
- If conflicts detected in tsconfig files, provide detailed error messages
- If package.json files missing, create them with minimal configuration

## Configuration Details

### tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "lib": ["ES2022"],
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@reaatech/agent-chaos-core": ["packages/core/src"],
      "@reaatech/agent-chaos-scenarios": ["packages/scenarios/src"],
      "@reaatech/agent-chaos-cli": ["packages/cli/src"],
      "@reaatech/agent-chaos-adapters": ["packages/adapters/src"],
      "@reaatech/agent-chaos-observability": ["packages/observability/src"]
    }
  },
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### Package tsconfig.json Template

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```
