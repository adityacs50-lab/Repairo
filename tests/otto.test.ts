// Coverage for Otto, the Repairo chat assistant (/api/chat):
//   - knowledge retrieval picks the right sections for a question
//   - the system prompt carries persona, guardrails and only the relevant brief
//   - the Sarvam client's transport contract: headers, body, error classification,
//     retry on 429, timeout handling
//
// No network: the Sarvam client takes an injectable `fetchImpl`, so every call
// below is against a stub. Run with `npm run test:otto`.

import { KNOWLEDGE, retrieveKnowledge, renderKnowledge, LINKS } from "../src/lib/otto/knowledge";
import { buildOttoSystemPrompt, buildRetrievalQuery } from "../src/lib/otto/prompt";
import {
  createSarvamCompletion,
  sarvamConfigFromEnv,
  SarvamError,
  DEFAULT_SARVAM_BASE_URL,
  DEFAULT_SARVAM_MODEL,
} from "../src/lib/otto/sarvam";

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
  }
}

function sectionIds(query: string): string[] {
  return retrieveKnowledge(query).map((s) => s.id);
}

/** A stub `fetch` that returns a canned response and records what it was called with. */
function stubFetch(responses: Array<{ status: number; body: unknown }>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let i = 0;
  const impl = (async (url: unknown, init: unknown) => {
    calls.push({ url: String(url), init: (init ?? {}) as RequestInit });
    const next = responses[Math.min(i, responses.length - 1)];
    i++;
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.body,
      text: async () => JSON.stringify(next.body),
    };
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const okBody = (content: string) => ({ choices: [{ message: { role: "assistant", content } }] });

async function main() {
  console.log("\n=== Otto (chat assistant) tests ===");

  // ---------------------------------------------------------------------
  console.log("\nTest 1: knowledge base integrity");
  assert(KNOWLEDGE.length > 0, "The knowledge base is non-empty");
  assert(new Set(KNOWLEDGE.map((s) => s.id)).size === KNOWLEDGE.length, "Every section id is unique");
  assert(
    KNOWLEDGE.every((s) => s.content.trim().length > 0 && s.keywords.length > 0),
    "Every section has content and at least one retrieval keyword",
  );
  assert(
    KNOWLEDGE.some((s) => s.always) && KNOWLEDGE.filter((s) => s.always).length <= 3,
    "There are always-on sections, and few enough of them to stay cheap",
  );
  assert(
    !KNOWLEDGE.some((s) => /example\.com|yoursite|TODO|FIXME|lorem ipsum/i.test(s.content)),
    "No placeholder text or dummy URLs leaked into the knowledge base",
  );
  assert(
    KNOWLEDGE.some((s) => s.content.includes("SOC 2") && /roadmap|NOT completed/i.test(s.content)),
    "Compliance claims are stated honestly (SOC 2 framed as roadmap, not fact)",
  );

  // ---------------------------------------------------------------------
  console.log("\nTest 2: retrieval picks the right sections");
  assert(sectionIds("how much does Repairo cost?").includes("pricing"), "A cost question retrieves pricing");
  assert(sectionIds("what are your plans and seat limits").includes("pricing"), "A plan/seat question retrieves pricing");
  assert(
    sectionIds("do you store or train on our private code?").includes("security"),
    "A privacy question retrieves security",
  );
  assert(
    sectionIds("how is this different from Dependabot?").includes("comparisons"),
    "A comparison question retrieves comparisons",
  );
  assert(sectionIds("how do I install the CLI").includes("cli"), "An install question retrieves the CLI section");
  assert(
    sectionIds("how does the AST engine validate a patch").includes("engine"),
    "An engine question retrieves the engine section",
  );
  assert(
    sectionIds("the fix PR push failed with a 403").includes("troubleshooting"),
    "An error report retrieves troubleshooting",
  );
  assert(
    sectionIds("which vendors do you support, is Python supported?").includes("vendors"),
    "A support-matrix question retrieves vendors/languages",
  );
  assert(
    sectionIds("when do you use an LLM?").includes("llm-policy"),
    "A question about AI involvement retrieves the LLM policy",
  );

  // ---------------------------------------------------------------------
  console.log("\nTest 3: retrieval always grounds the answer");
  const alwaysIds = KNOWLEDGE.filter((s) => s.always).map((s) => s.id);
  for (const query of ["hi", "कीमत क्या है", "asdfgh qwerty", ""]) {
    const ids = sectionIds(query);
    assert(
      alwaysIds.every((id) => ids.includes(id)) && ids.length > alwaysIds.length,
      `"${query || "(empty)"}" still returns the always-on sections plus a fallback brief`,
    );
  }
  assert(
    retrieveKnowledge("pricing security cli engine vendors comparisons faq github app ci", { maxSections: 2 })
      .filter((s) => !s.always).length <= 2,
    "maxSections caps how many sections a single question can pull in",
  );
  assert(
    renderKnowledge(retrieveKnowledge("pricing")).includes("### Pricing"),
    "renderKnowledge emits a titled block per section",
  );

  // ---------------------------------------------------------------------
  console.log("\nTest 4: retrieval query uses conversation context");
  const followUp = buildRetrievalQuery([
    { role: "user", content: "Tell me about the Pro plan" },
    { role: "assistant", content: "Pro is $29/month." },
    { role: "user", content: "and how many seats?" },
  ]);
  assert(followUp.includes("seats") && followUp.includes("Pro plan"), "A follow-up carries the earlier turn's context");

  // ---------------------------------------------------------------------
  console.log("\nTest 5: system prompt assembly");
  const prompt = buildOttoSystemPrompt([{ role: "user", content: "How much does Repairo cost?" }]);
  assert(prompt.startsWith("You are Otto"), "The prompt opens with Otto's persona");
  assert(prompt.includes("## Language"), "The prompt carries the language-mirroring rules");
  assert(prompt.includes("SCOPE IS STRICT"), "The prompt carries the scope guardrail");
  assert(prompt.includes("Never reveal"), "The prompt forbids disclosing its own instructions");
  assert(prompt.includes("## Knowledge brief"), "The prompt carries a knowledge brief");
  assert(prompt.includes(LINKS.pricing), "A pricing question's prompt includes the canonical pricing URL");
  assert(
    !prompt.includes("Troubleshooting") || !prompt.includes("Published FAQ"),
    "The prompt is filtered, not the whole knowledge base concatenated",
  );
  assert(prompt.length < 14_000, `The assembled prompt stays within budget (${prompt.length} chars)`);

  // The widget renders markdown, but into a narrow column — so the prompt opts
  // into a small subset and rules out what will not fit.
  assert(/renders markdown properly/.test(prompt), "The prompt tells Otto its markdown is rendered, not shown raw");
  assert(/`inline code`/.test(prompt), "The prompt names the markdown Otto may use");
  assert(/400px/.test(prompt), "The prompt states the width Otto is writing into");
  assert(/Never a table\.|never a table/i.test(prompt), "The prompt rules out tables");
  assert(
    KNOWLEDGE.find((s) => s.id === "comparisons")!.content.includes("never reproduce it as a table"),
    "The comparison table is labelled reference-data-only so it is not echoed verbatim",
  );
  const noFiller = buildOttoSystemPrompt([{ role: "user", content: "how do I install the cli" }]);
  assert(/Here is a breakdown/.test(noFiller), "The prompt names the filler openings to avoid");

  // ---------------------------------------------------------------------
  console.log("\nTest 6: Sarvam config resolution");
  const defaults = sarvamConfigFromEnv({});
  assert(
    defaults.model === DEFAULT_SARVAM_MODEL && defaults.baseUrl === DEFAULT_SARVAM_BASE_URL && defaults.apiKey === "",
    "With no env set, config falls back to documented defaults and an empty key",
  );
  const overridden = sarvamConfigFromEnv({
    SARVAM_API_KEY: "  sk_test  ",
    SARVAM_MODEL: "sarvam-105b-conversations",
    SARVAM_BASE_URL: "https://api.sarvam.ai/v2/",
  });
  assert(overridden.apiKey === "sk_test", "The API key is trimmed");
  assert(overridden.model === "sarvam-105b-conversations", "SARVAM_MODEL overrides the default model");
  assert(overridden.baseUrl === "https://api.sarvam.ai/v2", "A trailing slash on SARVAM_BASE_URL is stripped");

  // ---------------------------------------------------------------------
  console.log("\nTest 7: Sarvam request contract");
  const ok = stubFetch([{ status: 200, body: okBody("Repairo fixes breaking API changes.") }]);
  const text = await createSarvamCompletion({
    apiKey: "sk_test",
    model: "sarvam-105b",
    messages: [
      { role: "system", content: "system prompt" },
      { role: "user", content: "what is repairo" },
    ],
    fetchImpl: ok.impl,
  });
  assert(text === "Repairo fixes breaking API changes.", "The assistant's message content is returned");
  assert(ok.calls[0].url === `${DEFAULT_SARVAM_BASE_URL}/chat/completions`, "It POSTs to /chat/completions on the base URL");
  const headers = ok.calls[0].init.headers as Record<string, string>;
  assert(headers["api-subscription-key"] === "sk_test", "The Sarvam subscription-key header carries the key");
  assert(headers.Authorization === "Bearer sk_test", "The OpenAI-compatible Bearer header is sent too");
  const sent = JSON.parse(String(ok.calls[0].init.body));
  assert(sent.model === "sarvam-105b", "The requested model is sent");
  assert(sent.stream === false, "Streaming is explicitly off (the widget expects one JSON response)");
  assert(sent.messages[0].role === "system", "The system prompt leads the message array");
  assert(typeof sent.max_tokens === "number" && sent.max_tokens > 0, "A max_tokens bound is always sent");

  // ---------------------------------------------------------------------
  console.log("\nTest 8: Sarvam error classification");
  async function kindOf(status: number, body: unknown = { error: "nope" }, retries = 0) {
    try {
      await createSarvamCompletion({
        apiKey: "sk_test",
        messages: [{ role: "user", content: "hi" }],
        retries,
        fetchImpl: stubFetch([{ status, body }]).impl,
      });
      return "no-error";
    } catch (error) {
      return error instanceof SarvamError ? error.kind : "wrong-type";
    }
  }
  assert((await kindOf(401)) === "auth", "401 classifies as an auth/config error");
  assert((await kindOf(403)) === "auth", "403 classifies as an auth/config error");
  assert((await kindOf(429)) === "rate_limit", "429 classifies as rate limiting");
  assert((await kindOf(500)) === "upstream", "500 classifies as an upstream failure");
  assert((await kindOf(200, { choices: [] })) === "empty", "An empty choices array classifies as an empty response");
  assert(
    (await kindOf(200, { choices: [{ message: { content: "   " } }] })) === "empty",
    "A whitespace-only completion classifies as an empty response",
  );

  let missingKeyKind = "";
  try {
    await createSarvamCompletion({ apiKey: "", messages: [{ role: "user", content: "hi" }] });
  } catch (error) {
    missingKeyKind = error instanceof SarvamError ? error.kind : "wrong-type";
  }
  assert(missingKeyKind === "auth", "A missing key fails fast as an auth error without calling the network");

  // ---------------------------------------------------------------------
  console.log("\nTest 9: retry and timeout");
  const flaky = stubFetch([
    { status: 429, body: { error: "slow down" } },
    { status: 200, body: okBody("recovered") },
  ]);
  const recovered = await createSarvamCompletion({
    apiKey: "sk_test",
    messages: [{ role: "user", content: "hi" }],
    retries: 1,
    fetchImpl: flaky.impl,
  });
  assert(recovered === "recovered" && flaky.calls.length === 2, "A 429 is retried once and the retry's answer is used");

  const hang = (async () =>
    new Promise((_resolve, reject) => {
      const err = new Error("aborted");
      err.name = "AbortError";
      setTimeout(() => reject(err), 5);
    })) as unknown as typeof fetch;
  let timeoutKind = "";
  try {
    await createSarvamCompletion({
      apiKey: "sk_test",
      messages: [{ role: "user", content: "hi" }],
      timeoutMs: 1,
      retries: 0,
      fetchImpl: hang,
    });
  } catch (error) {
    timeoutKind = error instanceof SarvamError ? error.kind : "wrong-type";
  }
  assert(timeoutKind === "timeout", "An aborted request classifies as a timeout, not a generic crash");

  // ---------------------------------------------------------------------
  // A 200 carrying no usable content is the confusing failure mode (unknown model
  // id, truncated answer, a reasoning pass that ate the token budget). These cover
  // the shapes that ARE answers, and that the diagnostic for the rest is useful.
  console.log("\nTest 10: response-shape tolerance and empty-response diagnostics");
  const blocks = await createSarvamCompletion({
    apiKey: "sk_test",
    messages: [{ role: "user", content: "hi" }],
    fetchImpl: stubFetch([
      { status: 200, body: { choices: [{ message: { content: [{ type: "text", text: "block answer" }] } }] } },
    ]).impl,
  });
  assert(blocks === "block answer", "OpenAI-style content blocks are joined into the answer");

  const legacy = await createSarvamCompletion({
    apiKey: "sk_test",
    messages: [{ role: "user", content: "hi" }],
    fetchImpl: stubFetch([{ status: 200, body: { choices: [{ text: "legacy answer" }] } }]).impl,
  });
  assert(legacy === "legacy answer", "A gateway answering in `text` instead of `message` still works");

  let emptyMessage = "";
  try {
    await createSarvamCompletion({
      apiKey: "sk_test",
      messages: [{ role: "user", content: "hi" }],
      retries: 0,
      fetchImpl: stubFetch([
        {
          status: 200,
          body: {
            choices: [{ finish_reason: "length", message: { content: "", reasoning_content: "x".repeat(900) } }],
          },
        },
      ]).impl,
    });
  } catch (error) {
    emptyMessage = error instanceof Error ? error.message : "";
  }
  assert(emptyMessage.includes("finish_reason=length"), "The empty-response error reports finish_reason");
  assert(emptyMessage.includes("reasoning_content=900"), "It reports that the token budget went to reasoning");
  assert(
    emptyMessage.includes("MAX_TOKENS"),
    "It names the server setting that fixes a reasoning overrun (raise the chat token budget)",
  );

  let nonJsonKind = "";
  try {
    await createSarvamCompletion({
      apiKey: "sk_test",
      messages: [{ role: "user", content: "hi" }],
      retries: 0,
      fetchImpl: (async () => ({
        ok: true,
        status: 200,
        text: async () => "<html>gateway</html>",
      })) as unknown as typeof fetch,
    });
  } catch (error) {
    nonJsonKind = error instanceof SarvamError ? error.kind : "wrong-type";
  }
  assert(nonJsonKind === "empty", "An HTML/non-JSON body is reported rather than crashing the JSON parse");

  const defaultEffort = stubFetch([{ status: 200, body: okBody("ok") }]);
  await createSarvamCompletion({
    apiKey: "sk_test",
    messages: [{ role: "user", content: "hi" }],
    fetchImpl: defaultEffort.impl,
  });
  assert(
    JSON.parse(String(defaultEffort.calls[0].init.body)).reasoning_effort === "low",
    "reasoning_effort defaults to low (least thinking the API allows) when unset",
  );

  const omitEffort = stubFetch([{ status: 200, body: okBody("ok") }]);
  await createSarvamCompletion({
    apiKey: "sk_test",
    messages: [{ role: "user", content: "hi" }],
    reasoningEffort: "none",
    fetchImpl: omitEffort.impl,
  });
  assert(
    !("reasoning_effort" in JSON.parse(String(omitEffort.calls[0].init.body))),
    "reasoning_effort is omitted when explicitly set to none/off (provider default)",
  );

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
  console.log("==================================================\n");
  if (passedTests !== totalTests) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
