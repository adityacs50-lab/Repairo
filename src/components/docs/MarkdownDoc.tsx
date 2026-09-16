import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

function MarkdownLink({
  href,
  children,
}: {
  href?: string;
  children?: ReactNode;
}) {
  if (!href) return <span>{children}</span>;
  const isExternal = href.startsWith("http://") || href.startsWith("https://");
  if (isExternal) {
    return (
      <a href={href} className="text-link" rel="noreferrer" target="_blank">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className="text-link">
      {children}
    </Link>
  );
}

export function MarkdownDoc({ markdown }: { markdown: string }) {
  return (
    <div className="docs-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => <MarkdownLink href={href}>{children}</MarkdownLink>,
          h1: ({ children }) => <h2 className="docs-markdown-h2">{children}</h2>,
          h2: ({ children }) => <h3 className="docs-markdown-h3">{children}</h3>,
          h3: ({ children }) => <h4 className="docs-markdown-h4">{children}</h4>,
          pre: ({ children }) => <div className="docs-code docs-code--embedded">{children}</div>,
          code: ({ className, children }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return <code>{children}</code>;
            }
            return <code className="docs-inline-code">{children}</code>;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
