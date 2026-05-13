# Spec: Setup Husky

Branch: `chore/setup-husky` · PR: "Setup Husky"

## Objective

Catch formatting, lint, type, secret, and commit-message issues locally — before they hit the remote — without slowing the inner loop.

**Users:** all repo contributors.

**Success:** every commit and every push is formatted, linted, type-clean, secret-free, and conventionally messaged — automatically.

## Tech Stack

- husky `^9`
- lint-staged `^15`
- secretlint + `@secretlint/secretlint-rule-preset-recommend` `^9`
- @commitlint/cli + @commitlint/config-conventional `^19`
- existing: prettier `^3.7`, eslint `^9.39`, typescript-eslint `^8.50`, pnpm `10.26`

## Commands

**Root `package.json` additions:**

```
"prepare": "husky"                                  # installs hooks on pnpm install
"format": "prettier --write ."                      # full-repo format (manual use)
"typecheck": "pnpm -r --if-present typecheck"       # fans out to workspaces
"lint:precommit": "eslint --config eslint.config.precommit.mts"   # used by lint-staged
```

**Per-workspace additions (only where missing):**

- `apps/api/package.json` → add `"typecheck": "tsc --noEmit"`
- `packages/ui/package.json` → **no typecheck script.** The package has pre-existing standalone typecheck issues (real bugs in `block-suggestion.tsx`, stories referencing `@web/*` deps not installed in packages/ui). `apps/web`'s `tsc -b` already typechecks the subset of `packages/ui` that production code imports — that's the load-bearing coverage. Standalone `packages/ui` typecheck is a separate concern.
- `apps/web/package.json` → already has `"typecheck": "tsc -b --noEmit"` ✓

## Project Structure

```
.husky/
  pre-commit                      # lint-staged + secretlint on staged files
  pre-push                        # commitlint on push range + pnpm typecheck
commitlint.config.mjs             # extends @commitlint/config-conventional
.secretlintrc.json                # extends preset-recommend
.secretlintignore                 # excludes .env.example, lockfile, build dirs
eslint.config.precommit.mts       # extends base flat config; adds no-console / no-debugger as errors
package.json                      # new scripts + lint-staged block
apps/api/.env.example             # local-dev defaults (DATABASE_URL matches docker-compose)
docs/specs/setup-husky.md         # this spec
README.md                         # scrub inline env values; point to .env.example; add "Local hooks" section
CLAUDE.md                         # add "Local hooks" section
```

**lint-staged block (root `package.json`):**

```json
"lint-staged": {
  "*.{ts,tsx,mts,mjs,js}": [
    "prettier --write",
    "pnpm lint:precommit --fix --max-warnings=0",
    "pnpm exec secretlint"
  ],
  "*.{json,md,yml,yaml,css}": [
    "prettier --write",
    "pnpm exec secretlint"
  ]
}
```

## Code Style

Hook scripts are plain shell (Husky 9 style — no source line):

```sh
#!/usr/bin/env sh
# .husky/pre-commit
pnpm lint-staged
```

```sh
#!/usr/bin/env sh
# .husky/pre-push
#
# Runs on every `git push`. For each branch being pushed:
#   1. Checks that every new commit message follows Conventional Commits.
#      - For a brand-new branch: validates everything since it diverged from main.
#      - For an existing branch: validates only the commits being added.
#   2. Type-checks every workspace (whole project, not just changed files).
# Push is blocked if either check fails. Bypass with `git push --no-verify`.

ZERO=0000000000000000000000000000000000000000

while read local_ref local_sha remote_ref remote_sha; do
  if [ "$remote_sha" = "$ZERO" ]; then
    range_start=$(git merge-base "$local_sha" origin/main)
  else
    range_start="$remote_sha"
  fi
  pnpm exec commitlint --from "$range_start" --to "$local_sha"
done

pnpm typecheck
```

`eslint.config.precommit.mts` extends the base config rather than redefining rules:

```ts
import base from './eslint.config.mts';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...base,
  {
    files: ['**/*.{ts,tsx,mts,mjs,js}'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
    },
  },
]);
```

## Commit Message Workflow

