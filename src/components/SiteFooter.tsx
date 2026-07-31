import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="w-full bg-canvas py-[64px] border-t border-hairline">
      <div className="mx-auto max-w-[1200px] px-6">
        
        {/* TOP ROW */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-[14px] text-body mb-[64px]">
          <div className="flex flex-col gap-3">
            <div className="font-mono text-[12px] uppercase tracking-[1.2px] text-ink mb-2">Product</div>
            <Link href="/#features" className="hover:text-ink transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-ink transition-colors">Pricing</Link>
          </div>
          <div className="flex flex-col gap-3">
            <div className="font-mono text-[12px] uppercase tracking-[1.2px] text-ink mb-2">Resources</div>
            <Link href="/docs" className="hover:text-ink transition-colors">Documentation</Link>
            <Link href="/docs#integrations" className="hover:text-ink transition-colors">Integrations</Link>
            <Link href="/blog" className="hover:text-ink transition-colors">Blog</Link>
          </div>
          <div className="flex flex-col gap-3">
            <div className="font-mono text-[12px] uppercase tracking-[1.2px] text-ink mb-2">Community</div>
            <a href="https://github.com/" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">GitHub</a>
            <a href="https://twitter.com/" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">Twitter (X)</a>
            <a href="https://discord.com/" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">Discord</a>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between text-[14px] text-body-mid border-t border-hairline pt-8">
          <div>© {new Date().getFullYear()} Repairo, Inc.</div>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
