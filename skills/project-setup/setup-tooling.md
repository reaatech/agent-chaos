# Skill: setup-tooling

## Description

Configure ESLint, Prettier, and Husky pre-commit hooks for code quality and consistency across the monorepo. This skill sets up automated linting, formatting, and git hooks.

## Prerequisites

- Monorepo initialized (run `init-monorepo` first)
- TypeScript configured (run `configure-typescript` recommended)
- Node.js 20+ LTS installed
- pnpm 9+ installed

## Input Parameters

| Parameter  | Type    | Required | Description                                         |
| ---------- | ------- | -------- | --------------------------------------------------- |
| prettier   | boolean | no       | Enable Prettier formatting (default: true)          |
| husky      | boolean | no       | Enable Husky pre-commit hooks (default: true)       |
| lintStaged | boolean | no       | Enable lint-staged for staged files (default: true) |

## Execution Steps

1. Install ESLint, Prettier, Husky, and lint-staged dependencies
2. Create .eslintrc.js with TypeScript and import rules
3. Create .prettierrc with formatting configuration
4. Initialize Husky and configure pre-commit hook
5. Configure lint-staged for staged file processing
6. Add lint and format scripts to root and package package.json files
7. Create .eslintignore and .prettierignore files
8. Add EditorConfig for consistent editor settings

## Output

- ESLint configuration with TypeScript support
- Prettier configuration for code formatting
- Husky pre-commit hooks for automated checks
- lint-staged configuration for staged file processing
- Consistent code quality across all packages

## Example Usage

```
Please execute the "setup-tooling" skill with:
- prettier: true
- husky: true
- lintStaged: true
```

## Error Handling

- If ESLint/Prettier already configured, merge new settings
- If Husky already initialized, update hooks instead of reinitializing
- If git not initialized, initialize git repository first

## Configuration Details

### .eslintrc.js

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.base.json',
  },
  plugins: ['@typescript-eslint', 'import', 'unicorn'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'unicorn/filename-case': [
      'error',
      {
        case: 'kebabCase',
        ignore: ['^\\[\\['],
      },
    ],
  },
  ignorePatterns: ['dist', 'node_modules', '*.js', 'coverage'],
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
};
```

### .prettierrc

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
    }
  ]
}
```

### .lintstagedrc.js

```javascript
module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yaml}': ['prettier --write'],
};
```

### package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint packages/**/*.ts --fix",
    "lint:check": "eslint packages/**/*.ts",
    "format": "prettier --write \"**/*.{ts,tsx,json,md,yaml}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json,md,yaml}\"",
    "prepare": "husky install"
  }
}
```

### .editorconfig

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.{json,yaml}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```
