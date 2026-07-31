"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function TerminalDiffMockup() {
  const fullCommand = "repairo check --spec=stripe/v1";
  const [typedCommand, setTypedCommand] = useState("");
  const [typingComplete, setTypingComplete] = useState(false);

  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < fullCommand.length) {
        setTypedCommand(fullCommand.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => setTypingComplete(true), 500); // Short delay before output appears
      }
    }, 50); // Typing speed

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <div className="w-full bg-canvas-card/80 backdrop-blur-md border border-hairline rounded-sm p-[24px] shadow-2xl flex flex-col">
      <div className="flex items-center justify-between border-b border-hairline pb-[16px] mb-[16px]">
        <div className="font-mono text-[12px] uppercase tracking-[1.4px] text-mute">
          API Monitor Status
        </div>
        <div className="flex space-x-1.5">
          <div className="h-2 w-2 rounded-full bg-hairline" />
          <div className="h-2 w-2 rounded-full bg-hairline" />
          <div className="h-2 w-2 rounded-full bg-hairline" />
        </div>
      </div>

      <div className="flex flex-col gap-4 font-mono text-[14px] min-h-[220px]">
        {/* Command (Typing Effect) */}
        <div className="flex items-center gap-3">
          <span className="text-accent-sunset">❯</span>
          <span className="text-ink">
            {typedCommand}
            {!typingComplete && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-2 h-4 bg-ink ml-1 align-middle" />}
          </span>
        </div>

        {/* Output */}
        {typingComplete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="pl-5 flex flex-col gap-2 text-body"
          >
            <div className="text-body-mid">Fetching latest spec... [OK]</div>
            <div className="text-body-mid">Comparing against local snapshot...</div>
            
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
              className="mt-2 text-ink border-l-2 border-accent-sunset pl-3 py-1 bg-accent-sunset/5 rounded-r-sm"
            >
              <span className="text-accent-sunset font-bold">BREAKING CHANGE DETECTED</span>
              <br />
              Removed: <span className="line-through text-mute">Customer.address_line_1</span>
              <br />
              Added: <span className="text-ink">Customer.address.line1</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
            >
              <div className="mt-2 text-body-mid">Scanning repository for impact...</div>
              <div className="flex flex-col gap-1 mt-1">
                <div className="text-ink">
                  <span className="text-accent-breeze">src/payments.ts</span> (4 call sites)
                </div>
                <div className="text-ink">
                  <span className="text-accent-breeze">src/checkout.ts</span> (1 call site)
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="text-accent-dusk">▶</span>
                <span className="text-ink">Patch generated. PR #142 opened.</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
