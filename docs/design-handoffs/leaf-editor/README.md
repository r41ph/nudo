# Handoff: Nudo Editor — "Leaf" restyle

> **This is an UPDATE to the existing Nudo app, not a new build.** Nudo already ships the
> sidebar, folder tree, editor (Plate.js), theme toggle, auth/logout, and icon set. The Leaf
> direction **restyles and extends** what exists — it does not replace it. Treat the prototype
> as the target appearance/behaviour; reach for the existing components first and change as
> little as possible. The high-value section below, **"What actually changes vs. current
> code"**, is the source of truth for scope.

## What actually changes vs. current code

| Area                     | Current code                                                                    | Change                                                                                                                                                                                                                                                              | Net                                                               |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Sidebar tree**         | Folders → Documents (2 levels) — `folder-tree.tsx`, `tree-item.tsx`             | Parts → Chapters → Sections (**3 levels**), status moon dots, per-row word counts, `+` add-action at each level                                                                                                                                                     | Same components + **one extra nesting level** (data-model change) |
| **Sidebar footer**       | `AddNewButton` + a row of Log out / Trash / Help (`sidebar-footer-actions.tsx`) | "New" → **"+ New part"**; **keep the Log out / Trash / Help row exactly where it is, directly under the New-part button**                                                                                                                                           | Mostly relabel; **do NOT remove logout**                          |
| **Top bar**              | (editor has no breadcrumb/status bar today)                                     | Add **breadcrumbs**, a **"Saved" status**, a **"+N today" word delta**, the **fullscreen button (moved here)**, and the existing **theme switch**                                                                                                                   | New top-bar content; theme switch reused as-is                    |
| **Fullscreen button**    | `maximize: Maximize2Icon` (diagonal arrows), located elsewhere                  | **Moved into the top bar** + **new corner-frame icon**. The chosen icon maps to lucide **`Maximize`** (4 corner brackets) / `Fullscreen` / `Scan` — all exist in `lucide-react`. Add a new entry to the `icons` map in `icon.tsx` (e.g. `fullscreen: MaximizeIcon`) | One icon import + map entry                                       |
| **Comments icon**        | `comments: MessageSquareTextIcon`                                               | New comments glyph (rounded speech bubble). Swap the lucide import behind `comments` (e.g. `MessageCircleIcon` / `MessageSquareIcon`)                                                                                                                               | One icon swap                                                     |
| **Selected-text colour** | default                                                                         | Terracotta selection (`sel` token) + amber inline-highlight (`comment` token) for comment ranges                                                                                                                                                                    | Token + selection CSS                                             |
| **Editor prose**         | sans                                                                            | **Newsreader serif** body, drop cap, chapter eyebrow, accent rule                                                                                                                                                                                                   | Styling on existing Plate editor                                  |
| **Tokens**               | neutral-gray + blue `--brand` (`tailwind.css`)                                  | **Warm editorial**: cream paper / terracotta accent / sage "done"                                                                                                                                                                                                   | Token set (see Design Tokens)                                     |

**Two changes are NOT cosmetic** — flag these to whoever implements:

1. **3-level hierarchy** (Parts > Chapters > Sections) vs. today's 2-level (Folders > Documents) — needs an extra nesting level in the folder/document schema + API.
2. **"+N today" word delta** — needs daily word-count tracking (a small new piece of state/logic; the "Saved" indicator can reuse the existing save/`cloud` state).

**Already in the codebase — reuse, don't rebuild:**

