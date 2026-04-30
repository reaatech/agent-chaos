# agent-budget-controller — Conformance Remediation

A checklist of gaps between this repo and the reference repo
[`a2a-reference-ts`](https://github.com/reaatech/a2a-reference-ts), with the goal of bringing
`agent-budget-controller` into conformity before its first publish to npm + GitHub Packages.

**Reference state (compared against):** `~/dev/2026-04/a2a-reference-ts` @ `0196561`
**Current state (this repo):** pre-first-publish; queued changeset bumping all packages to `0.1.0`.

Items are grouped by impact. **Critical** items will block or break a publish if not fixed. **High**
items affect end-user compatibility. **Medium** items are conformity / DX. **Low** items are stylistic.

---

## Legend

- [ ] = not done
- ⚠️  = will block publish or break consumers
- 🔁 = mechanical change
- 🧹 = invasive — touches many files

---

## CRITICAL — fix before first publish

### [ ] C1. Stop ignoring `CHANGELOG.md` in `.gitignore` ⚠️

`.gitignore:46` contains:

```
# Changeset CHANGELOG files (auto-generated)
**/CHANGELOG.md
```

This breaks the entire changesets release flow. `changesets/action@v1` writes per-package
`CHANGELOG.md` files when it runs `pnpm version-packages`, and the **release PR** it opens contains
those files staged for commit. With them gitignored:

- The PR's diff will appear empty for changelogs.
- npm's "Releases" tab and GitHub's release notes will have nothing to display.
- Consumers can't see what changed between versions.

**Fix:** delete the two lines above from `.gitignore`. Changelogs should be tracked.

`a2a-reference-ts/.gitignore` does not ignore them. (Compare line counts: ABC has the rule, A2A
does not.)

---

### [ ] C2. Reorder `exports` conditional keys — `types` MUST come first ⚠️

Every package's `package.json` currently has:

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts"
  }
}
```

Per the [Node.js conditional-exports spec](https://nodejs.org/api/packages.html#conditional-exports)
and TypeScript's `--moduleResolution node16/nodenext`, **`types` must be the first key**. Otherwise
TS picks up the `.js` resolution before the `.d.ts` resolution, and consumers get
`Could not find a declaration file for module ...` errors under modern resolution modes.

**Fix in all 8 packages** (`packages/{budget-engine,cli,llm-router-plugin,middleware,otel-bridge,pricing,spend-tracker,types}/package.json`):

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  }
}
```

(After H1 below, this becomes a 3-key block with `require` last.)

Reference: `packages/core/package.json:20-26` in `a2a-reference-ts`.

---

## HIGH — end-user compatibility

### [ ] H1. Publish dual ESM/CJS (currently ESM-only) 🔁

`a2a-reference-ts` ships every package as both ESM and CJS:

```ts
// tsup.config.ts
format: ['cjs', 'esm']
```

```json
// package.json
"main":   "./dist/index.cjs",
"module": "./dist/index.js",
"types":  "./dist/index.d.ts",
"exports": {
  ".": {
    "types":   "./dist/index.d.ts",
    "import":  "./dist/index.js",
    "require": "./dist/index.cjs"
  }
}
```

Every ABC package is ESM-only. Anyone with `module: "commonjs"` in their `tsconfig` (still common)
or running Node tooling that does `require()` cannot consume the package without `.mjs`/dynamic-import
gymnastics. For library packages this is a real adoption barrier.

**Fix per package:**

1. `tsup.config.ts`: `format: ['esm']` → `format: ['cjs', 'esm']`
2. `package.json`:
   - Add `"module": "./dist/index.js"`
   - Change `"main": "./dist/index.js"` → `"main": "./dist/index.cjs"`
   - Update `exports.import` stays `./dist/index.js`, add `"require": "./dist/index.cjs"`

Applies to all 8 packages.

> Consider if any package is intentionally ESM-only (e.g. uses top-level await or pure-ESM deps).
> The CLI is a candidate to stay ESM-only since it's executed, not imported. Decide per-package.

---

## MEDIUM — toolchain & conformity

### [ ] M1. Migrate from ESLint+Prettier+husky+lint-staged to Biome 🧹

