# Handoff: Outline row, row menu & token repairs (—nudo.)

Direction **1a "Same bones, repaired"** from the design review, scoped down to what belongs in this ticket.

## Overview

The outline rail's row styling, its per-row actions, and the app's color tokens. No layout, routing, or schema changes. The rail stays 244px, the top bar stays where it is, the page stays a single centred column.

Three things this ticket delivers:

1. A repaired outline row — bigger targets, calmer hover, a permanent action slot instead of three icons that appear and disappear.
2. One row menu (`⋯`) replacing the hover-revealed add/rename/delete icons, with a confirm step on delete.
3. Token value corrections that fix the contrast failures in both light and dark mode.

## Explicitly out of scope

- **The fixed toolbar.** The design shows `FixedToolbar` restored above the editor. There is already a separate ticket for that — leave `plate-editor.tsx` alone, keep the floating selection toolbar as-is.
- The chapter progress bands, word targets, search, and comment margin (those were directions 1b/1c, not agreed).
- Mobile / responsive layout.
- The top bar's save cluster and word counter — noted at the end as a follow-up, not part of this change.

## About the design files

`Nudo Redesign.dc.html` in this bundle is a **design reference written in HTML** — a static prototype of the intended look, not production code to copy. Implement it in the existing app: React 19 + Tailwind v4 + shadcn/ui in `apps/web` and `packages/ui`, using the components already vendored there. Direction **1a** is the one being built; **1b** and **1c** are in the same file for context only — ignore them.

Fidelity: **high**. Colors, sizes, weights and spacing below are final values, not suggestions.

---

## 1. Outline row

`apps/web/src/features/outline/components/outline-row.tsx`

### Geometry

| | Current | Target |
| --- | --- | --- |
| Row height | 32px (`h-8`) | **34px** |
| Separator row height | 28px | **34px** (same as any other row) |
| Row padding | `px-2` | `px-2` (unchanged) |
| Row radius | `rounded-[7px]` | **`rounded-lg` (8px)** — and use the same value for every row-like surface |
| Gap between row items | — | **8px** |
| Chevron / toggle hit area | 20px | **24px** minimum |
| Action button | 20px | **26px** |
| Status dot | 20px | **26px** hit area, 9px visual dot |
| Indent per level | `ml-5` | `ml-5` (unchanged) + a 1px `--border` guide line on the left of the nested group |

### States

The important change: **hover must not use the accent.** Today hover and selected both read as terracotta tint, so hovering down the tree looks like four selections.

- **Hover** — `background: rgba(42,37,31,0.035)` in light, `rgba(232,223,208,0.05)` in dark. A neutral ink wash. Nothing else changes.
- **Selected** — `background: rgba(168,80,47,0.12)` (accent at 12%), and the title goes to `font-weight: 600`. **No left bar** — the earlier design had an `inset 2.5px 0 0` accent bar; it is removed. Fill plus weight carries it.
- **Selected + hover** — same fill, no additional change.
- **Focus-visible** — `outline: 2px solid var(--accent); outline-offset: 2px`. Rows have no focus style at all today, so keyboard position in the tree is invisible. This is required.
- **Drag over** — unchanged.

### Row anatomy, left to right

1. Disclosure chevron, 24px, only on folder rows (`▾` / `▸`), `--muted-foreground`.
2. Title. Chapters (folders) at **14px / 600**; documents at **13.5px / 400**, **500** when selected. `truncate` — but see below.
3. Word count, **11.5px**, `--muted-foreground`, `font-variant-numeric: tabular-nums`. Right-aligned, no fixed-width column: let the title take the space it needs.
4. Status dot — folder rows only, 26px hit area.
5. Action slot, **26px, always present** (see §2).

The title currently truncates at ~14 characters ("Welcome Docum…") because the count column and two icon slots are reserving fixed width. Drop the fixed count column; the count is `flex-shrink: 0` but only as wide as its digits.

### Group label

`apps/web/src/features/sidebar/components/sections/manuscripts-section.tsx`

