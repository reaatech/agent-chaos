# Skill: run-test-suite

## Description

Execute the complete test suite with coverage reporting, test result analysis, and CI/CD integration. This skill runs all unit, integration, and e2e tests with proper configuration and reporting.

## Prerequisites

- All test files created
- Test dependencies installed
- CI/CD environment configured (optional)

## Input Parameters

| Parameter | Type    | Required | Description                                      |
| --------- | ------- | -------- | ------------------------------------------------ |
| coverage  | boolean | no       | Generate coverage report (default: true)         |
| watch     | boolean | no       | Run in watch mode (default: false)               |
| ci        | boolean | no       | CI mode with specific reporters (default: false) |
| threshold | number  | no       | Coverage threshold percentage (default: 80)      |

## Execution Steps

1. Install test dependencies
2. Build packages if needed
3. Run unit tests with coverage
4. Run integration tests
5. Run e2e tests
6. Generate coverage report
7. Publish results to CI/CD
8. Fail if thresholds not met

## Output

- Test execution results
- Coverage reports (HTML, JSON, LCOV)
- JUnit XML for CI/CD
- Test summary and metrics

## Example Usage

```
Please execute the "run-test-suite" skill with:
- coverage: true
- ci: true
- threshold: 85
```

## Implementation

### Test Runner Script (scripts/run-tests.ts)

```typescript
import { execSync } from 'child_process';
import { createInterface } from 'readline';

interface TestOptions {
  coverage: boolean;
  watch: boolean;
  ci: boolean;
  threshold: number;
}

async function runTestSuite(options: TestOptions) {
  const { coverage, watch, ci, threshold } = options;

  console.log('🧪 Starting test suite...\n');

  try {
    // 1. Run unit tests
    console.log('📦 Running unit tests...');
    execSync(`pnpm test${coverage ? ' -- --coverage' : ''}${watch ? ' --watch' : ''}`, {
      stdio: 'inherit',
    });

    // 2. Run integration tests
    console.log('🔗 Running integration tests...');
    execSync(`pnpm test:integration${coverage ? ' -- --coverage' : ''}`, {
      stdio: 'inherit',
    });

    // 3. Run e2e tests (only if not in watch mode)
    if (!watch) {
      console.log('🌐 Running e2e tests...');
      execSync(`pnpm test:e2e${coverage ? ' -- --coverage' : ''}`, {
        stdio: 'inherit',
      });
    }

    // 4. Generate coverage report
    if (coverage && !watch) {
      console.log('📊 Generating coverage report...');
      execSync('pnpm coverage:report', { stdio: 'inherit' });

      // 5. Check coverage thresholds
      if (ci) {
        console.log('✅ Checking coverage thresholds...');
        const result = execSync('pnpm coverage:check', { encoding: 'utf8' });
        const coveragePercent = parseCoveragePercent(result);

        if (coveragePercent < threshold) {
          throw new Error(`Coverage ${coveragePercent}% is below threshold ${threshold}%`);
        }
      }
    }

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test suite failed!');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  runTestSuite({
    coverage: !args.includes('--no-coverage'),
    watch: args.includes('--watch'),
    ci: args.includes('--ci'),
    threshold: parseInt(args.find((a) => a.startsWith('--threshold='))?.split('=')[1] || '80', 10),
  });
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "vitest run --config vitest.e2e.config.ts",
    "test:all": "tsx scripts/run-tests.ts",
    "test:ci": "tsx scripts/run-tests.ts --ci --threshold=80",
    "coverage:report": "vitest run --coverage --reporter=json --reporter=html",
    "coverage:check": "vitest run --coverage --thresholds.global=80"
  }
}
```

### GitHub Actions CI (/.github/workflows/test.yml)

```yaml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build packages
        run: pnpm build

      - name: Run tests
        run: pnpm test:ci
        env:
          CI: true

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: true
```
