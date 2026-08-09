"use client";

import React, { useState, useEffect, useRef } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How does the Stateless RAM Vault work?",
  "How is Repairo different from Devin or Cursor?",
  "Can I run it completely offline?",
  "What is the pricing model?",
];

function renderMarkdown(text: string) {
  // Split the response by code blocks (```...```) to render code properly
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3).trim();
      const lines = code.split("\n");
      const hasLang = lines[0].match(/^[a-zA-Z0-9_-]+$/);
      const cleanCode = hasLang ? lines.slice(1).join("\n") : code;
      return (
        <pre key={i} className="my-2 p-2.5 bg-black/40 border border-white/5 rounded font-mono text-[11px] text-neutral-300 overflow-x-auto whitespace-pre">
          <code>{cleanCode}</code>
        </pre>
      );
    }

    const lines = part.split("\n");
    return (
      <div key={i} className="space-y-1">
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          
          // Detect headers: "# ", "## ", "### "
          const isH1 = trimmed.startsWith("# ");
          const isH2 = trimmed.startsWith("## ");
          const isH3 = trimmed.startsWith("### ");
          
          let lineContent = line;
          if (isH1) lineContent = trimmed.slice(2).trim();
          else if (isH2) lineContent = trimmed.slice(3).trim();
          else if (isH3) lineContent = trimmed.slice(4).trim();
          
          const isBullet = !isH1 && !isH2 && !isH3 && (trimmed.startsWith("- ") || trimmed.startsWith("* "));
          if (isBullet) lineContent = trimmed.slice(2).trim();

          // Split line by **bold** or `inline code`
          const inlineRegex = /(\*\*.*?\*\*|`.*?`)/g;
          const inlineParts = lineContent.split(inlineRegex);

          const formatted = inlineParts.map((subPart, subIdx) => {
            if (subPart.startsWith("**") && subPart.endsWith("**")) {
              return (
                <strong key={subIdx} className="font-bold text-white">
                  {subPart.slice(2, -2)}
                </strong>
              );
            }
            if (subPart.startsWith("`") && subPart.endsWith("`")) {
              return (
                <code key={subIdx} className="px-1 py-0.5 bg-white/10 rounded font-mono text-[11px] text-neutral-200">
                  {subPart.slice(1, -1)}
                </code>
              );
            }
            return subPart;
          });

          if (isH1) {
            return (
              <h1 key={lineIdx} className="text-white font-bold text-base mt-2.5 mb-1">
                {formatted}
              </h1>
            );
          }

          if (isH2) {
            return (
              <h2 key={lineIdx} className="text-white font-semibold text-[14px] mt-2 mb-1">
                {formatted}
              </h2>
            );
          }

          if (isH3) {
            return (
              <h3 key={lineIdx} className="text-white font-medium text-[13.5px] mt-1.5 mb-0.5">
                {formatted}
              </h3>
            );
          }

          if (isBullet) {
            return (
              <ul key={lineIdx} className="list-disc pl-4 my-0.5">
                <li className="text-neutral-300 text-[13px]">{formatted}</li>
              </ul>
            );
          }

          if (trimmed === "") {
            return <div key={lineIdx} className="h-1.5" />;
          }

          return (
            <p key={lineIdx} className="text-neutral-300 text-[13px]">
              {formatted}
            </p>
          );
        })}
      </div>
    );
  });
}

export default function RepairoChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle chat via keyboard shortcut: Cmd+/ or Ctrl+/
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Scroll to bottom when messages or open status change
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading]);

  // Alert developer of new messages when closed
  useEffect(() => {
    if (!isOpen && messages.length > 0 && messages[messages.length - 1].role === "assistant") {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewMessage(false);
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Hi! I'm Otto, the Repairo assistant. Ask me anything about our AST compiler engine, 24ms stateless RAM vaults, security, or how to get started.",
        },
      ]);
    }
  };

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMessage];
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error while processing that request: ${error.message || "Unknown error"}. Please check your server logs or API key.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans text-sm selection:bg-neutral-800 selection:text-white">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-neutral-950 text-white border border-white/10 hover:border-[#ff801f]/50 hover:shadow-[0_0_20px_rgba(255,128,31,0.3)] transition-all duration-300 group"
          aria-label="Open Chat Assistant"
        >
          {hasNewMessage && (
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff801f] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#ff801f]"></span>
            </span>
          )}
          <svg
            className="w-6 h-6 text-neutral-400 group-hover:text-white group-hover:scale-110 transition-all duration-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
          {/* Key shortcut label shown on hover */}
          <span className="absolute right-full mr-3 px-2 py-1 bg-neutral-900 border border-white/10 text-neutral-400 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none shadow-lg">
            Ctrl + /
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="flex flex-col w-[380px] sm:w-[400px] h-[520px] rounded-xl bg-[#0a0a0c]/95 border border-white/10 shadow-[0_0_50px_-12px_rgba(255,128,31,0.15)] overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <span className="font-semibold text-neutral-200">Otto</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white transition-colors duration-200"
              aria-label="Close Chat"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3.5 py-2.5 leading-relaxed text-[13px] ${
                    msg.role === "user"
                      ? "bg-[#ff801f] text-neutral-950 font-medium whitespace-pre-wrap"
                      : "bg-white/5 border border-white/10 text-neutral-300"
                  }`}
                >
                  {msg.role === "user" ? msg.content : renderMarkdown(msg.content)}
                </div>
              </div>
            ))}

            {/* Suggestions (only show at start or when chat is clean) */}
            {messages.length === 1 && !isLoading && (
              <div className="pt-2 space-y-2">
                <p className="text-xs text-neutral-500 font-medium">Quick suggestions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(sug)}
                      className="text-xs text-neutral-400 bg-white/5 border border-white/5 hover:border-[#ff801f]/30 hover:bg-white/[0.08] hover:text-neutral-200 px-2.5 py-1.5 rounded-md transition-all duration-200 text-left"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-3 bg-neutral-950 border-t border-white/5 flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-white/5 border border-white/10 text-[13px] text-white rounded-md px-3 py-2 focus:outline-none focus:border-[#ff801f]/40 transition-colors duration-200"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-3 rounded-md bg-white text-neutral-950 border border-transparent font-medium hover:bg-neutral-200 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:hover:bg-white transition-all duration-200 flex items-center justify-center"
              aria-label="Send Message"
            >
              <svg
                className="w-4 h-4 fill-current"
                viewBox="0 0 24 24"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
