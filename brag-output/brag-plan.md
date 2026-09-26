# Repairo — launch film plan (/brag-slim, Apple keynote tone)

**What it is:** Repairo detects breaking changes in a vendor's OpenAPI contract, finds the exact call sites in your code, rewrites them with AST transforms, and typechecks the fix before opening a PR.

**Who it's for:** Teams that depend on Stripe / OpenAI / Supabase-style APIs and are tired of Dependabot bumping a version while the call sites quietly break.

**What sets it apart:** Deterministic, spec-grounded repairs (not a guessing agent), scoped to the real call site, compile-checked, never auto-merged.

**Most impressive claim (real):** "Dependabot bumps the package. Repairo fixes the call sites that break."

**Visual hook:** A single line of real code — `max_tokens: 500,` — glowing in the dark, then struck through by the vendor.

**Real material used:** `fixtures/breaking-api-demo/src/ai/client.ts`, real `repairo diff` output from this repo (captured while planning), the README diff (`max_tokens` → `max_output_tokens`), "never auto-merges", Repairo's tokens from `globals.css` (ink `#f7f5f0`, muted `#c9c0ad`, canvas-soft `#383330`, hairline `#3f3a36`, teal `#3dd6b5` for verified, amber `#c9a227` for breaking), Inter / DM Mono / Pixelify Sans wordmark.

**Tone:** freeform — "exactly how Apple would do it": near-black stage, big quiet type, one idea per scene, words that rise out of a blur, slow push-ins, dips through black, a triad (Detect. Repair. Verified.), and an original score in D major at 120 BPM (pad → piano arpeggio → soft pulse → resolve).

**Format:** 1920×1080, 30fps, 25.0s. Every cut lands on a beat.

## Storyboard

| # | Time | Scene | On screen |
|---|---|---|---|
| 1 | 0.0–5.5 | Hook | "Your vendor changed their API." → "Your code didn't get the memo." Over the real `openai.chat.completions.create({...})` call; `max_tokens: 500,` is struck amber, tag: *BREAKING · Parameter removed: max_tokens*. Slow push-in. |
| 2 | 5.5–10.5 | Reveal | "Introducing" → **Repairo** wordmark resolves from blur with a sub boom → "Dependabot bumps the package. / Repairo fixes the call sites that break." |
| 3 | 10.5–14.0 | Detect. | "OpenAPI-grounded. Not guessed." Terminal rises into place, `repairo diff --spec ./specs/new.json` types, real output lands line by line: BREAKING, Parameter removed: max_tokens, 1 file · 4 call sites. |
| 4 | 14.0–17.5 | Repair. | "Only the real call site. Rewritten by the AST." The client.ts card; `max_tokens` line strikes out and `max_output_tokens` slides in, teal. |
| 5 | 17.5–21.0 | Verified. | "Typechecked before it ever becomes a PR." PR card: tsc passes (check draws itself), `1 file changed +1 −1`, *Human review required · never auto-merges*. |
| 6 | 21.0–25.0 | Outro | **Repairo** · "When the API changes, know exactly what to repair." · `npx repairo-cli scan ./src` · heyrepairo.in → fade to black. |

**Punchline:** the triad lands on "Verified." — then the brand, the one command, the URL.

**Share caption:** see `share-copy.txt`.
