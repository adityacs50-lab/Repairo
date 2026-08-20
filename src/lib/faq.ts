/** Home-page FAQ content. Plain module so both the client accordion and server JSON-LD can import it. */
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  hasSpecialContent?: boolean;
}

export const FAQ_LIST: FaqItem[] = [
  {
    id: "codeStorage",
    question: "Do you store or train on our company's private code?",
    answer: "Never. We follow a strict Zero-Retention policy. Your code is processed in secure temporary memory only while creating the fix, and is completely wiped immediately after. Your code always remains 100% private.",
    hasSpecialContent: true,
  },
  {
    id: "whatItDoes",
    question: "What does Repairo actually do?",
    answer: "Whenever external services you rely on (like OpenAI, Stripe, or Google Gemini) update their software, your app can break. Repairo automatically detects these changes and creates a ready-to-merge fix for your developers—so your app stays up and running without wasting engineering hours.",
  },
  {
    id: "saveMoneyTime",
    question: "How does this save my team money and time?",
    answer: "Engineers spend up to 20% of their time manually hunting down and fixing broken third-party tools. Repairo does this work automatically in seconds, letting your team focus on building new features that grow your business.",
  },
  {
    id: "modelUpdate",
    question: "What happens when an AI model or payment system updates?",
    answer: "Repairo instantly flags the update, rewrites the affected lines of code, and opens a standard GitHub Pull Request. Your team simply clicks 'Approve' to apply the update safely.",
  },
  {
    id: "securityVuln",
    question: "Does Repairo also protect us from security vulnerabilities?",
    answer: "Yes! Repairo constantly monitors your application for known security risks in third-party software and automatically submits security patches before issues ever hit production.",
  },
  {
    id: "setupDifficulty",
    question: "How hard is it to set up?",
    answer: "It takes less than 2 minutes. Simply connect your GitHub account, choose which projects to protect, and Repairo starts working in the background automatically. No complex configuration required.",
  },
];