- **Theme switch** (sun · `Switch` · moon): `@web/shared/components/theme-toggle.tsx` + `themeAtom`.
- **Drag handle on hover**: `tree-item.tsx` already swaps to `gripVertical` on `group-hover`.
- **Row hover actions**: `SidebarMenuAction showOnHover` already used in `tree-item.tsx`.
- **"Edit Toolbar" dialog** (the "select editor tools" modal): already exists — `ToolbarCustomButton` w/ `Settings2Icon` → `handleEditToolbarDialog` at the end of `FloatingToolbar` in `plate-editor.tsx`. (The prototype is currently _missing_ this gear button — that's a follow-up task, not part of this pass.)

---

## About the Design Files

The files in this bundle are **design references created in HTML/React-via-Babel** — a
prototype showing intended look and behavior. **They are not production code to copy.** The
task is to **restyle/extend the existing Nudo codebase** using its established
patterns and libraries (React + Vite + TypeScript, Tailwind v4, shadcn/ui, Plate.js, the
`@ui` package). Most of the rail maps directly onto components that already exist — see
"Mapping to the codebase" below.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, and interaction states are final and
intentional. Recreate the UI faithfully using the codebase's existing primitives, swapping
the prototype's hard-coded hex values for design tokens (see "Design Tokens").

---

## Mapping to the codebase

The Leaf rail is essentially an enhanced version of the folder tree you already have. Build
on these existing files rather than starting fresh:

| Design element                                                | Existing code to extend                                                                                                                                                                                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sidebar footer: "+ New part" + **Log out / Trash / Help row** | `sidebar-footer-actions.tsx` (`AddNewButton` + the logout/trash/help `Button` row). **Keep this row — just relabel "New" → "New part".**                                                                                                               |
| Parts / Chapters / Sections tree, rows                        | `apps/web/src/features/folder/components/folder-tree.tsx`, `tree-item.tsx`, `folder-item.tsx`                                                                                                                                                          |
| Drag handle on hover (`gripVertical`)                         | **Already implemented** in `tree-item.tsx` (`group-hover/tree-icon` swaps the leading icon for `gripVertical`). The prototype shows it in the left gutter instead of swapping the icon — pick whichever you prefer; the existing swap pattern is fine. |
| Row hover actions (pen/trash → add `+`)                       | `SidebarMenuAction showOnHover` (already used in `tree-item.tsx`)                                                                                                                                                                                      |
| Status dropdown menu                                          | `packages/ui/src/components/ui/dropdown-menu.tsx`                                                                                                                                                                                                      |
| Sidebar primitives                                            | `packages/ui/src/components/ui/sidebar.tsx` (`SidebarMenuItem/Button/Action`)                                                                                                                                                                          |
| Prose editor + contextual toolbar                             | `packages/ui/src/components/main-editor/main-editor.tsx`, `editor/plate-editor.tsx`, `ui/floating-toolbar.tsx`                                                                                                                                         |
| Inline comment / margin marker                                | `ui/comment-node.tsx`, `editor/plugins/comment-kit.tsx`, `discussion-kit.tsx`                                                                                                                                                                          |
| Icons                                                         | `packages/ui/src/components/icon/icon.tsx`                                                                                                                                                                                                             |
| Theme switch (sun · Switch · moon)                            | **Already implemented** — `@web/shared/components/theme-toggle.tsx` + `themeAtom` (`@web/shared/state/theme.atom.ts`), mounted in the `TopBar` (`layouts/app-layout.tsx`). `Switch` is `@ui/components/ui/switch`. Reuse as-is.                        |

---

## Screens / Views

### View 1 — Outline rail (left, fixed `width: 304px`)

A vertical flex column on a tinted sidebar surface, right border 1px.

**Header block** (`padding: 26px 22px 18px`)

- Wordmark **"—nudo."** — Newsreader serif, ~21px, weight 600, `letter-spacing: -0.02em`,
  with a **leading em dash** and an accent-colored period. (The em dash is part of the mark —
  do not drop it.) A `settings` icon sits at the right, faint.
- Project title "Northwater" — Newsreader serif, 23px, weight 600.
- Sub-line "Novel · 84,210 words" — 12px, muted.

**Tree** (scroll area, `padding: 14px 12px 0`)

- **Part header row**: italic Newsreader label, 12.5px, muted. A `+` (add chapter) button
  sits at the right at rest opacity ~0.5, brightening to accent on hover. A 6-dot drag grip
  fades in on row hover in the left gutter.
- **Chapter row** (`padding: 7px 10px 7px 16px`, `border-radius: 7px`):
  - 2-digit number, tabular, 11px weight 600 (accent when active, faint otherwise).
  - Title, 13.5px, `letter-spacing: -0.01em` (ink + weight 600 when active, prose + 450 otherwise).
  - `+` add-section button (16px), rest opacity ~0.45 → accent on hover.
  - **Word count**, 10.5px tabular, faint, right-aligned (`min-width: 32px`).
  - **Status moon dot** (see Status system).
  - Active chapter: `accentSoft` background + a 2.5px accent bar on the left edge.
  - 6-dot drag grip fades in on hover in the left gutter (`left: 3px`).
- **Section rows** (nested under the open chapter, indented with a 1px left rule):
  - 4px bullet dot (accent when active), title 12.5px (ink active / muted otherwise),
    word count 10.5px faint.
  - Hover = same `accentSoft` background highlight as chapter rows (NOT a color change).
  - 6-dot drag grip fades in on hover (`left: 2px`).

**Footer** (`padding: 12px 22px`, top border): **"+ New part"**, 13px muted → accent on hover.

### View 2 — Editor (right, fills remaining width)

- **Breadcrumb header** (`height: 52px`, `padding: 0 30px`): "Northwater / Part I /
  **The Tidewatch**" (last crumb ink+500, separators faint). Right side: a "Saved" status
  (6px green dot `#7DA98C` + label), an accent "+612 today" word delta, a `focus` icon, a thin
  divider, and the **theme switch** (sun · Switch · moon). This header is the prototype's stand-in
  for the app's `TopBar`.
- **Prose column** (`max-width: 660px`, centered, `padding: 34px 30px 0`):
  - Eyebrow "CHAPTER THREE" — 11px weight 700, `letter-spacing: 0.22em`, uppercase, accent.
  - Title "The Tidewatch" — Newsreader serif, 44px, weight 500, `line-height: 1.08`.
  - 38×2px accent rule under the title (opacity 0.6).
  - Body — Newsreader serif, 20px, `line-height: 1.72`, prose color. First paragraph has a
    **drop cap** (62px, `line-height: 0.84`, floated left).
  - **Selection highlight** with a 1px accent ring, and a **contextual floating toolbar**
    above the selection (rounded pill, soft shadow, downward arrow): bold / italic / underline,
    divider, type / highlighter (active), divider, comment.
  - An **inline highlight** (amber comment swatch with a bottom rule) on a phrase.
  - A **margin comment marker** in the right gutter: a teardrop-rounded amber chip holding a
    reviewer avatar ("J").

---

## Interactions & Behavior

- **Status dot → menu**: clicking a chapter's moon dot opens a labeled dropdown of the three
  states (Planned / Drafting / Done), each with its moon icon; the current one is checked.
  Selecting updates the chapter and closes the menu. Click-away (a full-bleed backdrop) closes it.
  Closed, only the moon icon shows.
- **Drag handles**: a 6-dot grip reveals on hover for **Parts, Chapters, and Sections** —
  all three levels are intended to be drag-reorderable (within their level / into siblings).
  Reorder logic is not implemented in the prototype.
- **Add actions**: `+ New part` (footer) → adds a Part; `+` on a Part header → adds a Chapter;
  `+` on a Chapter row → adds a Section. (Affordances only in the prototype; wire to mutations.)
- **Contextual formatting**: no persistent toolbar — the floating toolbar appears on text
  selection (Plate's floating toolbar already exists in `@ui`).
- **Hover states**: rows get an `accentSoft` background; `+` and grip brighten to accent.
- **Theme switch**: a sun · `Switch` · moon control in the editor top bar flips light/dark.
  In the codebase this **already exists** — `ThemeToggle` (`@web/shared/components/theme-toggle.tsx`),
  backed by `themeAtom` (`'system' | 'light' | 'dark'`) and rendered in the `TopBar` via
  `app-layout.tsx`. Reuse it as-is; just ensure the top bar is present in this editor view. The
  prototype's toggle is binary (light/dark) for demo; keep the app's three-way (incl. `system`).
  Full light + dark parity throughout.

## State Management

Reuse the existing feature stores; the design implies:

- **Outline tree**: parts → chapters → sections (existing `folder` feature + `document.store`).
  Each chapter carries `status: 'planned' | 'drafting' | 'done'` and a derived `wordCount`.
- **Active selection**: which chapter/section is open (drives the active styling + breadcrumb
  - editor content). See `document.store.ts` / `sidebar` hooks.
- **Status menu**: ephemeral `openStatusFor: chapterId | null`.
- **Save status + daily delta**: "Saved" indicator and "+N today" come from the
  document/save layer.

---

## Design Tokens

### Status system (three states)

Collapsed from an earlier four-state idea. Drawn as a **moon-phase dot** (9px):

- **Planned** — empty ring (1.5px border, `dotEmpty`).
- **Drafting** — half-filled (left half `done` color via a 90° linear-gradient, `done` border).
- **Done** — solid `done` fill.

### Colors — Light

| Token      | Value                      | Use                        |
| ---------- | -------------------------- | -------------------------- |
| bg         | `#F7F3EC`                  | editor surface             |
| side       | `#F1EADD`                  | rail surface               |
| sideEdge   | `#E6DCCB`                  | rail border / nested rules |
| ink        | `#2A251F`                  | primary text               |
| prose      | `#3D372E`                  | body prose                 |
| muted      | `#9A9286`                  | secondary text             |
| faint      | `#B8AF9F`                  | tertiary / numbers         |
| accent     | `#B0573C`                  | terracotta accent          |
| accentSoft | `rgba(176,87,60,0.12)`     | hover / active fill        |
| sel        | `rgba(176,87,60,0.15)`     | text selection             |
| comment    | `#F2D58A` / edge `#D9B65A` | highlight + margin marker  |
| done       | `#6F9C82`                  | status "Done" / saved dot  |
| dotEmpty   | `#C7BCA8`                  | empty status ring          |
| pill       | `#FFFCF6` / edge `#E8DECC` | floating toolbar / menus   |

### Colors — Dark

| Token   | Value                                                                          |
| ------- | ------------------------------------------------------------------------------ |
| bg      | `#221D17` · side `#1A1610` · sideEdge `#322B22`                                |
| ink     | `#EFE6D6` · prose `#DCD2C1` · muted `#8E867A` · faint `#6E665B`                |
| accent  | `#D89164` · accentSoft `rgba(216,145,100,0.16)` · sel `rgba(216,145,100,0.20)` |
| comment | `rgba(242,213,138,0.26)` / edge `rgba(217,182,90,0.6)`                         |
| done    | `#7FAE91` · dotEmpty `#5A5246`                                                 |
| pill    | `#2C261E` / edge `#403729`                                                     |

> **Token note:** the repo's current `packages/ui/src/tailwind.css` ships a neutral-gray
> palette with a blue `--brand`. The Leaf direction is a **warm editorial** palette
> (cream paper, terracotta accent, sage "done"). To adopt Leaf, add these as semantic tokens
> (e.g. extend `--sidebar`, `--sidebar-accent`, `--accent`, `--highlight`, and add a
> `--status-done`/`--status-empty`) rather than hard-coding hex. The warm token set also
> exists in the project's `Nudo Design System.html` reference for cross-checking.

### Typography

- **UI / sans**: `Hanken Grotesk` (rail, chrome, toolbars). Weights 400/450/500/600/700.
- **Serif**: `Newsreader` (wordmark, project + chapter titles, all prose, part labels italic).
  Already wired as `--font-serif` in `tailwind.css`.
- Numerals use `font-variant-numeric: tabular-nums`.

### Radius / shadow / spacing

- Row radius 7px (chapters), 6px (sections), 5–6px (buttons/menu items), pill/menu 10px.
- Rail width **304px**; prose column max-width **660px**; header height **52px**.
- Floating toolbar shadow (light): `0 12px 34px -16px rgba(60,45,30,0.45)`.
- Menu/marker shadow (dark): `0 16px 40px -18px rgba(0,0,0,0.7)`.

## Assets

- No raster assets. The wordmark and all icons are drawn in code.
- Icons are a small lucide-flavored stroke set (`shared.jsx` → `ICON_PATHS`); the repo already
  has `@ui` `Icon` with `gripVertical`, `pen`, `trash`, `fileText`, etc. Map prototype icon
  names (`plus`, `settings`, `bold`, `italic`, `underline`, `type`, `highlighter`, `message`,
  `focus`, `check`) to the existing `Icon` set.
- Sample manuscript text ("Northwater") is original placeholder copy — replace with real data.

## Files in this bundle

- `nudo-editor.html` — open in a browser to see the live prototype. The theme switch is in the
  editor top bar (top-right); it defaults to your OS setting and remembers your choice.
- `leaf.jsx` — the Leaf direction component: `DirectionLeaf`, `LeafChapterRow`,
  `LeafStatusControl`, `LeafStatusDot`, `LeafGrip`, `LeafThemeSwitch`, plus the `LEAF_THEMES` token tables.
- `shared.jsx` — shared helpers: `Icon` + `ICON_PATHS`, `Wordmark`, `Avatar`, and the sample
  `NOVEL` / `SCENES` / `PROSE` data.

> These three files render together (load order: React/Babel → `shared.jsx` → `leaf.jsx` →
> the inline app script in the HTML). The components export themselves to `window`.

## How to use with Claude Code

1. Drop this folder into your repo (or keep it alongside).
2. From the repo root, point Claude Code at it, e.g.:
   _"Implement the design in `docs/design-handoffs/leaf-editor/` — recreate the Leaf outline rail by
   extending `features/folder/tree-item.tsx` and `features/sidebar/app-sidebar.tsx`, add the
   moon-phase status control using `@ui/dropdown-menu`, and add the warm editorial tokens to
   `packages/ui/src/tailwind.css`. Follow the README's token tables and mapping."_
3. Have it work view-by-view (rail first, then the editor surface), using the existing
   primitives and tokens rather than the prototype's inline styles.
