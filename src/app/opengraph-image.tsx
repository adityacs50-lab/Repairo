import { ImageResponse } from "next/og";
import { REPAIRO_DESIGN } from "@/lib/design-tokens";
import { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from "@/lib/seo";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: REPAIRO_DESIGN.paper,
          color: REPAIRO_DESIGN.ink,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 4,
              background: REPAIRO_DESIGN.contrast,
              color: REPAIRO_DESIGN.contrastFg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            R
          </div>
          <span style={{ fontWeight: 600 }}>{SITE_NAME}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            Your API changed. Know what to repair.
          </div>
          <div style={{ fontSize: 28, color: REPAIRO_DESIGN.muted, maxWidth: 980, lineHeight: 1.35 }}>
            {SITE_DESCRIPTION}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: REPAIRO_DESIGN.muted,
          }}
        >
          <span>{SITE_TAGLINE}</span>
          <span style={{ fontFamily: "monospace" }}>npx repairo-cli repair --dry-run</span>
        </div>
      </div>
    ),
    size,
  );
}
