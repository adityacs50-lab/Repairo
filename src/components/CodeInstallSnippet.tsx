"use client";

import { useState } from "react";

const INSTALL_CODE = `# Quick scan via npx (no installation required)
npx @repairo/cli scan ./src --vendors stripe,openai,supabase

# Or install globally for automated CI/CD workflows
npm install -g @repairo/cli

# Initialize repository AST config
repairo init --repo owner/your-app

# Preview AST refactoring diff for breaking OpenAPI spec changes
repairo diff --spec https://api.stripe.com/v1/openapi.json

# Apply AST patches & open reviewable GitHub PR
repairo repair --create-pr`;

export function CodeInstallSnippet() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(INSTALL_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full">
      <div className="relative rounded-sm bg-canvas-card border border-hairline p-[24px]">
        <button
          onClick={handleCopy}
          className="absolute top-[16px] right-[16px] flex items-center justify-center rounded-full bg-transparent border border-hairline px-[12px] py-[4px] text-[12px] text-ink hover:border-body-mid transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        
        <pre className="font-mono text-[13px] leading-[1.6] text-ink overflow-x-auto whitespace-pre-wrap mt-[8px]">
          <code>
            <span className="text-mute"># 1. Quick scan via npx (no installation required)</span><br />
            npx @repairo/cli scan ./src --vendors stripe,openai,supabase<br /><br />

            <span className="text-mute"># 2. Or install globally for automated CI/CD workflows</span><br />
            npm install -g @repairo/cli<br />
            repairo init --repo owner/your-app<br /><br />

            <span className="text-mute"># 3. Preview AST refactoring diff for breaking OpenAPI spec changes</span><br />
            repairo diff --spec https://api.stripe.com/v1/openapi.json<br /><br />

            <span className="text-mute"># 4. Apply AST patches &amp; open reviewable GitHub PR</span><br />
            repairo repair --create-pr
          </code>
        </pre>
      </div>
    </div>
  );
}

