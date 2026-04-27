# Contributing to Agent Chaos

Thank you for your interest in contributing to agent-chaos! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

Please be respectful and inclusive in all interactions. We are committed to providing a welcoming and harassment-free experience for everyone.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/reaatech/agent-chaos.git`
3. Navigate to the project: `cd agent-chaos`
4. Install dependencies: `pnpm install`
5. Build packages: `pnpm build`
6. Run tests: `pnpm test`

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git

### Project Structure

```
agent-chaos/
├── packages/           # Monorepo packages
│   ├── core/          # Core chaos engine
│   ├── scenarios/     # Scenario loader
│   ├── cli/           # Command-line interface
│   ├── adapters/      # Framework adapters
│   └── observability/ # Observability tools
├── skills/            # AI agent skills
└── examples/          # Usage examples
```

### Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format

# Type check
pnpm type-check

# Run all checks
pnpm check
```

## How to Contribute

### Reporting Bugs

1. Check existing issues first
2. Use the bug report template
3. Include:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Minimal reproduction if possible

### Suggesting Features

1. Check existing feature requests
2. Use the feature request template
3. Describe the use case and benefits
4. Provide examples if helpful

### Contributing Code

1. **Create a branch** from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes** following our coding standards

3. **Write tests** for new functionality

4. **Commit your changes** using conventional commits:

   ```bash
   git commit -m "feat(core): add new fault injector"
   ```

5. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** against the `main` branch

## Coding Standards

### TypeScript

- Use strict mode
- Prefer `const` over `let`
- Use meaningful variable names
- Avoid `any` type when possible
- Use interfaces for object shapes
- Export types with `export type`

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Line length**: 100 characters max
- **Trailing commas**: ES5 (objects/arrays only)

### File Organization

- One class/interface per file
- Group related exports in `index.ts`
- Keep files under 300 lines when possible
- Use descriptive file names

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build process or tooling changes

Examples:

```
feat(core): add latency injector with configurable delay
fix(scenarios): handle missing fault type gracefully
docs: update API reference for ChaosEngine
refactor(adapters): simplify middleware chain logic
```

## Testing

### Writing Tests

- Place tests next to source files: `*.test.ts`
- Use descriptive test names
- Test both happy paths and edge cases
- Mock external dependencies
- Aim for high coverage but prioritize meaningful tests

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureName', () => {
  describe('methodName', () => {
    it('should do something', () => {
      // Arrange
      const input = {};

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- packages/core/src/ChaosEngine.test.ts
```

## Pull Request Process

1. **Ensure all checks pass**:
   - Tests passing
   - Linting clean
   - Type checking clean
   - Coverage thresholds met

2. **Update documentation** if needed:
   - API docs
   - README
   - Examples

3. **Request review** from maintainers

4. **Address feedback** and update PR

5. **Squash and merge** when approved

### PR Title Guidelines

- Clear and descriptive
- Follow conventional commit format
- Reference issues when applicable

Example: `feat(core): implement rate limit injector (#123)`

## Community

### Getting Help

- [GitHub Discussions](https://github.com/reaatech/agent-chaos/discussions)
- [Documentation](https://github.com/reaatech/agent-chaos/tree/main/docs)
- [Examples](https://github.com/reaatech/agent-chaos/tree/main/examples)

### Stay Updated

- Watch the repository for releases

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to agent-chaos! 🎉