"STORY" is currently 14px uppercase with wide tracking — louder than the chapter titles below it. Take it to **10.5px / 600 / 0.14em tracking**, color `--faint` (at its new value). Put a **26px** add button on the right of the same row.

---

## 2. Row menu

New: `apps/web/src/features/outline/components/row-menu.tsx`. Replaces the hover-revealed icon cluster in `outline-row.tsx` and the current `add-node-menu.tsx` trigger.

**This is the part of the design to get right.** The specific complaint it answers: today the row's icons are `opacity-0` until hover, so they are unreachable by keyboard and touch, and when the `+` menu opens the other icons vanish out from under the cursor.

### Trigger

- A 26px `rounded-md` button in the row's permanent last slot, glyph `⋯` (Lucide `more-horizontal`, 14px).
- `opacity: 0` on the *icon only* at rest — the slot keeps its width, so nothing reflows on hover and the word count never moves.
- Visible at `opacity: 1` on row hover, on `:focus-visible`, and **while the menu is open**. Currently the icons drop out when the menu opens; they must stay lit.
- `aria-label="Actions for {title}"`, real button, in the tab order at all times.

### Menu

shadcn `DropdownMenu`. 176px wide, `rounded-lg`, 5px padding, `--popover` background, 1px `--border`, `--shadow-md`.

Items are **30px** rows, `rounded-md`, 12.5px, 9px gap between icon and label, icons at 14px:

| Item | Icon | Action |
| --- | --- | --- |
| Rename | `pencil` | inline rename (see §3) |
| Set status | `circle-dashed` | submenu — the existing `status-control.tsx` options |
| New inside | `plus` | create child; folder rows only |
| Duplicate | `copy` | duplicate node + subtree |
| — divider — | | 1px `--border`, 4px margin, 6px inset |
| Delete… | `trash-2` | confirm dialog (see §4) |

Delete is `--destructive` and carries the ellipsis because it opens a dialog. Every item has a text label — no icon-only entries.

### Footer "New" button

`apps/web/src/features/sidebar/components/sidebar-footer-actions.tsx`

Two entry points currently look identical and do different things (root vs child) with nothing to distinguish them. Fix by labelling scope: the footer button reads **"New in {selected chapter}"** and follows selection, falling back to "New chapter" at the root. 36px, `--accent` fill, `--accent-foreground` label, 13.5px / 600.

While you're in this file: Log out, Trash and Help share one 12px row at equal weight, and two of them aren't wired to anything. Replace with an account row — 26px avatar, email at 12.5px `--foreground`, chevron — opening a menu that holds Settings, Trash, Help and Log out, with Log out separated by a divider.

---

## 3. Rename

Renaming currently swaps the whole row for a bare input, so count, status and indent markers all vanish mid-edit, and blur commits silently.

- Keep the row's chrome. Only the title becomes an input, in place, at the same font size and weight, transparent background, `outline: 2px solid var(--accent); outline-offset: 2px`.
- Enter commits, Escape reverts.
- Blur commits, but show the resulting title change as a toast with Undo — silent commit-on-blur is how people lose titles.

---

## 4. Delete confirmation

New: `apps/web/src/features/outline/components/delete-node-dialog.tsx`, shadcn `AlertDialog`.

Today delete is a 20px hover-revealed icon that cascades the whole subtree with no confirmation and no undo. **This is the highest-severity issue in the review.**

- Title: `Delete "{name}"?`
- Body, when the node has descendants: name the blast radius exactly — `This also deletes 2 documents inside it. This can't be undone.` Count the real descendants; don't say "and its contents".
- Body, leaf node: `This can't be undone.`
- Actions: `Cancel` (secondary) and `Delete` (destructive fill). Cancel is the default focus.
- Keep the existing `pickAdjacentDocument` navigation behaviour on confirm — that part is already right.

---

## 5. Tokens

`packages/ui/src/tailwind.css`

Two values fix most of the sidebar's contrast at once. Ratios below are against the surface each token is actually used on.

### Light

