/**
 * Otto connectivity probe — run this when the chat widget answers but says nothing.
 *
 *   npx tsx scripts/otto-ping.ts
 *
 * It reads SARVAM_API_KEY from .env.local, calls the Sarvam chat-completions
 * endpoint directly, and prints the HTTP status plus the RAW response body for a
 * few model/base-URL combinations. The raw body is the point: a 200 that carries
 * no message content (wrong model id, all tokens spent on reasoning, a different
 * response shape) looks identical to a working call from inside the app.
 *
 * The key is never printed.
 */

const CANDIDATES: Array<{ baseUrl: string; model: string }> = [
  { baseUrl: "https://api.sarvam.ai/v1", model: "sarvam-105b-conversations" },
  { baseUrl: "https://api.sarvam.ai/v1", model: "sarvam-105b" },
  { baseUrl: "https://api.sarvam.ai/v2", model: "sarvam-105b-conversations" },
];

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(file);
    } catch {
      /* file absent or unreadable — fall through to the next one */
    }
  }
}

async function probe(apiKey: string, baseUrl: string, model: string) {
  const url = `${baseUrl}/chat/completions`;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a terse assistant." },
          { role: "user", content: "Reply with exactly: pong" },
        ],
        max_tokens: 256,
        temperature: 0.2,
        stream: false,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const raw = await response.text();
    const ms = Date.now() - started;
    console.log(`\n--- ${model} @ ${baseUrl}  ->  HTTP ${response.status} (${ms}ms)`);

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.log("   raw (not JSON):", raw.slice(0, 600));
      return;
    }

    const choice = parsed?.choices?.[0];
    const content = choice?.message?.content;
    const reasoning = choice?.message?.reasoning_content;

    if (typeof content === "string" && content.trim()) {
      console.log(`   ✅ content: ${JSON.stringify(content.trim().slice(0, 120))}`);
      console.log(`   finish_reason: ${choice?.finish_reason}`);
      console.log(`   USE THIS -> SARVAM_MODEL=${model}${baseUrl.endsWith("/v2") ? `  SARVAM_BASE_URL=${baseUrl}` : ""}`);
      return;
    }

    console.log("   ⚠️  no usable message content. Diagnostics:");
    console.log(`   finish_reason: ${choice?.finish_reason}`);
    console.log(`   content field: ${JSON.stringify(content)}`);
    if (reasoning) console.log(`   reasoning_content present (${String(reasoning).length} chars) — model spent the budget thinking`);
    console.log(`   usage: ${JSON.stringify(parsed?.usage)}`);
    console.log(`   raw: ${raw.slice(0, 600)}`);
  } catch (error) {
    console.log(`\n--- ${model} @ ${baseUrl}  ->  request failed`);
    console.log(`   ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`);
  }
}

async function main() {
  loadEnv();
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    console.error("SARVAM_API_KEY is not set. Add it to .env.local and re-run.");
    process.exit(1);
  }
  console.log(`Using SARVAM_API_KEY ${apiKey.slice(0, 6)}…${apiKey.slice(-3)} (${apiKey.length} chars)`);
  console.log(
    `Configured model: ${process.env.SARVAM_MODEL || "(unset — app default sarvam-105b-conversations)"}`,
  );

  for (const candidate of CANDIDATES) {
    await probe(apiKey, candidate.baseUrl, candidate.model);
  }

  console.log("\nDone. Put the model marked USE THIS into .env.local as SARVAM_MODEL and restart next dev.\n");
}

main();
