# Repairo — DESIGN.md

**Canonical reference:** [Warp](https://www.warp.dev/) — light dot-grid, column hairlines, black CTAs. Applied **site-wide** via `site-shell marketing-warp` on the root layout wrapper (`src/app/layout.tsx`). Reference analysis: [docs/design-references/warp-DESIGN.md](./docs/design-references/warp-DESIGN.md).

**For coding agents:** Read this before changing **any** user-facing UI.

| Area | Primary files |
| --- | --- |
| Warp spec (source) | `docs/design-references/warp-DESIGN.md` |
| Tokens & global styles | `src/app/globals.css`, `src/lib/design-tokens.ts` |
| Marketing | `HomePage.tsx`, `MarketingHeader.tsx`, `ContentPage.tsx` |
| Product | `DemoWorkspace.tsx`, `AppWorkspace.tsx`, `MigrationResults.tsx` |

---

## 1. Visual theme (from Warp)

- **Mood:** One warm dark band across the page (`#2b2622`), like [warp.dev](https://www.warp.dev/) — developer reading mode, not a gradient hero.
- **Decoration:** Terminal / `factory.yaml`-style blocks, real CLI strings, hairline borders. No blob meshes or stock AI art.
- **Accent:** Warp uses **no chromatic brand color** — off-white on warm dark *is* the brand. Repairo adds **teal** only for verify/pass and **muted amber** only for breaking/warn in product surfaces (diffs, severity chips).

## 2. Color palette

| Warp token | CSS variable | Hex | Use |
| --- | --- | --- | --- |
| `colors.canvas` | `--repairo-paper` | `#2b2622` | Page background |
| `colors.canvas-soft` | `--repairo-white` | `#383330` | Cards, panels, mockup chrome |
| `colors.ink` / `colors.primary` | `--repairo-ink` | `#f7f5f0` | Headlines, body, primary CTA fill |
| `colors.on-primary` | `--repairo-contrast-fg` | `#2b2622` | Text on primary buttons |
| `colors.body` | `--repairo-muted` | `#c9c0ad` | Secondary copy |
| `colors.body-strong` | `--repairo-slate` | `#dad2c1` | Emphasis, eyebrows, link hover |
| `colors.mute` | `--repairo-mute` | `#aea69c` | Fine print |
| `colors.hairline` | `--repairo-rule` | `#3f3a36` | 1px dividers |
| — | `--repairo-contrast` | `#f7f5f0` | Alias for primary button fill |
| — | `--repairo-media-frame` | `#2f2a26` | Terminal body inset |
| Product | `--repairo-teal` | `#3dd6b5` | `tsc` / verified only |
| Product | `--repairo-warn` | `#c9a227` | Breaking API severity only |

Legacy `--repairo-accent` maps to `--repairo-slate` (emphasis, not yellow).

## 3. Typography (Warp)

| Role | Family | Notes |
| --- | --- | --- |
| Wordmark | **Pixelify Sans** | “Repairo” only |
| UI / marketing | **Inter** (`--font-inter` → `--font-sans`) | H1 **400** at hero scale, negative tracking |
| Code / labels | **DM Mono** | Tabs, CLI, mockups, `>_`-style captions |
| Optional editorial | Instrument Serif | Rare italic moments — not required yet |

Hero: `clamp(2.35rem, 5.2vw, 3.75rem)`, weight **400**, letter-spacing ~`-0.04em`.

## 4. Components (Warp primitives)

### Buttons (`button-primary` in warp-DESIGN)
- Fill `--repairo-contrast`, text `--repairo-contrast-fg`, radius **3px** (`rounded.sm`).
- Hover: slightly dimmed off-white (`color-mix` toward canvas), **not** a yellow flash.

### Cards (`card-content` / `card-mockup`)
- `background: var(--repairo-white)`, `border: 1px solid var(--repairo-rule)`, radius **4px**.
- No drop shadows on marketing cards.

### Nav (`nav-bar`)
- Flat `--repairo-paper` background, hairline bottom border — no glass blur.

### Terminal blocks
- Outer: canvas-soft; inner mono at 13px; copy real commands (`npx repairo-cli scan`, etc.).

### Product-only
- `MigrationResults`: root `repairo-results`, `theme="light"` on `site-shell` routes.
- Otto: same tokens; compact markdown.

## 5. Layout

- Max width `--page-max-width: 1440px` (Repairo); Warp marketing ~1200px — we keep 1440 for dense product tables.
- Section rhythm `--section-padding-y`; mobile hero stacks ≤1024px.

## 6. Depth

- Hairlines + surface contrast only (Warp level 0–2). Shadow only on floating Otto launcher.

## 7. Do / don’t

| Do | Don’t |
| --- | --- |
| Warm canvas `#2b2622`, off-white CTAs | Pure black `#000` or neutral gray chrome |
| Inter 400 heroes, DM Mono for CLI | Heavy 700 billboard headlines |
| 3–4px button radius | Pill CTAs |
| Teal / warn only in product evidence | Rainbow marketing accents |

## 8. Agent prompt

```
Follow DESIGN.md + docs/design-references/warp-DESIGN.md.
Canvas #2b2622, surface #383330, ink #f7f5f0, hairline #3f3a36.
Inter + DM Mono; Pixelify wordmark only.
No page gradients; terminal mockups for proof.
Repairo: teal = pass, warn = breaking only.
```

---

*Inspired by [Warp](https://www.warp.dev/); not an official Warp brand guide. Community warp analysis: MIT via [awesome-design-md](https://github.com/VoltAgent/awesome-design-md).*