| Token | Current | Target | Why |
| --- | --- | --- | --- |
| `--muted-foreground` | `#9a9286` | **`#6f665b`** | 2.6:1 → ~5.1:1 on `--sidebar`. Every inactive title, every footer link. |
| `--faint` | `#b8af9f` | **`#8a8073`** | ~1.7:1 → ~3.6:1. Every word count, chevron and gear. Use only for ≥13px non-essential text; anything a user must read takes `--muted-foreground`. |
| `--accent` | `#b0573c` | **`#a8502f`** | Gets the accent-on-cream pair over 4.5:1 so the terracotta can carry text, not just fills. |

### Dark

Dark mode's actual bug: `--muted-foreground` is **darker** in dark mode than in light (`#8e867a` on `#1a1610` ≈ 3.4:1) — the inverse of what inverting should do. And `--background` / `--sidebar` sit one hair apart, so the rail doesn't read as a separate surface.

| Token | Current | Target |
| --- | --- | --- |
| `--background` | `#1a1610` | **`#1f1c18`** |
| `--sidebar` | `#151109` | **`#171410`** |
| `--prose` | — | **`#e8dfd0`** |
| `--muted-foreground` | `#8e867a` | **`#a39a8c`** |
| `--faint` | — | **`#877e71`** |
| `--accent` | — | **`#d98f62`** — desaturated and lifted; the light-mode terracotta is too dark to read on a dark ground |
| `--border` | — | **`#302d28`** |

Ground and rail now differ by a visible step, and every foreground got lighter rather than darker.

### Also

- `apps/web/src/index.css` forces `color: #4a5d5e !important` on the editor while the token layer sets `--prose: #3d372e`. The `!important` wins with a color that exists in no token file, so the editor's prose color is currently unrelated to the design system. **Delete that rule** and let `--prose` apply.
- `save-bar.tsx` uses four raw Tailwind colors (`orange-500`, `yellow-600`, `red-600`, `green-800`) in forty lines, none of them tokenised and none with a dark variant. Move them onto `--status-*` / `--destructive`. Small change, and it stops the chrome from being the one place that routes around the token layer.
- Radii: `rounded-[7px]` rows and `rounded-sm` page are two arbitrary values, and the declared `--radius: 0.625rem` is used by neither. Settle on `--radius: 0.5rem` and use `rounded-lg` for rows, menus and buttons.
- Two identical logo SVGs are swapped by `dark:hidden` and duplicated across two components. One `currentColor` mark replaces all four references.

---

## 6. Focus mode

`apps/web/src/features/document/components/document-page.tsx`

Two small fixes, no redesign:

- **Escape exits.** There is no Escape handler today; the only way out is an unlabelled 28px ghost button.
- Show the exit affordance as an `esc` key hint, top right, 26px, beside the word count. Keep the count; drop the timestamp.

---

## Acceptance

- [ ] No text in the sidebar below 4.5:1 against `--sidebar`, light and dark.
- [ ] Every interactive target in the rail ≥24px; row actions and status dots 26px.
- [ ] Every row action reachable by keyboard alone, with a visible focus ring on the row itself.
- [ ] Hovering a row is visibly different from a row being selected.
- [ ] The word count does not move or disappear when the row menu opens.
- [ ] Delete cannot destroy a subtree without a dialog that states how many documents go with it.
- [ ] Escape exits focus mode.
- [ ] No raw Tailwind color utilities left in `save-bar.tsx`; no `!important` color in `index.css`.

## Deferred to their own tickets

- Fixed toolbar above the editor (already ticketed).
- Top bar save cluster: three colors and second-precision timestamps at the highest-salience point on the screen. Should become one state at minute precision.
- The page's fixed ~700px bottom edge and 24px shadow — the only elevated surface in an app with no other shadows.
- `use-mobile.ts` and `Sheet` are both vendored and imported by nothing; `Sidebar collapsible="none"` means the rail can never get out of the way. Mobile is roughly two props and one breakpoint away from existing.

## Files in this bundle

- `Nudo Redesign.dc.html` — the three directions. Build **1a** only; its row menu and focus mode are shown enlarged 1.6× beside the full screen.
- `Nudo Critique.dc.html` — the review this came from, with the annotated screen capture and the measured contrast ratios.
