# Skill: format-code

## Description

Format code using Prettier across all packages in the monorepo. This skill ensures consistent code style, formatting, and readability across the entire codebase.

## Prerequisites

- Prettier configured (run `setup-tooling` first)
- Code files exist in packages

## Input Parameters

| Parameter | Type    | Required | Description                                      |
| --------- | ------- | -------- | ------------------------------------------------ |
| write     | boolean | no       | Write changes to files (default: true)           |
| check     | boolean | no       | Check mode without writing (default: false)      |
| patterns  | array   | no       | File patterns to format (default: all supported) |

## Execution Steps

1. Run Prettier with appropriate flags
2. Format TypeScript, JSON, Markdown, YAML files
3. Apply consistent styling
4. Report formatting changes
5. Stage formatted files (optional)
6. Generate formatting report

## Output

- Formatted code files
- Formatting report
- List of changed files
- Git staging (optional)

## Example Usage

```
Please execute the "format-code" skill with:
- write: true
- check: false
- patterns: ["**/*.ts", "**/*.json", "**/*.md"]
```

## Implementation

### Format Script (scripts/format-code.ts)

```typescript
import { execSync } from 'child_process';

interface FormatOptions {
  write: boolean;
  check: boolean;
  patterns?: string[];
}

async function runFormatCode(options: FormatOptions) {
  const { write, check, patterns } = options;

  let command = 'prettier';

  // Default patterns
  const defaultPatterns = [
    'packages/**/*.ts',
    'packages/**/*.tsx',
    'packages/**/*.json',
    'packages/**/*.md',
    'packages/**/*.yaml',
    'packages/**/*.yml',
    '*.md',
    '*.json',
  ];

  const filePatterns = patterns || defaultPatterns;

  if (check) {
    command += ' --check';
  } else if (!write) {
    command += ' --list-different';
  } else {
    command += ' --write';
  }

  command += ' ' + filePatterns.join(' ');

  console.log(
    `🎨 Running Prettier${check ? ' (check mode)' : write ? ' (writing changes)' : ' (list different)'}...`
  );

  try {
    execSync(command, { stdio: 'inherit' });

    if (check) {
      console.log('✅ All files are properly formatted.');
    } else if (write) {
      console.log('✅ Code formatting complete. Files updated.');
    } else {
      console.log('✅ Formatting check complete. See above for files that need formatting.');
    }
  } catch (error) {
    if (check) {
      console.error('❌ Some files need formatting. Run with --write to fix.');
    } else {
      console.error('❌ Formatting failed.');
    }
    process.exit(1);
  }
}

export { runFormatCode };
```

### Package.json Scripts

```json
{
  "scripts": {
    "format": "prettier --write \"**/*.{ts,tsx,json,md,yaml}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json,md,yaml}\"",
    "format:staged": "lint-staged",
    "format:packages": "tsx scripts/format-code.ts"
  }
}
```

### Prettier Configuration (.prettierrc)

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "overrides": [
    {
      "files": "*.yaml",
      "options": {
        "tabWidth": 2
      }
    },
    {
      "files": "*.md",
      "options": {
        "proseWrap": "preserve"
      }
    }
  ]
}
```

### .prettierignore

```
# Dependencies
node_modules/

# Build outputs
dist/
build/
coverage/

# Generated files
*.d.ts
*.generated.ts

# Lock files
pnpm-lock.yaml

# Documentation builds
docs/api/
docs/dist/

# IDE
.vscode/
.idea/
```

### Lint-Staged Configuration (.lintstagedrc.js)

```javascript
module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yaml}': ['prettier --write'],
};
```
