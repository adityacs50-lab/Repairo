import type { ReactNode } from "react";

export function DocsCallout({
  children,
  variant = "info",
}: {
  children: ReactNode;
  variant?: "info" | "warn";
}) {
  return (
    <div className={`docs-callout docs-callout--${variant}`}>
      <p className="mono-label">{variant === "warn" ? "Note" : "Info"}</p>
      <div>{children}</div>
    </div>
  );
}
