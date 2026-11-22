# 07. Complete Experimental Protocol

Primary source: `protocol/phase8-protocol-v2.md` (113,531 bytes, dated 2026-10-27 — this is the frozen, committed-style reference document; note it lives in a directory alongside the new, explicitly-unapplied `PROPOSED-AMENDMENT-A2-metric-reconciliation.md`, dated 2026-11-05). VERIFIED — SOURCE for all line-numbered citations below.

## Chronological timeline (reconstructed from file dates and git history, DERIVED — NEW ANALYSIS)

| Date | Event | Evidence |
|---|---|---|
| 2026-09-04 | Original `docs/research-design.md` committed (100 lines, no named metrics) | `git log --follow`, commit `0a56f92` |
| 2026-10-27 | `protocol/phase8-protocol-v2.md` created/frozen; registers log loss + latent-recovery MAE (Track A primary) and K(T) (Track B primary); already lists `itemsToCriterion` (C8.4) and Brier score (lines 1065/1741) as secondary/exploratory items | File timestamp, content |
| 2026-10-27 | Original 8C-Pilot executed (13,560 runs), analyzed for log loss/K(T)/MAE | `pilot-report.json`, `pilot_descriptive_stats.json` timestamps |
| 2026-10-29 | System audit (referenced by prior stages; not independently re-verified by this pass beyond its cited findings F-02/F-03/F-05) | Referenced throughout `docs/system-audit/` |
| 2026-10-31 | Stage 1 "experimental validity" pass — `docs/research-design.md` edited (uncommitted) to add the disputed "Questions-to-Mastery...from day one" framing (file 10 §10.4) | `git diff HEAD -- docs/research-design.md` |
| 2026-11-04 | New three-metric pilot executed, reusing the same 5 worlds/3 slices as the 2026-10-27 pilot | `three-metric-pilot-report.json` timestamp |
| 2026-11-05 | `protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md` drafted (unapplied) | File timestamp |

**Decisions made before vs. after observing outcomes:** the choice to run a *new* three-metric pilot reusing the *same* worlds as the already-examined 2026-10-27 pilot was made **after** the K(T)-based results (including the S4-GF direction) were already known — this is a sequential, outcome-aware re-analysis of related data, not a blind replication. This does not invalidate the new pilot's arithmetic, but it does mean its results cannot be treated as an independent confirmation of anything found in the first pilot (file 10 §10.6).

## Key protocol structure (as actually registered)

- Four tracks of inference distinguished in the protocol: "A — estimation" (does the estimator know where the learner is? — primary: held-out log loss; secondary: latent-recovery MAE) and "B — sequencing" (does the policy move the learner? — primary: final true mastery K(T)).
- Negative control: S1 is required to produce identical K(T) across all policies, since S1 has no learning dynamic — an implementation check, not a scientific hypothesis test (line 881).
- Non-inferiority margins are explicitly pre-specified (D1, line 63): 0.010 nats/response for log loss, 0.030 probability units for latent-recovery MAE — i.e., the protocol anticipated needing a tolerance band for "no meaningfully worse" claims, not just point-estimate comparison.
- Required-world-count table (B9.2, referenced by the pilot's own `requiredWNote` field) specifies 20-92 worlds depending on family/estimand — the existing pilot's 5 worlds is explicitly, self-disclosed as far below this (`pilot_descriptive_stats.json`'s own `requiredWNote` field, read directly: *"Every t-test below has df=4 and is reported for transparency and direction/magnitude only."*).

## Pilot vs. confirmatory, as distinguished in the artifacts themselves

Both pilot JSON artifacts carry a `_label` field reading, verbatim: *"EXPLORATORY / PILOT-SCALE / UNDERPOWERED — NOT a confirmatory analysis."* This self-labeling is read directly from the files, not asserted by this audit or any prior stage's narrative — it is baked into the data itself.
