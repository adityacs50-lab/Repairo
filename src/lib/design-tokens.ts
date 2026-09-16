/**
 * Warp-aligned tokens — keep in sync with docs/design-references/warp-DESIGN.md + DESIGN.md.
 * CSS components should prefer var(--repairo-*).
 */
export const REPAIRO_DESIGN = {
  /** warp `colors.canvas` */
  paper: "#2b2622",
  /** warp `colors.canvas-soft` */
  surface: "#383330",
  /** warp `colors.ink` / `colors.primary` */
  ink: "#f7f5f0",
  /** warp `colors.body` */
  muted: "#c9c0ad",
  /** warp `colors.body-strong` */
  bodyStrong: "#dad2c1",
  /** warp `colors.mute` */
  mute: "#aea69c",
  /** warp `colors.hairline` */
  rule: "#3f3a36",
  /** warp `colors.on-primary` */
  contrastFg: "#2b2622",
  /** Primary CTA fill (same as ink) */
  contrast: "#f7f5f0",
  /** Terminal / mockup inset — slightly deeper than canvas-soft */
  mediaFrame: "#2f2a26",
  terminalText: "#f7f5f0",
  /** Product-only: verified / tsc pass (not on Warp marketing) */
  teal: "#3dd6b5",
  /** Product-only: breaking / warn chips in demo & diffs */
  warn: "#c9a227",
  pageMaxWidth: 1440,
} as const;
