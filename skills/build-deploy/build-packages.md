# Skill: build-packages

## Description

Build all packages in the monorepo using Turborepo for efficient parallel builds with caching. This skill compiles TypeScript, generates type definitions, and creates distributable packages.

## Prerequisites

- All packages implemented
- TypeScript configured
- Turborepo configured
- Dependencies installed

## Input Parameters

| Parameter | Type    | Required | Description                                   |
| --------- | ------- | -------- | --------------------------------------------- |
| packages  | array   | no       | Specific packages to build (default: all)     |
| force     | boolean | no       | Force rebuild ignoring cache (default: false) |
| watch     | boolean | no       | Watch mode for development (default: false)   |

## Execution Steps

1. Validate package configurations
2. Build packages in dependency order
3. Generate type definitions
4. Create distributable bundles
5. Validate build outputs
6. Generate build report
7. Update package manifests

## Output

- Compiled JavaScript files
- Type definition files (.d.ts)
- Source maps
- Build report
- Package distributions

## Example Usage

```
Please execute the "build-packages" skill with:
- packages: ["core", "adapters"]
- force: false
- watch: false
```

## Implementation

### Turborepo Configuration (turbo.json)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["tsconfig.base.json", "package.json"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "outputs": [],
      "cache": true
    },
    "type-check": {
      "dependsOn": [],
      "outputs": [],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Package Build Configuration (packages/core/package.json)

```json
{
  "name": "@agent-chaos/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "src"],
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts --sourcemap --clean",
    "build:watch": "tsup src/index.ts --format esm,cjs --dts --sourcemap --watch",
    "dev": "pnpm build:watch"
  },
  "devDependencies": {
    "tsup": "^8.0.1",
    "typescript": "^5.3.3"
  }
}
```

### Build Script (scripts/build.ts)

```typescript
import { execSync } from 'child_process';

interface BuildOptions {
  packages?: string[];
  force: boolean;
  watch: boolean;
}

async function runBuild(options: BuildOptions) {
  const { packages, force, watch } = options;

  console.log('🔨 Building packages...');

  try {
    let command = 'turbo run build';

    if (packages && packages.length > 0) {
      command += ` --filter="{${packages.join(',')}}"`;
    }

    if (force) {
      command += ' --force';
    }

    if (watch) {
      command += ' --watch';
    }

    execSync(command, { stdio: 'inherit' });

    console.log('✅ Build complete!');
  } catch (error) {
    console.error('❌ Build failed. Check the error messages above.');
    process.exit(1);
  }
}

export { runBuild };
```

### Package.json Scripts

```json
{
  "scripts": {
    "build": "turbo run build",
    "build:force": "turbo run build --force",
    "build:watch": "turbo run build --watch",
    "build:packages": "tsx scripts/build.ts",
    "clean": "turbo run clean && rm -rf dist",
    "dev": "turbo run dev"
  }
}
```
