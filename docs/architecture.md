# Repairo architecture

Canonical diagram for the **repair engine**. Matches `runRepair()` in `src/lib/engine/index.ts` and the CLI `repairo repair` command (validation details differ by entry point — see below).

## Engine graph (`runRepair`)

```
  [before OpenAPI] ──┐
  [after OpenAPI]  ──┼──► parseOpenApi ──► diffOpenApi ──► ApiChange[]
                     │
  [consumer files] ──┼──► findImpactedCode ──────────────► ImpactMatch[]
                     │
                     │     optional agentResolve
                     │              │
                     │              ▼
                     │     resolveAmbiguousEnums (on ApiChange[] only)
                     │              │
                     └──────────────┼──► generateFixes
                                    │
                                    ▼
                         buildPullRequest (safetyScore, auto-merge flags)
                                    │
                                    ▼
                         validateInMemory (merged patched files)
                                    │  └── on failure: lower safetyScore,
                                    │      autoMergeEligible = false
                                    ▼
                         RepairRunResult + CycloneDX SBOM
```

**Orchestrator:** one function — `runRepair()` — powers hosted `/api/repair`, the demo UI fixtures, and GitHub App repair flows.

## CLI vs hosted validation

| Path | When validation runs | What runs |
| --- | --- | --- |
| **Hosted / `runRepair()`** | After `buildPullRequest` | `validateInMemory` on merged consumer files (no full checkout) |
| **`repairo repair` (local)** | After patches are computed, **before** `--apply` / `--create-pr` | Writes temp tree → `validateCodebase` (`tsc`, Python/Go syntax, optional Pyright) with baseline-aware diff |

Neither path auto-merges when validation fails or when any fix is agent-proposed.

## Surrounding product (not in the engine box)

```
Vendor OpenAPI / snapshots          Your repo (CLI) or OAuth checkout (hosted)
         │                                        │
         ▼                                        ▼
   repairo check / diff / scan              Workspace + integrations
         │                                        │
         └──────────────► runRepair ◄─────────────┘
                              │
                              ▼
                    GitHub PR (human merge)
```

**Hosted deployment:** Next.js on Vercel, Neon Postgres, encrypted GitHub tokens, GitHub App webhooks — see `DEPLOY.md` and `/security`.

## Related docs

- VC / diligence brief: [technical-deep-dive-vc.md](./technical-deep-dive-vc.md)
- Public docs site: [heyrepairo.in/docs](https://www.heyrepairo.in/docs)