- `commit-msg` hook is **not** installed — `git commit -m "wip"` is allowed locally
- `pre-push` validates the full range against the merge-base with `origin/main` (new branch) or against `remote_sha` (existing branch)
- Devs are expected to `git rebase -i` to clean up WIP commits before pushing
- Escape hatch: `git push --no-verify` (discouraged, document but don't disable)

## Testing Strategy

This is tooling, not application code — verification is procedural and lives in the PR test plan:

| Check                                     | How to verify                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| Husky installs on fresh clone             | `rm -rf node_modules .husky/_ && pnpm install` → hooks present and executable |
| Pre-commit formats unformatted code       | Stage a poorly-formatted file → commit → file is rewritten and re-staged      |
| Pre-commit blocks `console.log`           | Stage a file with `console.log('x')` → ESLint errors, commit blocked          |
| Pre-commit blocks secrets                 | Stage a file with a realistic-looking AWS key → secretlint blocks             |
| `wip` commits allowed locally             | `git commit -m "wip"` → succeeds                                              |
| Pre-push blocks non-conventional messages | Push a branch containing a `wip` commit → commitlint blocks                   |
| Pre-push blocks type errors               | Introduce a TS error, commit (conventional), push → typecheck fails           |
| Escape hatches work                       | `git commit --no-verify` and `git push --no-verify` succeed                   |

## Documentation Deliverables

Both must ship in the same PR — local hooks are useless if devs/agents don't know they exist.

- **`README.md` — "Local hooks" section.** For human devs. Covers:
  - What runs on commit vs. push
  - Install steps (just `pnpm install`; the `prepare` script handles the rest)
  - WIP-commit workflow (commit freely, rebase before push)
  - When and how to use `--no-verify`

- **`CLAUDE.md` — "Local hooks" section.** For future agents. Covers:
  - Which checks run at commit vs. push (so agents don't redundantly re-run them)
  - The WIP-commit + `rebase -i`-before-push workflow (so agents don't fight it)
  - That `--no-verify` is an escape hatch, not a default
  - Which files configure the hooks (`.husky/*`, `eslint.config.precommit.mts`, `commitlint.config.mjs`, `.secretlintrc.json`, `.secretlintignore`) so agents know where to make changes

## Boundaries

**Always:**

- Call pnpm scripts from hook bodies — don't shell out to raw `tsc`, `eslint`, or `prettier`
- Keep pre-commit under ~5s on a typical single-file change (measure during implementation)
- Commit `.husky/*` scripts so they're version-controlled

**Ask first:**

- Adding any check that adds >2s to pre-commit
- Changing the lint-staged glob patterns
- Adding a `pre-push` check beyond commitlint + typecheck (esp. running tests — already decided against)
- Modifying ESLint rules in the **base** config (the pre-commit override is fair game)
- Pinning major versions different from those listed in Tech Stack

**Never:**

- Use `--no-verify` in committed scripts
- Source the deprecated `_/husky.sh` (Husky 9 dropped it)
- Add commitlint rules that diverge from Conventional Commits (CLAUDE.md mandates it)
- Skip secret scanning — repo is going public
- Add `Co-Authored-By:` lines to commits made for this work (CLAUDE.md prohibits)

## Success Criteria

- [ ] `pnpm install` on a fresh clone installs and enables all hooks via the `prepare` script
- [ ] Pre-commit runs prettier + ESLint (with `no-console` / `no-debugger`) + secretlint on staged files only
- [ ] Pre-commit completes in <5s for a typical single-file change (measured and noted in PR)
- [ ] `wip` commits succeed locally; pre-push rejects them when included in the push range
- [ ] Pre-push runs `pnpm typecheck` across `apps/web` and `apps/api` and blocks push on failure
- [ ] `packages/ui` is typechecked transitively via `apps/web`'s `tsc -b` (production-relevant subset only)
- [ ] `git commit --no-verify` and `git push --no-verify` remain functional as escape hatches
- [ ] `README.md` has a "Local hooks" section explaining the workflow to devs
- [ ] `CLAUDE.md` has a "Local hooks" section explaining the workflow to future agents
- [ ] PR description links back to this spec

## Open Questions

None — all resolved.
