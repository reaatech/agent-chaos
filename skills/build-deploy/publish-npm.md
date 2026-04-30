# Skill: publish-npm

## Description

Publish packages to npm registry with proper versioning, changelog generation, and git tagging. This skill handles the complete publishing workflow including pre-publish validation and post-publish verification.

## Prerequisites

- All packages built successfully
- Tests passing
- npm authentication configured
- Git repository clean

## Input Parameters

| Parameter | Type    | Required | Description                                                  |
| --------- | ------- | -------- | ------------------------------------------------------------ |
| dryRun    | boolean | no       | Dry run without publishing (default: false)                  |
| access    | string  | no       | Package access: 'public' or 'restricted' (default: 'public') |
| tag       | string  | no       | npm tag for release (default: 'latest')                      |
| otp       | string  | no       | One-time password for 2FA (optional)                         |

## Execution Steps

1. Validate all packages are built
2. Run tests to ensure quality
3. Check for uncommitted changes
4. Update package versions
5. Generate changelog
6. Create git commit and tag
7. Publish packages to npm
8. Push changes to remote
9. Verify publication

## Output

- Published npm packages
- Git commit with version bump
- Git tag for release
- Changelog entry
- Publication report

## Example Usage

```
Please execute the "publish-npm" skill with:
- dryRun: false
- access: "public"
- tag: "latest"
```

## Implementation

### Publish Script (scripts/publish.ts)

```typescript
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface PublishOptions {
  dryRun: boolean;
  access: 'public' | 'restricted';
  tag: string;
  otp?: string;
}

async function runPublish(options: PublishOptions) {
  const { dryRun, access, tag, otp } = options;

  console.log(`📦 ${dryRun ? 'DRY RUN: ' : ''}Publishing packages to npm...`);

  try {
    // 1. Validate build
    console.log('🔍 Validating builds...');
    execSync('pnpm build', { stdio: 'inherit' });

    // 2. Run tests
    console.log('🧪 Running tests...');
    execSync('pnpm test:ci', { stdio: 'inherit' });

    // 3. Check git status
    console.log('📋 Checking git status...');
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim()) {
      throw new Error('Git repository is not clean. Please commit or stash changes.');
    }

    // 4. Get current version
    const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
    const currentVersion = rootPackage.version;
    console.log(`📌 Current version: ${currentVersion}`);

    // 5. Publish packages
    const publishCmd = `pnpm -r publish --access ${access} --tag ${tag}${dryRun ? ' --dry-run' : ''}${otp ? ` --otp ${otp}` : ''}`;
    execSync(publishCmd, { stdio: 'inherit' });

    if (!dryRun) {
      // 6. Create git commit
      console.log('📝 Creating git commit...');
      execSync('git add -A', { stdio: 'inherit' });
      execSync(`git commit -m "chore: release v${currentVersion}"`, { stdio: 'inherit' });

      // 7. Create git tag
      console.log('🏷️  Creating git tag...');
      execSync(`git tag -a v${currentVersion} -m "Release v${currentVersion}"`, {
        stdio: 'inherit',
      });

      // 8. Push to remote
      console.log('🚀 Pushing to remote...');
      execSync('git push origin main', { stdio: 'inherit' });
      execSync('git push origin v${currentVersion}', { stdio: 'inherit' });
    }

    console.log(`✅ ${dryRun ? 'Dry run complete!' : 'Packages published successfully!'}`);
  } catch (error) {
    console.error('❌ Publishing failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export { runPublish };
```

### Changesets Configuration (.changeset/config.json)

```json
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [["@reaatech/agent-chaos-*"]],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "publish": "tsx scripts/publish.ts",
    "publish:dry": "tsx scripts/publish.ts --dry-run",
    "publish:ci": "pnpm build && pnpm -r publish --access public --tag latest",
    "version": "changeset version",
    "release": "pnpm build && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.1"
  }
}
```

### GitHub Actions for Publishing (/.github/workflows/publish.yml)

```yaml
name: Publish Packages

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest

    permissions:
      contents: write
      packages: write

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build packages
        run: pnpm build

      - name: Run tests
        run: pnpm test:ci

      - name: Publish to npm
        run: pnpm -r publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
