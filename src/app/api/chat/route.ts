import { NextResponse } from "next/server";

const SARVAM_API_URL = "https://api.sarvam.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are Otto, Repairo's AI Assistant. Repairo is an automated API maintenance toolchain (often called "Dependabot for OpenAPI").
Your job is to answer developers' and founders' questions about Repairo clearly, concisely, and with a developer-first, professional tone.

Key features and technical architecture of Repairo:
1. Zero Hallucinations / 100% Compile Guarantee: Unlike generalist AI assistants (like Cursor, Devin, or Copilot) that rely on probabilistic guessing, Repairo is built on a deterministic compiler engine. It compiles code modifications as strict AST transforms (using ts-morph and the TypeScript compiler API). Patches either compile perfectly or are blocked before they are committed.
2. Stateless RAM Vault / Zero Retention: Repairo has a strict security posture. It streams code into an isolated, ephemeral, volatile RAM buffer, executes AST transformations, pushes the patch/PR to GitHub, and immediately zeroes out the RAM block within ~24ms. Zero proprietary codebase files, secrets, or AST blocks are ever written to physical disk, databases, or log files.
3. Fully Local Option: The CLI is open-source (Apache-2.0) and can run completely offline, satisfying rigorous SOC 2, GDPR, and InfoSec requirements.
4. Pricing Model:
   - Developer Tier (Free): Local CLI scanning, manual rule triggers, open-source presets, up to 3 repository runs per month.
   - Team Tier ($100/month): Background OpenAPI polling, automated PR generation, stateless RAM vault automation, unlimited repository runs.
   - Enterprise Tier (Custom): Private API specs, hybrid VPC runner agent, SSO/RBAC, and custom SLAs.
5. Integration Support: Currently automates API drifts and SDK migrations for TypeScript consumers of Stripe, Supabase, Clerk, OpenAI, Gemini, and Anthropic Claude.

Guidelines for your responses:
- Keep answers concise and direct. Developers appreciate speed and clarity.
- Use formatting (bolding, inline code, or small code blocks) to make information readable.
- If asked about language support, note that it currently supports TypeScript/JavaScript and is expanding to other languages.
- Be honest. If asked about features not currently supported, say they are on the roadmap.`;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const apiKey = process.env.SARVAM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Sarvam API Key is not configured on the server." },
        { status: 500 }
      );
    }

    // Call Sarvam AI completions API
    const response = await fetch(SARVAM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "sarvam-105b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sarvam API Error:", errorText);
      return NextResponse.json(
        { error: `Sarvam API responded with status ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "No response received from Sarvam AI.";

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    console.error("Error in chat handler:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