`a2a-reference-ts` uses **Biome** for both lint and format (single tool, ~10× faster, no plugin
config). ABC has the older multi-tool stack:

| Concern | a2a-reference-ts | agent-budget-controller |
|--|--|--|
| Lint | `@biomejs/biome` | `eslint` + `@typescript-eslint/*` + `eslint.config.js` |
| Format | `@biomejs/biome` | `prettier` + `.prettierrc` + `.prettierignore` |
| Pre-commit | (none) | `husky` + `lint-staged` + `.husky/pre-commit` + `.lintstagedrc.json` |
| Style metadata | (none) | `.editorconfig` |

**Migration steps:**

1. Copy `biome.json` from `a2a-reference-ts` to repo root.
2. Delete: `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.husky/`, `.lintstagedrc.json`.
3. (Optional) Keep `.editorconfig` — it's IDE-level, harmless. A2A doesn't have one.
4. Update root `package.json`:
   - Remove devDeps: `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`,
     `prettier`, `husky`, `lint-staged`.
   - Add devDep: `@biomejs/biome` (^1.9.4 to match A2A).
   - Replace scripts:
     - `"format": "prettier --write ."` → `"format": "biome format --write ."`
     - `"format:check": "prettier --check ."` → drop (use `lint` script instead) OR `"format:check": "biome format ."`
     - `"lint": "eslint ."` → `"lint": "biome check ."`
     - `"lint:fix": "eslint . --fix"` → `"lint:fix": "biome check --write ."`
     - Remove `"prepare": "husky"` entirely (no husky anymore).
5. Run `pnpm install`, then `pnpm lint` to surface any code that biome flags but eslint did not
   (typically `noNonNullAssertion`, `noExplicitAny`, etc. are stricter under A2A's `biome.json`).
6. Update `.github/workflows/ci.yml` — drop `pnpm format:check` step (or rename to use biome).

This is invasive but is the single biggest "conformity" win.

> If you want to keep husky for some reason (e.g. running tests pre-commit), fine — but the lint
> stack itself should converge on Biome.

---

### [ ] M2. Add `tsconfig.typecheck.json` with workspace path aliases

`a2a-reference-ts/tsconfig.typecheck.json` lets `pnpm typecheck` resolve cross-workspace imports
**without** building first, by aliasing `@reaatech/...` to each package's `src/index.ts`. Contents:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@reaatech/agent-budget-types":             ["./packages/types/src/index.ts"],
      "@reaatech/agent-budget-pricing":           ["./packages/pricing/src/index.ts"],
      "@reaatech/agent-budget-spend-tracker":     ["./packages/spend-tracker/src/index.ts"],
      "@reaatech/agent-budget-engine":            ["./packages/budget-engine/src/index.ts"],
      "@reaatech/agent-budget-middleware":        ["./packages/middleware/src/index.ts"],
      "@reaatech/agent-budget-otel-bridge":       ["./packages/otel-bridge/src/index.ts"],
      "@reaatech/agent-budget-llm-router-plugin": ["./packages/llm-router-plugin/src/index.ts"],
      "@reaatech/agent-budget-cli":               ["./packages/cli/src/index.ts"]
    }
  }
}
```

Then update root `package.json`:

```diff
- "typecheck": "tsc --noEmit"
+ "typecheck": "tsc --noEmit -p tsconfig.typecheck.json"
```

This eliminates the `^build` dep that ABC's typecheck currently has via composite references.

---

### [ ] M3. Simplify root and per-package `tsconfig.json` (drop composite project mode)

ABC currently uses TS composite project references. A2A does not — it relies on tsup for output and
on `tsconfig.typecheck.json` (M2) for cross-package typecheck. Simplifying:

**Root `tsconfig.json`** — match A2A's set of strict flags. ABC is missing several:

```diff
+   "noImplicitAny": true,
+   "strictNullChecks": true,
+   "strictFunctionTypes": true,
+   "strictBindCallApply": true,
+   "strictPropertyInitialization": true,
+   "noImplicitThis": true,
+   "alwaysStrict": true,
+   "isolatedModules": true,
+   "verbatimModuleSyntax": true,
-   "composite": true,
-   "rootDir": ".",
-   "outDir": "./dist"
```

Drop the `references` array (or keep it if you still want `tsc -b --watch` to work — see below).

Drop `lib: ["ES2022"]` is already there — match A2A's. Add `lib: ["ES2022"]` if missing
(it's already in ABC, fine).

**Per-package `tsconfig.json`** — collapse from:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src", "composite": false },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "tests"],
  "references": [{ "path": "../types" }, { "path": "../spend-tracker" }]
}
```

to:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*"]
}
```

Match A2A's `packages/core/tsconfig.json`.

> If you genuinely need `tsc -b --watch` for incremental dev, keep references — but then also keep
> the `tsconfig.tsbuildinfo` clutter (M4). A2A picks the simpler path because tsup handles builds
> and watch is rare.

---

### [ ] M4. Clean up stray `tsconfig.tsbuildinfo` files

These exist on disk (left over from composite-mode builds):

```
./dist/tsconfig.tsbuildinfo
./packages/budget-engine/tsconfig.tsbuildinfo
./packages/cli/tsconfig.tsbuildinfo
./packages/llm-router-plugin/tsconfig.tsbuildinfo
./packages/middleware/tsconfig.tsbuildinfo
./packages/otel-bridge/tsconfig.tsbuildinfo
./packages/pricing/tsconfig.tsbuildinfo
./packages/spend-tracker/tsconfig.tsbuildinfo
./packages/types/tsconfig.tsbuildinfo
```

`git ls-files | grep tsbuildinfo` shows none are tracked — good. But:

1. They live in `dist/` (already gitignored) and per-package roots.
2. `.gitignore` already has `*.tsbuildinfo` (line 8) → safe.
3. After M3 (no composite mode), nothing will regenerate them. Delete them now: `find . -name tsconfig.tsbuildinfo -not -path './node_modules/*' -delete`.

---

### [ ] M5. Bump dev tooling versions to match A2A

ABC's tooling has drifted:

| Dep | a2a-reference-ts | agent-budget-controller | Action |
|--|--|--|--|
| `typescript` | `^5.8.3` | `^5.7.2` | bump |
| `vitest` | `^3.1.1` | `^2.1.8` | **major bump** — review breaking changes |
| `@vitest/coverage-v8` | `3.2.4` | `^2.1.9` | bump with vitest |
| `turbo` | `^2.5.0` | `^2.5.0` | ok |
| `tsup` (per-pkg) | `^8.4.0` | `^8.4.0` | ok |
| `@changesets/cli` | `^2.28.1` | `^2.27.11` | bump |
| `@changesets/changelog-github` | `^0.6.0` | `^0.6.0` | ok |

**Action:** `pnpm up -r typescript vitest @vitest/coverage-v8 @changesets/cli` and verify tests still pass.

Vitest 2 → 3 is a major and may surface deprecations. Validate `pnpm test` clean before publish.

---

### [ ] M6. Bump `packageManager` to pnpm 10

```diff
- "packageManager": "pnpm@9.15.0"
+ "packageManager": "pnpm@10.22.0"
```

A2A is on pnpm 10. Newer pnpm versions have safer auto-install behavior and faster resolution.
You'll likely need to regenerate `pnpm-lock.yaml` (`rm pnpm-lock.yaml && pnpm install`) — review
the lockfile diff carefully before committing.

> CI uses `pnpm/action-setup@v6` which reads `packageManager` from `package.json`, so this propagates
> automatically to GitHub Actions.

---

### [ ] M7. Add `examples/*` to `pnpm-workspace.yaml`

ABC has `examples/standalone`, `examples/with-llm-router`, `examples/with-otel-cost-exporter` on
disk but `pnpm-workspace.yaml` only contains:

```yaml
packages:
  - 'packages/*'
```

Examples can't currently use `workspace:*` to depend on their sibling packages. Match A2A:

```yaml
packages:
  - 'packages/*'
  - 'examples/*'
```

(A2A also has `'e2e'` — ABC has no `e2e/` directory, so skip that line.)

After this change, examples that want to dogfood the workspace's own packages can declare e.g.:

```json
"@reaatech/agent-budget-engine": "workspace:*"
```

instead of pinning to the published version.

---

### [ ] M8. Reconcile `.npmrc`

Different intents:

```diff
-# agent-budget-controller/.npmrc
-registry=https://registry.npmjs.org/
-save-exact=true
+# a2a-reference-ts/.npmrc
+shamefully-hoist=false
+strict-peer-dependencies=true
```

`save-exact=true` makes new `pnpm add` calls write `1.2.3` instead of `^1.2.3` — fine for apps,
**bad for libraries** since it means consumers can't dedupe. Drop it.

`strict-peer-dependencies=true` (A2A) catches missing peers at install time — useful in a workspace.

**Recommended merged content:**

```
shamefully-hoist=false
strict-peer-dependencies=true
```

(Drop the explicit `registry=` — pnpm defaults to npmjs.org anyway, and per-scope GitHub Packages
overrides go in CI's transient `.npmrc`, not the committed one.)

---

### [ ] M9. Align CI workflow structure

ABC `ci.yml` is 70 lines, single `build` job. A2A `ci.yml` is 382 lines, separated into:

```
install (cache) → audit, format, lint, typecheck, build → test (matrix), coverage → all-checks
```

The A2A version is heavier but gives:
- Faster signal: lint failures don't wait for build to finish.
- Discrete required-status-checks for branch protection.
- A "barrel" `all-checks` job to gate merges on a single check.

ABC has `audit` already (called `security`); the rest is missing. A2A also runs `docker-build` and
`docker-compose` — skip those for ABC (no Dockerfile).

**Decision needed:** if you want strict conformity, port A2A's `ci.yml`. If you just want
fast/correct CI and don't need split status checks, ABC's current setup is fine. Marking as
**optional** but flagged.

Also: ABC tests on Node `[22, 23]`, A2A tests on `[20, 22]`. Pick a target. Convention: test the
oldest LTS you support (`20`) plus current (`22`). `23` is non-LTS and rarely worth gating on.

```diff
- node-version: ['22', '23']
+ node-version: ['20', '22']
```

---

### [ ] M10. Action versions: decide pin v4 vs v6

ABC was bumped to `v6` by Dependabot (`actions/checkout@v6`, `pnpm/action-setup@v6`,
`actions/setup-node@v6`, `actions/upload-artifact@v7`). A2A is on `v4` across the board.

Both work. Recommendation: **stay on v6** in ABC (Dependabot will keep it current) and consider
bumping A2A on its next maintenance pass — don't downgrade ABC for conformity's sake.

---

## LOW — stylistic / housekeeping

### [ ] L1. Align `package.json` field ordering across packages

A2A's per-package field order:

```
name, version, description, license, author, repository, homepage, bugs,
type, main, module, types, exports, files, publishConfig,
scripts, dependencies, devDependencies
```

ABC's order has `repository`, `bugs`, `homepage` before `license`, `author`. Pure cosmetic — no
functional impact. Skip if you don't care.

---

### [ ] L2. Drop `git+` prefix in repository URLs (or add to A2A)

ABC's `package.json`: `"url": "git+https://github.com/..."` (works, technically more correct).
A2A's `package.json`: `"url": "https://github.com/..."` (also works).

npm normalizes both. Pick one and align. Recommendation: **keep ABC's form** — `git+` is the spec.

---

### [ ] L3. Bump `version` on root `package.json` from `0.0.0` → `0.1.0`

`agent-budget-controller/package.json:3` is `"version": "0.0.0"`. Doesn't affect publishing (root
is `private: true`), but visually inconsistent with the per-package versions and with A2A's root
(`0.1.0`).

Cosmetic. Bump when convenient.

---

### [ ] L4. Resolve the `budget-engine` directory/package name mismatch

Current state:

```
packages/budget-engine/   →  @reaatech/agent-budget-engine
```

vs. every other package:

```
packages/types/           →  @reaatech/agent-budget-types
packages/pricing/         →  @reaatech/agent-budget-pricing
...
```

The directory name should be the package-name suffix (i.e., what comes after `agent-budget-`).
This is the convention A2A follows perfectly (e.g. `packages/core` → `@reaatech/a2a-reference-core`).

The release workflow already papers over this with a fallback:

```bash
dir="packages/${name#@reaatech/agent-budget-}"
[ -d "$dir" ] || dir="packages/budget-${name#@reaatech/agent-budget-}"
```

**Two options:**

- **Option A (proper fix):** Rename `packages/budget-engine` → `packages/engine`. Update:
  - The directory name (`git mv`).
  - `tsconfig.typecheck.json` path (after M2).
  - Root `tsconfig.json` `references` (if M3 not yet applied).
  - Any `import` path that references `packages/budget-engine` (search before/after).
  - Remove the fallback line in `.github/workflows/release.yml`.
- **Option B (accept):** Leave it. The fallback handles it. But it's an asymmetry future contributors
  will trip over.

**Recommended: Option A**, before first publish. After publish, the package name `@reaatech/agent-budget-engine`
is permanent on npm, but the directory is internal and free to rename anytime.

---

### [ ] L5. Decide whether to keep `dev: "tsc -b --watch"` script

Root `package.json` has `"dev": "tsc -b --watch"` which only works under composite project mode.
After M3 (drop composite), this script breaks.

- If keeping watch-mode dev: replace with `"dev": "turbo run dev"` and add `"dev": "tsup --watch"`
  to each package.
- If not actively using it: delete the script.

A2A has no `dev` script.

---

### [ ] L6. Sweep miscellaneous `.gitignore` differences

Items in ABC's `.gitignore` not in A2A's (all harmless, can keep):

- `.nyc_output/`
- `tmp/`, `temp/`, `*.tmp`
- `*~`

No action required unless you want strict alignment.

---

### [ ] L7. Engines field consistency

ABC root `package.json`:

```json
"engines": { "node": ">=22.0.0", "pnpm": ">=9.0.0" }
```

A2A root has no `engines` field (each package may declare its own; only A2A's CLI-ish packages do).

Engines fields are advisory in pnpm by default but warn on `npm install`. Recommendation: **keep
ABC's** — it's a useful guard. After M6, bump pnpm floor:

```diff
- "pnpm": ">=9.0.0"
+ "pnpm": ">=10.0.0"
```

---

## Suggested execution order

The cheapest path that minimizes rebase pain:

1. **C1, C2** — both small, both block publish. Fix immediately, single commit.
2. **L4 (rename `budget-engine`)** — do early before other refactors touch the dir.
3. **M7 (workspace yaml)**, **M8 (.npmrc)**, **L3 (root version)** — trivial one-liners.
4. **H1 (dual ESM/CJS)** — touches every package's `tsup.config.ts` and `package.json`. Single
   focused commit.
5. **M5, M6 (dep bumps)** — separate commit. Run full test suite.
6. **M3, M4 (tsconfig simplify + cleanup)** — coupled. Drop composite mode and clean buildinfo.
7. **M2 (tsconfig.typecheck.json)** — depends on M3.
8. **M1 (Biome migration)** — biggest blast radius. Save for last in its own PR. Expect Biome
   to flag style issues ESLint missed.
9. **M9, L1, L2, L5, L6, L7** — polish, only if you want strict conformity.

Expected total: 4–6 PRs / commits, ~1 day of work end-to-end.

---

## Verification checklist (post-remediation)

- [ ] `pnpm install` clean, `pnpm-lock.yaml` regenerated
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes (Biome, after M1)
- [ ] `pnpm test` green on Node 20 and 22
- [ ] `pnpm build` produces both `dist/index.js` AND `dist/index.cjs` for each package (after H1)
- [ ] `pnpm changeset status` shows the queued `initial-release.md` is intact
- [ ] CI green on the remediation PR(s)
- [ ] First publish from main triggers the release workflow successfully
- [ ] All 8 packages appear on npm with `latest` tag at `0.1.0`
- [ ] Mirror step writes all 8 packages to `https://github.com/reaatech?tab=packages`
- [ ] `npm view @reaatech/agent-budget-types` shows correct repo, homepage, exports

When this list is fully checked, ABC will be at structural parity with `a2a-reference-ts`.
