"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Markdown renderer for Otto's replies.
 *
 * Presentation lives in the `.otto-md` block in globals.css, not here. That is
 * deliberate: the site's global reset and its unlayered h1–h3 rules outrank
 * Tailwind utilities, so the prose styling has to be unlayered CSS to win —
 * and doing it there buys `:first-child` / `:last-child` margin trimming and
 * `::marker` colours that inline styles cannot express.
 *
 * Only the three things CSS cannot do are handled below.
 */
export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="otto-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Links open away from the page the widget is floating over.
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),

          // A table needs its own scroll container so a wide one cannot widen
          // the bubble; `overflow-x` on the table itself would not apply.
          table: ({ children }) => (
            <div className="otto-md-scroll">
              <table>{children}</table>
            </div>
          ),

          img: () => null,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownMessage;
