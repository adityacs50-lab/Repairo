# Post copy — Repairo social film

One film, three cuts. Text is burned in, so every version works with sound off.
`repairo-social.srt` is there for YouTube / LinkedIn uploads that want a caption file.

---

## LinkedIn

> Dependabot opened the PR. CI went red anyway.
>
> Not because the bump was wrong — because the vendor renamed a required
> parameter and nothing in your repo knew about it. `max_tokens` →
> `max_output_tokens`, 14 call sites, 11 files, zero lines changed by you.
>
> That's the gap Repairo sits in:
>
> → diff the vendor's OpenAPI, not the changelog
> → map impact through the AST (ts-morph), so the same identifier on an
>   unrelated object is left alone
> → apply the transform, then run `tsc --noEmit` **before** anything is proposed
> → open a PR with the evidence attached — and never auto-merge it
>
> 35 seconds, sound optional.
>
> `npx repairo-cli scan ./src`
> heyrepairo.in

Hashtags: #devtools #opensource #typescript #api #developerexperience

---

## X / Twitter

> Dependabot bumps the package.
> Repairo fixes the call sites that break.
>
> OpenAPI diff → AST impact map → compile-checked patch → reviewable PR.
> It will not propose a patch that doesn't compile.
>
> npx repairo-cli scan ./src

Thread follow-up (optional):

> The compile gate is the whole point. An agent that *probably* fixed your
> call sites is a code review you now owe someone. `tsc --noEmit` passing
> before the PR exists is a different kind of promise.

---

## Instagram / Reels / Shorts

> your vendor renamed one parameter.
> your build found out in CI.
>
> Repairo diffs the OpenAPI spec, walks the AST to find every real call site,
> applies the fix, type-checks it, and opens a PR you actually have to approve.
>
> npx repairo-cli scan ./src
> link in bio → heyrepairo.in

---

## Hacker News / Reddit (r/javascript, r/typescript)

Lead with the mechanism, not the pitch:

> Show HN: Repairo — diff a vendor's OpenAPI spec, then AST-repair the call
> sites that break
>
> Version bumpers update package.json; they don't rewrite your calls when a
> vendor renames a required parameter. Repairo computes a structural diff of
> the spec, maps impact with ts-morph (so unrelated objects with the same
> property name are untouched), applies deterministic transforms where the
> change is unambiguous, and gates on `tsc --noEmit` before opening a PR.
> Ambiguous mappings are flagged rather than guessed. Apache-2.0, CLI is local.

---

## Notes before you post

- The video quotes `max_tokens → max_output_tokens`, the same example as the
  README's `breaking-api-demo` fixture — so anyone who clicks through can
  reproduce it in one command.
- The "14 call sites / 24 files scanned" numbers are illustrative of a scan,
  not a benchmark claim. Swap the copy if you'd rather show a real run.
- Music is `public/music/bg-music.mp3`, already in this repo. Confirm you hold
  distribution rights for it before pushing the film to a platform that runs
  Content ID (YouTube, Instagram, Facebook). Everything else in the audio —
  impacts, risers, UI ticks, reverb — is synthesized for this film and carries
  no third-party rights.
