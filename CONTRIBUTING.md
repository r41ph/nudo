# Contributing to Nudo

This guide covers how we develop features here: how to set up an isolated
workspace, when a change needs a pull request, and the testing and review
standards every change is held to. It's for humans — whether you write the code
yourself or with AI assistance.

New to the repo? Read [`README.md`](./README.md) first for architecture, the
tech stack, and one-time environment setup (`pnpm install`, `.env` files,
`pnpm docker:up`, `pnpm db:migrate`). This guide picks up from there.

## Ways to contribute

Implement a feature however you work best — the standards below apply either way:

- **By hand.** Follow this guide directly.
- **With AI assistance.** Claude (via Claude Code) is our main tool. You can
  pair with it informally, or — for anything non-trivial — use the
  [agent-skills](https://github.com/addyosmani/agent-skills) plugin, which is
  the **recommended approach for complex work**. When you use agent-skills,
  drive the change through its spec-driven flow: `/spec-driven-development`
  (spec → plan → tasks → implement), then `/review` before you open the PR.

The conventions in this guide are mirrored for agents in
[`CLAUDE.md`](./CLAUDE.md) and the rule files under
[`.claude/rules/`](./.claude/rules), which Claude loads automatically. They are
the same source of truth — if this guide and those files ever disagree, open a
PR to fix the drift.

---

## 1. Development Setup

We develop each feature in its own **git worktree** rather than switching
branches in a single checkout. A worktree is a second working directory backed
by the same repository, so each feature gets an isolated set of files. That
means no half-finished changes leaking between features, no stashing to switch
context, and dependencies/build state that stay consistent per branch.

From the repository root, create a worktree for your feature:

```bash
git fetch origin
git worktree add -b feature-name ../feature-name origin/main
```

`-b feature-name` creates a new branch for your work; branching from
`origin/main` right after a `git fetch` guarantees you start from the latest
upstream tip. (Omit `-b` and pass a bare ref and Git checks it out in _detached
HEAD_ with no branch — not what you want.) This puts the new branch in a new
directory `../feature-name`. Work there as you would in any checkout:

```bash
cd ../feature-name
pnpm install        # install deps for this worktree
# ... build the feature ...
```

When the feature is merged and you no longer need the worktree, remove it:

```bash
git worktree remove ../feature-name
```

Never develop a feature directly on a shared, long-lived branch — isolation is
the whole point.

---

## 2. Workflow Overview

We split changes into two lanes based on risk:

- **Non-trivial changes** — features, application logic, configuration that
  affects behavior, anything touching multiple files — go through a **branch and
  a pull request**. They get tests, review, and the full process below.
- **Trivial changes** — documentation, typos, `.gitignore` tweaks, and similar
  zero-risk edits — may be committed **directly to `main`**.

**Why:** `main` must always be stable and deployable. Routing every behavioral
change through a PR keeps untested or half-finished work off the main line,
while letting genuinely safe edits skip the ceremony so the process stays
proportional to the risk. When in doubt, treat the change as non-trivial and
open a PR.

---

## 3. Before You Code

We work **spec-first** for non-trivial features.

- If a spec for your feature already exists under [`docs/specs/`](./docs/specs)
  (`<feature>.md`, plus its `.plan.md` and `.tasks.md`), read it and implement
  exactly what it describes. If you find the spec is incomplete or wrong, raise
  that with the maintainers _before_ writing more code — don't silently diverge.
- If no spec exists, **talk to the maintainers first.** A non-trivial feature
  should be specified before implementation so everyone agrees on scope and
  approach. Surface your assumptions explicitly rather than filling gaps
  silently.

See the **Feature Workflow** section of [`CLAUDE.md`](./CLAUDE.md) for the full
spec-driven lifecycle.

---

## 4. Testing Requirements

Every change brings the test layers its type requires — this is not optional.
The authoritative matrix and definition-of-done live in
[`.claude/rules/testing.md`](./.claude/rules/testing.md). In summary:

- **TDD for logic and bug fixes.** Write the failing test first; for a bug, add
  a regression test that fails _before_ your fix, then make it pass. Unit tests
  cover pure logic; integration tests cover features and API routes. End-to-end
  tests are reserved for cross-cutting user journeys — keep that layer small.
- **Storybook for UI.** Every new or changed UI component ships a
  `*.stories.tsx` covering its meaningful states (default, loading, error,
  empty). API-only work has no story.
- **Error handling.** Never swallow errors or fake success. On the web, surface
  failures to the user (e.g. the SaveBar and query error states), not just the
  console. On the API, return the correct status code (400 / 401 / 403 / 404 /
  409 / 500) and never leak internals. Details in
  [`.claude/rules/frontend.md`](./.claude/rules/frontend.md) and
  [`.claude/rules/api.md`](./.claude/rules/api.md).

Run only the tests relevant to your change, not the whole suite:

```bash
pnpm test:web                  # web unit + integration
pnpm test:api                  # API unit (fast, DB-free)
pnpm test:api:int              # API integration (needs docker:up + test:db:setup)
pnpm vitest run save-bar       # filter by partial filename
```

A feature is not done until the layers the matrix mandates exist and pass, and
no test was skipped or deleted to go green.

---

## 5. PR Process

Open the pull request as the **last** step, once the work is committed and the
tests pass. The PR and its spec must link to each other:

- Point the **PR description at the spec** it implements:
  `Spec: docs/specs/<feature>.md`.
- Once the PR exists, **stamp the spec with the PR URL** —
  `> Status: <state> (PR #NN — <url>)` at the top of the spec, matching the
  convention in existing specs — and commit that update **into the same PR**, so
  the spec always points back to the PR that shipped it.

This bidirectional link is summarized here; the full PR step lives in the
**Feature Workflow** section of [`CLAUDE.md`](./CLAUDE.md).

### Branching and merging

Cut a short-lived branch from `origin/main` for each feature or fix. Keep it
current by rebasing rather than merging, then update the remote with
`--force-with-lease` — unlike `--force`, it refuses to overwrite commits someone
else pushed since your last fetch:

```bash
git fetch origin
git rebase origin/main
git push --force-with-lease
```

PRs are merged with **Squash and Merge**, using a Conventional Commit message for
the squash commit (e.g. `feat: add user authentication`). Delete the branch
afterwards.

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org): each message
starts with a type — `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `build:`,
`chore:` — followed by a short imperative summary, e.g.
`feat: add folder drag-and-drop`. Don't add `Co-Authored-By:` lines.

This is enforced by commitlint **at push time, not per commit**, so make `wip`
commits freely while you work and tidy them up (`git rebase -i`) before pushing.

Local hooks (Husky) run automatically: formatting, linting, and secret scanning
on commit; Conventional Commit checks and typechecking on push. See
[`README.md`](./README.md#local-hooks) for what runs when.

---

## 6. Reporting Bugs & Requesting Features

You don't have to write code to contribute.

- **Found a bug?** Open a GitHub issue with what you expected, what actually
  happened, and the steps to reproduce. Note the affected area (web / API /
  editor) and your environment if it's relevant.
- **Want a feature?** Open an issue describing the _problem_ you're trying to
  solve before proposing a solution. Non-trivial features get specced under
  [`docs/specs/`](./docs/specs) (see §3) before any code is written.
- **What to expect on a PR:** a maintainer reviews each one. Keep PRs focused
  and small where you can — they're faster to review and safer to merge.
  Respond to review comments by pushing follow-up commits to the same branch.

---

## 7. Further Reading

- [`CLAUDE.md`](./CLAUDE.md) — the full feature workflow, commands, path
  aliases, conventions, and hook behavior. This is the canonical source for how
  work flows through the repo.
- [`.claude/rules/testing.md`](./.claude/rules/testing.md) — the required-tests
  matrix and feature definition-of-done.
- [`.claude/rules/frontend.md`](./.claude/rules/frontend.md) — React/web
  architecture, feature boundaries, GraphQL, and error handling.
- [`.claude/rules/api.md`](./.claude/rules/api.md) — Express/PostGraphile, RLS,
  migrations, auth, and error handling.
- [`.claude/rules/state.md`](./.claude/rules/state.md) — server vs. client state
  (TanStack Query vs. Jotai).
- [`README.md`](./README.md) — architecture, tech stack, and one-time setup.
