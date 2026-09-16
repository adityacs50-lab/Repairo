"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Wrench } from "lucide-react";
import { ChatMessages, type ChatMessage } from "@/components/ui/chat-messages";
import { MarkdownMessage } from "@/components/ui/markdown-message";

/** Matches the site's shared easing curve (see components/Motion.tsx). */
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Otto — the floating Repairo assistant.
 *
 * This component owns the launcher, the open/close state and the /api/chat
 * transport. The conversation surface is @/components/ui/chat-messages and
 * assistant text is rendered by @/components/ui/markdown-message. Answers come
 * from Sarvam via that route (see src/lib/otto/*).
 */

const SUGGESTIONS = [
  "What does Repairo fix?",
  "How is this different from Dependabot?",
  "What happens to our code?",
  "How do I get started?",
];

/**
 * Two blocks, not one sentence: the heading renders through MarkdownMessage as
 * a compact ink-coloured lead-in and the follow-up as body copy, so the welcome
 * reads as an introduction plus an invitation rather than one run-on line.
 */
const GREETING = [
  "### Need help with a repair?",
  "Ask me about the API change, affected files, security, pricing, or how to run the CLI.",
].join("\n\n");

const INK = "var(--repairo-ink)";
const WHITE = "var(--repairo-white)";
const RULE = "var(--repairo-rule)";

let messageSeq = 0;
const nextId = (prefix: string) => `${prefix}-${++messageSeq}`;

const greetingMessage = (): ChatMessage => ({
  id: nextId("assistant"),
  sender: "assistant",
  content: GREETING,
});

const renderAssistant = (content: string) => <MarkdownMessage content={content} />;

export default function RepairoChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Cmd+/ or Ctrl+/ toggles; Escape closes.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen && messages.length > 1 && messages[messages.length - 1].sender === "assistant") {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewMessage(false);
    setMessages((prev) => (prev.length === 0 ? [greetingMessage()] : prev));
  };

  const handleReset = useCallback(() => {
    setMessages([greetingMessage()]);
    setIsTyping(false);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const userMessage: ChatMessage = { id: nextId("user"), sender: "user", content: text };
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      try {
        // The API takes role/content pairs; the greeting is local scaffolding, not context.
        const history = [...messages, userMessage]
          .slice(1)
          .map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.content }));

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.error) {
          throw new Error(data.error || `Request failed (${response.status}).`);
        }

        setMessages((prev) => [...prev, { id: nextId("assistant"), sender: "assistant", content: data.message }]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId("assistant"),
            sender: "assistant",
            content: `Sorry — something went wrong: ${
              error instanceof Error ? error.message : "unknown error"
            }`,
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [messages],
  );

  return (
    <div className="otto-launcher-root font-sans sm:right-6 sm:bottom-6">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="launcher"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={handleOpen}
            aria-label="Open the Otto assistant"
            className="flex cursor-pointer items-center gap-2.5 rounded-full py-2 pr-4 pl-2"
            style={{
              background: WHITE,
              border: `1px solid ${RULE}`,
              boxShadow: "0 12px 32px -10px rgba(11, 18, 32, 0.35)",
            }}
          >
            <span
              className="relative flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg, var(--repairo-purple), var(--repairo-ink))" }}
            >
              <Wrench className="size-4 text-white" />
              {hasNewMessage && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
                  style={{ background: "var(--repairo-amber)", borderColor: WHITE }}
                />
              )}
            </span>
            <span style={{ color: INK, fontSize: 13, fontWeight: 500 }}>Ask Otto</span>
            <span
              className="font-mono uppercase"
              style={{ color: "var(--repairo-muted)", fontSize: 10, letterSpacing: "0.08em" }}
            >
              Ctrl /
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: EASE }}
            style={{ transformOrigin: "bottom right" }}
          >
            <ChatMessages
              // Height is capped, not fixed: the panel grows with the
              // conversation and starts scrolling at the cap, instead of
              // opening as a tall box with one message stranded at the top.
              className="max-h-[min(620px,calc(100dvh-6rem))] w-[min(408px,calc(100vw-2rem))]"
              messages={messages}
              isTyping={isTyping}
              suggestions={SUGGESTIONS}
              showSuggestions={messages.length === 1}
              onSend={handleSend}
              onReset={messages.length > 1 ? handleReset : undefined}
              onClose={() => setIsOpen(false)}
              renderAssistant={renderAssistant}
              placeholder="What are you trying to fix?"
              title="Ask Otto"
              subtitle="API changes & repairs"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
