"use client";

import { useState } from "react";

export function DocsCodeSnippet({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="docs-code">
      {title ? <p className="docs-code-title">{title}</p> : null}
      <button onClick={handleCopy} type="button" className="docs-code-copy">
        {copied ? "Copied" : "Copy"}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
