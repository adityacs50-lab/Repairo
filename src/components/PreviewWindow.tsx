import type { ReactNode } from "react";

export type PreviewWindowProps = {
  figLabel?: string;
  path: string;
  status?: { label: string; live?: boolean };
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function PreviewWindow({
  figLabel,
  path,
  status,
  footer,
  children,
  className = "",
  bodyClassName = "",
}: PreviewWindowProps) {
  return (
    <div className={`preview-window ${className}`.trim()}>
      {figLabel ? <p className="warp-fig-label">{figLabel}</p> : null}
      <div className="preview-window-chrome">
        <div className="preview-window-titlebar">
          <span className="preview-window-dots" aria-hidden="true">
            <span className="preview-dot preview-dot--red" />
            <span className="preview-dot preview-dot--yellow" />
            <span className="preview-dot preview-dot--green" />
          </span>
          <span className="preview-window-path">{path}</span>
          {status ? (
            <span
              className={
                status.live ? "preview-window-status preview-window-status--live" : "preview-window-status"
              }
            >
              {status.live ? `• ${status.label}` : status.label}
            </span>
          ) : null}
        </div>
        <div className={`preview-window-body ${bodyClassName}`.trim()}>{children}</div>
        {footer ? <div className="preview-window-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
