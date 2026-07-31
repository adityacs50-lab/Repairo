"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: "What does Repairo actually do?",
    answer: "Whenever external services you rely on (like OpenAI, Stripe, or Google Gemini) update their software, your app can break. Repairo automatically detects these changes and creates a ready-to-merge fix for your developers—so your app stays up and running without wasting engineering hours."
  },
  {
    question: "Do you store or train on our company's private code?",
    answer: "Never. We follow a strict Zero-Retention policy. Your code is processed in secure temporary memory only while creating the fix, and is completely wiped immediately after. Your code always remains 100% private."
  },
  {
    question: "How does this save my team money and time?",
    answer: "Engineers spend up to 20% of their time manually hunting down and fixing broken third-party tools. Repairo does this work automatically in seconds, letting your team focus on building new features that grow your business."
  },
  {
    question: "What happens when an AI model or payment system updates?",
    answer: "Repairo instantly flags the update, rewrites the affected lines of code, and opens a standard GitHub Pull Request. Your team simply clicks 'Approve' to apply the update safely."
  },
  {
    question: "Does Repairo also protect us from security vulnerabilities?",
    answer: "Yes! Repairo constantly monitors your application for known security risks in third-party software and automatically submits security patches before issues ever hit production."
  },
  {
    question: "How hard is it to set up?",
    answer: "It takes less than 2 minutes. Simply connect your GitHub account, choose which projects to protect, and Repairo starts working in the background automatically. No complex configuration required."
  }
];

function FaqItem({ question, answer, isOpen, onClick }: { question: string, answer: string, isOpen: boolean, onClick: () => void }) {
  return (
    <div className="border-b border-hairline last:border-b-0">
      <button 
        onClick={onClick}
        className="w-full flex justify-between items-center py-[24px] text-left hover:text-ink focus:outline-none transition-colors group"
      >
        <span className={cn(
          "text-[18px] md:text-[20px] font-medium tracking-tight transition-colors",
          isOpen ? "text-ink" : "text-body-mid group-hover:text-ink"
        )}>
          {question}
        </span>
        <ChevronDown 
          className={cn(
            "w-5 h-5 text-body-mid transition-transform duration-300",
            isOpen ? "rotate-180 text-ink" : "group-hover:text-ink"
          )} 
        />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-[24px] text-[16px] text-body leading-[1.6] max-w-[800px]">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full py-[80px] md:py-[120px] bg-canvas relative">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(10,10,10,0.8)] to-transparent pointer-events-none" />

      <div className="mx-auto max-w-[800px] px-[24px] relative z-10">
        <div className="flex flex-col items-center text-center mb-[64px]">
          <h2 className="text-[32px] md:text-[48px] font-normal tracking-[-1px] text-ink leading-[1.1]">
            Common Questions
          </h2>
          <p className="text-[18px] text-body-mid mt-[16px]">
            Everything you need to know about the product and billing.
          </p>
        </div>

        <div className="flex flex-col border-t border-hairline">
          {FAQS.map((faq, index) => (
            <FaqItem 
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
