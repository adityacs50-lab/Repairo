# Repairo — DESIGN.md

**For coding agents:** Read this before changing marketing UI (`src/components/HomePage.tsx`, `src/app/globals.css`, `/demo`, `/app`). Match the product voice: CLI-first API repair, not generic AI SaaS.

**Sources (curated from [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)):**

| Priority | File | Why |
| --- | --- | --- |
| **Primary** | [docs/design-references/warp-DESIGN.md](./docs/design-references/warp-DESIGN.md) | Warm charcoal canvas, terminal mockups, quiet Inter-scale type — fits `repairo-cli` |
| **Accent rules** | [docs/design-references/clickhouse-DESIGN.md](./docs/design-references/clickhouse-DESIGN.md) | Use **one** high-voltage accent (amber) sparingly on black — good for “repair / warning / CTA” |

Full upstream catalog: [awesome-design-md](https://github.com/VoltAgent/awesome-design-md).

---

## 1. Visual theme & atmosphere

- **Mood:** Workshop terminal at 11pm — warm dark, not purple startup gradient.
- **Density:** Marketing pages breathe; product surfaces (`/demo`, `/app`) are denser, table/code forward.
- **Decoration:** Terminal output, diffs, and real CLI strings — **no** blob gradients, no stock “AI sparkle”.
- **Copy tone:** Short, specific, engineer-to-engineer (see homepage). No “leverage”, “unlock”, “journey”, or triple-adjective headlines.

## 2. Color palette & roles

Map to CSS variables in `src/app/globals.css`.

| Role | Token | Hex | Use |
| --- | --- | --- | --- |
| Canvas | `--repairo-paper` | `#100f0d` | Page background (Warp-warm black) |
| Surface | `--repairo-white` | `#1a1916` | Cards, panels, tabs |
| Foreground | `--repairo-ink` | `#eeede6` | Headlines, body |
| Muted | `--repairo-muted` | `#9a9488` | Secondary text, labels |
| Border | `--repairo-rule` | `#2e2b26` | 1px dividers |
| **Repair accent** | `--repairo-accent` | `#e8a317` | Eyebrows, links hover, one CTA emphasis (ClickHouse-style **sparse** yellow) |
| Safe / verify | `--repairo-teal` | `#3dd6b5` | `tsc` pass, verified badges only |
| Code slab | `--repairo-media-frame` | `#0a0908` | Hero terminal, `docs-code`, OG-style blocks |
| CTA fill | `--repairo-contrast` | `#f5f2ea` | Primary buttons (dark text on light chip) |

**Do not** reintroduce full-page purple gradients or neon violet CTAs.

## 3. Typography

| Role | Family | Notes |
| --- | --- | --- |
| Wordmark | **Pixelify Sans** | “Repairo” only |
| UI / marketing | **Figtree** (`--font-figtree`) | Body and headings; weight **500** on H1–H2, not 400 billboard |
| Labels / CLI | **System mono** (`--font-mono`) | Eyebrows, tabs, `demo-row`, code — uppercase optional, not every section |
| Scale | Warp-inspired | Hero `clamp(2.35rem, 5.2vw, 3.75rem)`; section titles ~`2.5rem` max |

**Hierarchy:** One idea per H2. Lead paragraph ≤ 2 sentences.

## 4. Components

### Buttons
- **Primary:** `--repairo-contrast` fill, `--repairo-contrast-fg` text, 2px radius (not pills).
- **Hover:** `--repairo-accent` fill, dark text.
- **Ghost:** surface border `--repairo-rule`, no shadow stack.

### Tabs (homepage + workspace)
- Inactive: surface bg, muted text.
- Active: contrast fill (light chip on dark), **not** inverted ink/white mistake.

### Cards
- Border `1px solid var(--repairo-rule)`, bg `var(--repairo-white)`.
- No glassmorphism; optional 1px top highlight only on featured pricing tier.

### Terminal / proof blocks
- Background `--repairo-media-frame`, text `#e4e4e7`, mono.
- Show **real** commands: `npx repairo-cli scan`, `repair --dry-run`.

### Otto chat widget
- Same tokens as site; compact markdown; no purple bubble UI.

## 5. Layout

- Max width `--page-max-width: 1440px`; padding `--page-padding` 16→32px.
- Section rhythm `--section-padding-y`.
- Mobile: single column ≤1024px hero; hamburger nav on homepage (`MarketingHeader`).

## 6. Depth & elevation

- Prefer **borders** over shadows.
- Shadows only on floating Otto launcher: `rgba(0,0,0,0.55)` soft.

## 7. Do / don’t

| Do | Don’t |
| --- | --- |
| Show CLI output and OpenAPI diff evidence | Fake metrics, fake testimonials |
| Amber accent on one primary action per viewport | Rainbow accents + gradient mesh |
| Sentence-case eyebrows (“How it works”) | `HOW IT WORKS / TRUST BOUNDARY` spam |
| Link to `/demo`, npm, GitHub | “Book a strategy call” fluff |
| Keep `/demo` and `/app` visually aligned with tokens | One-off hex in components |

## 8. Responsive

- Touch targets ≥44px on tabs and header menu.
- Horizontal scroll only for tab strips and logo strip.
- Otto: full-screen panel on phones (`otto-panel-open`).

## 9. Agent prompt guide

When asked to restyle Repairo:

```
Use DESIGN.md + src/app/globals.css tokens.
Base layout on Warp (warm dark #100f0d, minimal chrome).
Use amber #e8a317 only for accent/CTA hover, teal only for pass states.
Fonts: Figtree + Pixelify wordmark + mono for code.
Copy: short, human, no AI marketing clichés.
Hero must show repairo-cli terminal output.
```

**Preview upstream:** open `docs/design-references/warp-DESIGN.md` and optional `preview-dark.html` in the same folder if you add it from the vendor repo.

---

*Repairo-specific DESIGN.md — forked from community [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (MIT). Warp & ClickHouse analyses are inspired interpretations of public sites, not official brand guidelines.*
