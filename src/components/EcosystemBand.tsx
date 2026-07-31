export function EcosystemBand() {
  return (
    <section className="w-full bg-[#f4f4f6] text-[#0a0a0a] py-8 border-y border-neutral-300 relative z-10 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500 mb-6">
          AUTOMATED REPAIR ENGINES POWERING THE WORLD'S LEADING APIS
        </p>

        <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-90">
          
          {/* OpenAI */}
          <div className="flex items-center gap-2.5 hover:opacity-100 transition-opacity">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9 6.0651 6.0651 0 0 0-4.981-2.01 6.0094 6.0094 0 0 0-5.724 4.0217 6.0094 6.0094 0 0 0-3.994 2.915 6.0504 6.0504 0 0 0 .7427 7.0466 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.596 24a6.056 6.056 0 0 0 5.7578-4.02 6.0094 6.0094 0 0 0 3.9933-2.915 6.0462 6.0462 0 0 0-.7427-7.0466zM13.596 22.4764a4.466 4.466 0 0 1-2.8774-1.0406l.1423-.0819 4.7738-2.7562a.7797.7797 0 0 0 .3927-.6761v-6.735l2.0232 1.168a.071.071 0 0 1 .038.052v5.5833a4.504 4.504 0 0 1-4.4926 4.4865z"/>
            </svg>
            <span className="font-bold text-xl tracking-tighter font-sans uppercase">OpenAI</span>
          </div>

          {/* Google Gemini */}
          <div className="flex items-center gap-2 hover:opacity-100 transition-opacity">
            <svg className="w-6 h-6 fill-current text-blue-600" viewBox="0 0 24 24">
              <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z"/>
            </svg>
            <span className="font-extrabold text-xl tracking-tight font-sans">Gemini</span>
          </div>

          {/* Anthropic */}
          <div className="flex items-center gap-2 hover:opacity-100 transition-opacity">
            <span className="font-black text-xl tracking-[0.15em] font-mono">ANTHROPIC</span>
          </div>

          {/* Stripe */}
          <div className="flex items-center gap-1 hover:opacity-100 transition-opacity">
            <span className="font-extrabold text-2xl tracking-tighter lowercase font-serif italic text-indigo-700">stripe</span>
          </div>

          {/* Razorpay */}
          <div className="flex items-center gap-1.5 hover:opacity-100 transition-opacity">
            <svg className="w-5 h-5 fill-current text-blue-700" viewBox="0 0 24 24">
              <path d="M22.436 0l-11.91 10.141 5.019 13.859 6.891-24zM1.564 24l11.91-10.141-5.019-13.859-6.891 24z"/>
            </svg>
            <span className="font-black text-xl tracking-tight font-sans">Razorpay</span>
          </div>

          {/* Supabase */}
          <div className="flex items-center gap-2 hover:opacity-100 transition-opacity">
            <svg className="w-5 h-5 fill-current text-emerald-600" viewBox="0 0 24 24">
              <path d="M13.359 1.954a1.086 1.086 0 0 0-1.748.272L6.155 13.89a.543.543 0 0 0 .49.774h6.05l-1.054 7.382a1.086 1.086 0 0 0 1.748-.272l5.456-11.664a.543.543 0 0 0-.49-.774h-6.05l1.054-7.382z"/>
            </svg>
            <span className="font-bold text-xl tracking-tight font-sans">supabase</span>
          </div>

          {/* GitHub */}
          <div className="flex items-center gap-2 hover:opacity-100 transition-opacity">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span className="font-bold text-xl tracking-tight font-sans">GitHub</span>
          </div>

        </div>
      </div>
    </section>
  );
}



