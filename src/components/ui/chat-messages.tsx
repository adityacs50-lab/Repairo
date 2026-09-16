"use client";

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RotateCcw, Send, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Matches the site's shared easing curve (see components/Motion.tsx). */
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Chat surface — presentational only. It renders a conversation, a typing
 * state, suggestion chips and a composer; it owns no transport. The caller
 * supplies messages and handles `onSend` (see RepairoChatAssistant, which
 * wires it to /api/chat).
 *
 * Layout is four structurally separate regions in one column:
 *
 *   root (flex column, height capped by the caller's className)
 *   ├── header    — flex-none
 *   ├── scroller  — flex-1 min-h-0, the only scrolling element
 *   │   ├── message list
 *   │   └── suggestions
 *   └── composer  — flex-none, therefore always anchored to the bottom
 *
 * The root has no fixed height: the caller sets a max, so a short
 * conversation produces a short panel instead of a tall box of empty space,
 * and the scroller only starts scrolling once the cap is reached.
 *
 * Palette comes from the site tokens in globals.css (--repairo-*), so the
 * widget reads as part of Repairo rather than as a bolted-on chat library.
 */

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
}

export interface ChatMessagesProps {
  messages: ChatMessage[];
  /** Shows the animated typing bubble while a reply is in flight. */
  isTyping?: boolean;
  suggestions?: string[];
  /** Suggestions render only while this is true (typically: nothing asked yet). */
  showSuggestions?: boolean;
  onSend: (text: string) => void;
  onReset?: () => void;
  onClose?: () => void;
  /** Rich renderer for assistant text (markdown). Falls back to plain text. */
  renderAssistant?: (content: string) => ReactNode;
  placeholder?: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

const INK = "var(--repairo-ink)";
const PAPER = "var(--repairo-paper)";
const WHITE = "var(--repairo-white)";
const RULE = "var(--repairo-rule)";
const MUTED = "var(--repairo-muted)";
const SLATE = "var(--repairo-slate)";
const ACCENT = "var(--repairo-accent)";
const TEAL = "var(--repairo-teal)";

/**
 * IMPORTANT — why padding, margin and type are set inline here.
 *
 * globals.css opens with an UNLAYERED reset, `* { margin: 0; padding: 0 }`, and
 * styles h1–h3 unlayered too. Unlayered CSS beats Tailwind's layered utilities
 * no matter the specificity, so inside this app `px-4`, `py-3`, `mt-2` and
 * friends compute to ZERO. (That is what made this widget look cramped: every
 * spacing utility on it was silently dead.) Utilities that the reset does not
 * touch — flex, gap, width/height, rounding, borders, transitions — work fine
 * and are used normally below.
 *
 * So: all padding and margin are inline styles, which no unlayered rule can
 * beat. The two exceptions are deliberate and live in the unlayered Otto block
 * in globals.css, because inline styles cannot express them: `.otto-md` (the
 * assistant's markdown prose, which needs :first-child/::marker) and
 * `.otto-suggestions` (a responsive indent, which needs a media query).
 */
const BUBBLE_TEXT = { fontSize: 14, lineHeight: 1.55 } as const;

/**
 * Avatar column width. Grouped rows reserve it as a spacer and
 * `.otto-suggestions` indents by AVATAR + the 8px row gap, so every
 * assistant-side element sits on the same left edge.
 */
const AVATAR = 24;

function Avatar({ size = 32, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: "var(--repairo-contrast)",
        color: "var(--repairo-contrast-fg)",
        ...style,
      }}
      aria-hidden
    >
      <Wrench style={{ width: size * 0.45, height: size * 0.45 }} />
    </div>
  );
}

/** Header/composer icon button — 36px hit area, tokenised hover. */
function IconButton({
  onClick,
  label,
  title,
  children,
}: {
  onClick: () => void;
  label: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-lg transition-colors"
      style={{ color: MUTED }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = PAPER;
        e.currentTarget.style.color = INK;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = MUTED;
      }}
    >
      {children}
    </button>
  );
}

function TypingIndicator() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex items-start gap-2"
    >
      <Avatar size={AVATAR} style={{ marginTop: 2 }} />
      <div
        className="inline-flex items-center gap-1 rounded-2xl rounded-tl-md border"
        style={{ background: WHITE, borderColor: RULE, padding: "12px 16px" }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: MUTED }}
            animate={reduce ? { opacity: 0.6 } : { opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
            transition={
              reduce ? undefined : { duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }
            }
          />
        ))}
      </div>
    </motion.div>
  );
}

