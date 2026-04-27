# Skill: lint-fix

## Description

Run ESLint with auto-fix capabilities across all packages in the monorepo. This skill identifies and automatically fixes code quality issues, style violations, and potential bugs.

## Prerequisites

- ESLint configured (run `setup-tooling` first)
- TypeScript configured
- Code committed to version control

## Input Parameters

| Parameter | Type    | Required | Description                              |
| --------- | ------- | -------- | ---------------------------------------- |
| fix       | boolean | no       | Auto-fix issues (default: true)          |
| packages  | array   | no       | Specific packages to lint (default: all) |
| quiet     | boolean | no       | Report only errors (default: false)      |

## Execution Steps

1. Run ESLint with --fix flag
2. Report remaining issues
3. Generate lint report
4. Update code files
5. Stage fixed files (if in git)
6. Create summary of changes

## Output

- Fixed code files
- Lint report (JSON, HTML)
- Summary of fixed vs remaining issues
- Git staging (optional)

## Example Usage

```
Please execute the "lint-fix" skill with:
- fix: true
- packages: ["core", "adapters"]
- quiet: false
```

## Implementation

### Lint Script (scripts/lint-fix.ts)

```typescript
import { execSync } from 'child_process';
import { existsSync } from 'fs';

interface LintOptions {
  fix: boolean;
  packages?: string[];
  quiet: boolean;
}

async function runLintFix(options: LintOptions) {
  const { fix, packages, quiet } = options;

  const fixFlag = fix ? '--fix' : '';
  const quietFlag = quiet ? '--quiet' : '';

  let pattern = 'packages/**/*.ts';
  if (packages && packages.length > 0) {
    pattern = packages.map((p) => `packages/${p}/**/*.ts`).join(' ');
  }

  console.log(`🔍 Running ESLint${fix ? ' with auto-fix' : ''}...`);

  try {
    execSync(`eslint ${pattern} ${fixFlag} ${quietFlag} --format stylish`, { stdio: 'inherit' });

    if (fix) {
      console.log('✅ Linting complete. Issues fixed where possible.');
    } else {
      console.log('✅ Linting complete. No auto-fix applied.');
    }
  } catch (error) {
    console.error('❌ Linting failed. Please fix the remaining issues.');
    process.exit(1);
  }
}

export { runLintFix };
```

### Package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint packages/**/*.ts --fix",
    "lint:check": "eslint packages/**/*.ts",
    "lint:report": "eslint packages/**/*.ts --format json --output-file lint-report.json",
    "lint:packages": "tsx scripts/lint-fix.ts"
  }
}
```
