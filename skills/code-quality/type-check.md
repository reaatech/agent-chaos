# Skill: type-check

## Description

Run TypeScript type checking across all packages in the monorepo. This skill ensures type safety, identifies type errors, and validates the TypeScript configuration.

## Prerequisites

- TypeScript configured (run `configure-typescript` first)
- All packages built at least once
- Dependencies installed

## Input Parameters

| Parameter | Type    | Required | Description                               |
| --------- | ------- | -------- | ----------------------------------------- |
| strict    | boolean | no       | Use strict type checking (default: true)  |
| noEmit    | boolean | no       | Don't emit output files (default: true)   |
| packages  | array   | no       | Specific packages to check (default: all) |

## Execution Steps

1. Run TypeScript compiler in check mode
2. Validate all type definitions
3. Check for type errors
4. Generate type report
5. Validate incremental builds
6. Report type coverage metrics

## Output

- Type check results
- Error list with line numbers
- Type coverage report
- Build recommendations

## Example Usage

```
Please execute the "type-check" skill with:
- strict: true
- noEmit: true
- packages: ["core", "adapters"]
```

## Implementation

### Type Check Script (scripts/type-check.ts)

```typescript
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

interface TypeCheckOptions {
  strict: boolean;
  noEmit: boolean;
  packages?: string[];
}

async function runTypeCheck(options: TypeCheckOptions) {
  const { strict, noEmit, packages } = options;

  const flags = [];
  if (strict) flags.push('--strict');
  if (noEmit) flags.push('--noEmit');

  console.log('🔍 Running TypeScript type check...');

  try {
    if (packages && packages.length > 0) {
      // Check specific packages
      for (const pkg of packages) {
        console.log(`\n📦 Checking package: ${pkg}`);
        execSync(`tsc --project packages/${pkg}/tsconfig.json ${flags.join(' ')}`, {
          stdio: 'inherit',
        });
      }
    } else {
      // Check all packages
      execSync(`tsc --build --force ${flags.join(' ')}`, { stdio: 'inherit' });
    }

    console.log('✅ Type check passed. No type errors found.');
  } catch (error) {
    console.error('❌ Type check failed. Please fix the type errors.');
    process.exit(1);
  }
}

export { runTypeCheck };
```

### Package.json Scripts

```json
{
  "scripts": {
    "type-check": "tsc --build --force",
    "type-check:watch": "tsc --build --watch",
    "type-check:strict": "tsc --build --force --strict --noEmit",
    "type-check:packages": "tsx scripts/type-check.ts"
  }
}
```

### TypeScript Configuration for Type Checking (tsconfig.check.json)

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["packages/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```
