# Capability Map: Quality Constraints

> Status: Map approved (2026-10-22). `security-constraints` spec approved (2026-11-18).

Give agents (and humans) a written, enforced quality bar for security,
performance and accessibility. Each module delivers a path-scoped rule in
`.claude/rules/`, DoD and required-tests entries in `.claude/rules/testing.md`,
and automated gates (lint, tests, CI, Lighthouse CI) that fail when the bar is
lowered.

| Module id                   | Responsibility                                                                        | Depends on |
| --------------------------- | ------------------------------------------------------------------------------------- | ---------- |
| `security-constraints`      | `rules/security.md`, threat model, dependency audit, API hardening gates              | —          |
| `accessibility-constraints` | `rules/accessibility.md`, WCAG 2.2 AA, jsx-a11y, axe in tests/Storybook, Lighthouse   | —          |
| `performance-constraints`   | `rules/performance.md`, CWV + bundle + API budgets, Lighthouse CI, bundle-size gate   | —          |

Build order: `security-constraints` → `accessibility-constraints` →
`performance-constraints`.

No module depends on another's contract. The order is serial only because
all three edit `testing.md` and `CLAUDE.md`. `accessibility-constraints`
introduces the Lighthouse CI job (accessibility category only), and
`performance-constraints` extends the same job with performance budgets, which
are set from a baseline measured on that job.

Decisions recorded at map approval:

- Enforcement: **full gates**, including Lighthouse CI against a built app.
- Accessibility target: **WCAG 2.2 AA**.
- Performance budgets: **sane defaults**, adjusted in spec review.
- One spec and one PR per module.

Module specs:

- `docs/specs/quality-constraints-security.md`
- `docs/specs/quality-constraints-accessibility.md` (not written yet)
- `docs/specs/quality-constraints-performance.md` (not written yet)
