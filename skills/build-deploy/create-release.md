# Skill: create-release

## Description

Create a GitHub release with changelog, release notes, and asset attachments. This skill automates the release creation process including changelog generation, version tagging, and release documentation.

## Prerequisites

- All packages published to npm
- Git repository with tags
- GitHub CLI or API access configured
- Changesets or conventional commits used

## Input Parameters

| Parameter     | Type    | Required | Description                                 |
| ------------- | ------- | -------- | ------------------------------------------- |
| version       | string  | yes      | Release version (e.g., "1.0.0")             |
| prerelease    | boolean | no       | Mark as prerelease (default: false)         |
| draft         | boolean | no       | Create as draft release (default: false)    |
| generateNotes | boolean | no       | Auto-generate release notes (default: true) |

## Execution Steps

1. Validate version and git state
2. Generate changelog from commits
3. Create release notes
4. Create GitHub release
5. Attach release assets
6. Update documentation
7. Announce release (optional)

## Output

- GitHub release created
- Release notes generated
- Changelog updated
- Release assets attached
- Documentation updated

## Example Usage

```
Please execute the "create-release" skill with:
- version: "1.0.0"
- prerelease: false
- draft: false
- generateNotes: true
```

## Implementation

### Release Script (scripts/create-release.ts)

```typescript
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ReleaseOptions {
  version: string;
  prerelease: boolean;
  draft: boolean;
  generateNotes: boolean;
}

async function createRelease(options: ReleaseOptions) {
  const { version, prerelease, draft, generateNotes } = options;

  console.log(`🚀 Creating release v${version}...`);

  try {
    // 1. Validate version format
    if (!/^v?\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(version)) {
      throw new Error(`Invalid version format: ${version}`);
    }

    const normalizedVersion = version.startsWith('v') ? version : `v${version}`;

    // 2. Check if tag already exists
    try {
      execSync(`git rev-parse ${normalizedVersion}`, { stdio: 'ignore' });
      throw new Error(`Tag ${normalizedVersion} already exists. Please use a different version.`);
    } catch (error) {
      // Tag doesn't exist, which is what we want
    }

    // 3. Generate changelog
    console.log('📝 Generating changelog...');
    let releaseNotes = '';

    if (generateNotes) {
      releaseNotes = execSync(
        `gh api repos/{owner}/{repo}/releases/generate-notes -f tag_name=${normalizedVersion} --jq .body`,
        { encoding: 'utf8' }
      );
    }

    // 4. Create release notes file
    const releaseNotesPath = join(process.cwd(), 'RELEASE_NOTES.md');
    writeFileSync(
      releaseNotesPath,
      releaseNotes ||
        `# Release ${normalizedVersion}\n\nRelease notes will be generated automatically.`
    );

    // 5. Create GitHub release
    console.log('📦 Creating GitHub release...');
    const releaseCmd = `gh release create ${normalizedVersion} --title "Release ${normalizedVersion}" --notes-file ${releaseNotesPath}${draft ? ' --draft' : ''}${prerelease ? ' --prerelease' : ''}`;
    execSync(releaseCmd, { stdio: 'inherit' });

    // 6. Attach build artifacts (if any)
    const distDir = join(process.cwd(), 'dist');
    try {
      execSync(`ls ${distDir}/*.{tgz,gz,zip} 2>/dev/null`, { stdio: 'ignore' });
      console.log('📎 Attaching release assets...');
      execSync(`gh release upload ${normalizedVersion} ${distDir}/*`, { stdio: 'inherit' });
    } catch (e) {
      console.log('ℹ️  No release assets found to attach.');
    }

    // 7. Update CHANGELOG.md
    console.log('📋 Updating CHANGELOG.md...');
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    let changelog = '';

    try {
      changelog = readFileSync(changelogPath, 'utf8');
    } catch (e) {
      changelog =
        '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
    }

    const newEntry = `\n## [${normalizedVersion}] - ${new Date().toISOString().split('T')[0]}\n\n${releaseNotes || 'Initial release'}`;
    changelog = changelog.replace('# Changelog\n', `# Changelog\n${newEntry}\n`);
    writeFileSync(changelogPath, changelog);

    // 8. Commit changelog update
    execSync('git add CHANGELOG.md', { stdio: 'ignore' });
    execSync(`git commit -m "docs: update changelog for ${normalizedVersion}"`, {
      stdio: 'inherit',
    });
    execSync('git push origin main', { stdio: 'inherit' });

    console.log(`✅ Release ${normalizedVersion} created successfully!`);
    console.log(
      `🔗 View release: https://github.com/reaatech/agent-chaos/releases/tag/${normalizedVersion}`
    );
  } catch (error) {
    console.error('❌ Release creation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export { createRelease };
```

### Conventional Commits Changelog (scripts/changelog.ts)

```typescript
import { execSync } from 'child_process';

interface ChangelogEntry {
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
  scope?: string;
  subject: string;
  body?: string;
  breaking?: boolean;
}

function generateChangelog(fromTag: string, toTag: string = 'HEAD'): string {
  const commits = execSync(`git log ${fromTag}..${toTag} --pretty=format:"%s%n%b%n---"`, {
    encoding: 'utf8',
  });

  const entries: ChangelogEntry[] = [];

  commits.split('---').forEach((commit) => {
    const lines = commit.trim().split('\n');
    const header = lines[0];

    // Parse conventional commit format: type(scope): subject
    const match = header.match(/^(feat|fix|docs|style|refactor|test|chore)(\(([^)]+)\))?:\s(.+)$/);

    if (match) {
      entries.push({
        type: match[1] as ChangelogEntry['type'],
        scope: match[3],
        subject: match[4],
        body: lines.slice(1).join('\n').trim(),
        breaking: header.includes('BREAKING CHANGE') || header.includes('!'),
      });
    }
  });

  // Group by type
  const grouped = {
    breaking: entries.filter((e) => e.breaking),
    features: entries.filter((e) => e.type === 'feat'),
    fixes: entries.filter((e) => e.type === 'fix'),
    other: entries.filter((e) => !e.breaking && e.type !== 'feat' && e.type !== 'fix'),
  };

  let changelog = '';

  if (grouped.breaking.length > 0) {
    changelog += '\n### ⚠️ Breaking Changes\n\n';
    grouped.breaking.forEach((e) => {
      changelog += `- ${e.subject}${e.scope ? ` (${e.scope})` : ''}\n`;
    });
  }

  if (grouped.features.length > 0) {
    changelog += '\n### 🚀 Features\n\n';
    grouped.features.forEach((e) => {
      changelog += `- ${e.subject}${e.scope ? ` (${e.scope})` : ''}\n`;
    });
  }

  if (grouped.fixes.length > 0) {
    changelog += '\n### 🐛 Bug Fixes\n\n';
    grouped.fixes.forEach((e) => {
      changelog += `- ${e.subject}${e.scope ? ` (${e.scope})` : ''}\n`;
    });
  }

  if (grouped.other.length > 0) {
    changelog += '\n### 📦 Other Changes\n\n';
    grouped.other.forEach((e) => {
      changelog += `- ${e.subject}${e.scope ? ` (${e.scope})` : ''}\n`;
    });
  }

  return changelog;
}

export { generateChangelog, type ChangelogEntry };
```

### Package.json Scripts

```json
{
  "scripts": {
    "release": "tsx scripts/create-release.ts",
    "release:draft": "tsx scripts/create-release.ts --draft",
    "release:prerelease": "tsx scripts/create-release.ts --prerelease",
    "changelog": "tsx scripts/changelog.ts",
    "changelog:generate": "tsx scripts/changelog.ts --from v0.1.0 --to HEAD"
  },
  "devDependencies": {
    "@octokit/rest": "^20.0.2"
  }
}
```

### Release Checklist Template

```markdown
# Release Checklist

## Pre-Release

- [ ] All tests passing
- [ ] Build successful
- [ ] Changelog updated
- [ ] Documentation updated
- [ ] Version bump committed
- [ ] Git tag created

## Release

- [ ] Packages published to npm
- [ ] GitHub release created
- [ ] Release notes generated
- [ ] Assets attached

## Post-Release

- [ ] Announcement sent
- [ ] Documentation deployed
- [ ] Examples updated
- [ ] Community notified
```