function MessageBubble({
  message,
  grouped,
  renderAssistant,
}: {
  message: ChatMessage;
  /** True when the previous message had the same sender — tightens the gap. */
  grouped: boolean;
  renderAssistant?: (content: string) => ReactNode;
}) {
  const reduce = useReducedMotion();
  const isUser = message.sender === "user";

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: EASE }}
      className={cn("flex w-full gap-2", isUser && "justify-end")}
      // The list gap is 16px; consecutive messages from one sender close to 8px.
      style={grouped ? { marginTop: -8 } : undefined}
    >
      {!isUser &&
        (grouped ? (
          <span className="flex-none" style={{ width: AVATAR }} aria-hidden />
        ) : (
          <Avatar size={AVATAR} style={{ marginTop: 2 }} />
        ))}

      <div
        className={cn(
          "min-w-0 rounded-2xl",
          isUser ? "max-w-[85%] rounded-tr-md" : "max-w-full border rounded-tl-md",
        )}
        style={
          isUser
            ? {
                ...BUBBLE_TEXT,
                padding: "12px 16px",
                background: ACCENT,
                color: WHITE,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                boxShadow: "0 2px 8px -4px rgba(108, 92, 231, 0.55)",
              }
            : {
                // Assistant prose sizing comes from `.otto-md`; these values are
                // the fallback for a caller that passes no markdown renderer.
                ...BUBBLE_TEXT,
                padding: "12px 16px",
                background: WHITE,
                borderColor: RULE,
                color: SLATE,
                overflowWrap: "anywhere",
                boxShadow: "0 1px 2px rgba(11, 18, 32, 0.04), 0 6px 16px -12px rgba(11, 18, 32, 0.3)",
              }
        }
      >
        {isUser || !renderAssistant ? message.content : renderAssistant(message.content)}
      </div>
    </motion.div>
  );
}

function Suggestions({ items, onPick }: { items: string[]; onPick: (text: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      // `.otto-suggestions` (globals.css) supplies the top gap and indents the
      // block to the bubble column, dropping the indent on a narrow widget
      // where the chips need every pixel of width.
      className="otto-suggestions"
    >
      <div
        className="font-mono uppercase"
        style={{ color: MUTED, fontSize: 10, letterSpacing: "0.12em", lineHeight: 1.4 }}
      >
        Try asking
      </div>

      <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
        {items.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPick(suggestion)}
            className="max-w-full cursor-pointer rounded-full border text-left whitespace-normal transition-colors duration-150"
            style={{
              padding: "8px 14px",
              background: WHITE,
              borderColor: RULE,
              color: SLATE,
              fontSize: 12.5,
              lineHeight: 1.35,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = ACCENT;
              e.currentTarget.style.color = ACCENT;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = RULE;
              e.currentTarget.style.color = SLATE;
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export function ChatMessages({
  messages,
  isTyping = false,
  suggestions = [],
  showSuggestions = false,
  onSend,
  onReset,
  onClose,
  renderAssistant,
  placeholder = "Ask a question…",
  title = "Otto",
  subtitle = "Repairo assistant",
  className,
}: ChatMessagesProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || isTyping) return;
      setInputValue("");
      onSend(value);
    },
    [isTyping, onSend],
  );

  const canSend = Boolean(inputValue.trim()) && !isTyping;

  return (
    <div
      className={cn("relative flex flex-col overflow-hidden rounded-2xl border", className)}
      style={{
        background: PAPER,
        borderColor: RULE,
        boxShadow: "0 24px 64px -16px rgba(11, 18, 32, 0.28)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="flex flex-none items-center gap-3 border-b"
        style={{ background: WHITE, borderColor: RULE, padding: "12px 16px" }}
      >
        <div className="relative flex-none">
          <Avatar size={36} />
          <span
            className="absolute -right-0.5 -bottom-0.5 block h-2.5 w-2.5 rounded-full border-2"
            style={{ background: TEAL, borderColor: WHITE }}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ color: INK, fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>
            {title}
          </div>
          <div
            className="truncate font-mono uppercase"
            style={{ color: MUTED, fontSize: 10, letterSpacing: "0.12em", lineHeight: 1.3, marginTop: 2 }}
          >
            {subtitle}
          </div>
        </div>

        <div className="flex flex-none items-center gap-0.5">
          {onReset && (
            <IconButton onClick={onReset} label="Start a new conversation" title="New conversation">
              <RotateCcw className="size-4" />
            </IconButton>
          )}
          {onClose && (
            <IconButton onClick={onClose} label="Close the assistant">
              <X className="size-4" />
            </IconButton>
          )}
        </div>
      </header>

      {/* ── Scrollable message area ─────────────────────────────────────── */}
      <div
        ref={scrollRef}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        <div className="flex flex-col gap-4" style={{ padding: 16 }}>
          {messages.map((message, i) => (
            <MessageBubble
              key={message.id}
              message={message}
              grouped={i > 0 && messages[i - 1].sender === message.sender}
              renderAssistant={renderAssistant}
            />
          ))}

          <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>

          {showSuggestions && suggestions.length > 0 && !isTyping && (
            <Suggestions items={suggestions} onPick={submit} />
          )}
        </div>
      </div>

      {/* ── Sticky composer ─────────────────────────────────────────────── */}
      <div
        className="flex-none border-t"
        style={{
          padding: 12,
          background: WHITE,
          borderColor: RULE,
          boxShadow: "0 -8px 20px -16px rgba(11, 18, 32, 0.45)",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(inputValue);
          }}
          className="flex items-center gap-2 rounded-xl border transition-colors focus-within:border-[var(--repairo-accent)]"
          style={{ background: PAPER, borderColor: RULE, padding: "6px 6px 6px 14px" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            aria-label="Type your question"
            disabled={isTyping}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--repairo-muted)] disabled:cursor-not-allowed"
            style={{ color: INK, fontSize: 14, lineHeight: 1.4, padding: "8px 0" }}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center self-center rounded-lg transition-all duration-150 active:scale-95 disabled:cursor-not-allowed"
            style={canSend ? { background: ACCENT, color: WHITE } : { background: RULE, color: MUTED }}
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatMessages;
