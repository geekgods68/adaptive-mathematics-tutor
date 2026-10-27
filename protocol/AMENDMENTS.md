# Phase 8A Protocol Amendments

Records every deviation from `protocol/phase8-protocol-v2.md`, per that
document's own C13/B10.4 requirement: date, reason, and whether it
preceded confirmatory data. `protocol/APPROVAL.md` does not yet exist;
nothing below is "approved" in the sense of freezing the protocol for
confirmatory runs -- it documents an author-approved implementation
decision made during 8B, before any 8C-Pilot or confirmatory run.

---

## Amendment A1 — Concept-subgraph slice selection (C7.1/B5.1)

**Date:** 2026-10-27. **Preceded confirmatory data:** yes — no
simulation, estimator fit, or Track A/B session of any kind had been
run at the time this amendment was written or approved. **Approved
by:** the author, in response to `docs/phase8/slice-feasibility-analysis.md`.

### 1. The original eligibility failure

C7.1/B5.1's whole-chapter eligibility rule, applied exactly as
specified (including the full relaxation order (a)→(b)→(c)), found
only **2 eligible chapters** (CH03, CH04) against the real RISE
curriculum and question bank (`RISE_CONCEPTS`, `RISE_QUESTIONS`) —
below the 3 slices Track A and Track B require. This is the stop
condition C13 names explicitly: "fewer than three slices qualify even
after all relaxations." Full per-chapter numbers are in
`docs/phase8/preflight-report.md` (initial discovery) and
`docs/phase8/slice-feasibility-analysis.md` (full diagnosis).

### 2. The observed question-bank coverage problem

Across all 109 RISE concepts, single-concept-item coverage SC(k) has
minimum 6, median 18, maximum 20. **37 of 109 concepts (34%)** fall
below the SC(k) ≥ 16 floor the protocol requires for every target
concept; only 1 concept bank-wide falls below the SC(k) ≥ 8 external-
prerequisite floor. The bank is not globally sparse — a specific
minority of concepts were authored with noticeably fewer items than
the rest. In 11 of 14 chapters, one or more such under-covered
concepts is the *sole* reason the whole chapter fails eligibility, even
after all-items counting (relaxation c); the chapter's *total*
`Q_slice` size is never the limiting factor (all 14 chapters clear the
120-question floor, several by 3-5x). Full per-chapter, per-concept
breakdown: `docs/phase8/c7-slice-feasibility-analysis.json`.

### 3. Evaluated alternatives and why Design B was selected

Five designs were evaluated in `docs/phase8/slice-feasibility-analysis.md`
(read-only; no implementation, config, question-bank, or protocol file
was modified to produce it):

| Design | Result | Protocol threshold touched? |
|---|---|---|
| A. Original rule, whole chapters | 2 eligible | — (the failing baseline) |
| **B. Concept-subgraph slices (selected)** | **4 eligible: CH03, CH07, CH10, CH12** | None |
| C. Merge adjacent chapter pairs | No new eligible unit; confirmed no pair conceals under-coverage | — |
| D. Lower SC(k) threshold (16→14/12/10) | 14 → 5 eligible; weakens the evidence floor bank-wide | Yes |
| E. Author new validated questions | 3 chapters need as few as 2 new items each | None, but not implementable on this timeline |

Design B was selected because it is the only option that resolves the
shortfall **without changing any protocol numeric threshold** — SC(k)
stays ≥ 16 for targets and ≥ 8 for external prerequisites, `|T_c|`
stays in [5,12], the internal-edge (≥3), `|X_c|` ([2,10]), and
`|Q_slice|` (≥120) requirements are all exactly as originally
specified. It changes only which concepts count as a chapter's "target
set."

### 4. The revised concept-subgraph eligibility rule

For each chapter, `T_c` is no longer "every concept whose `chapterId`
matches" — it is **"every concept whose `chapterId` matches AND whose
single-concept-item coverage `SC(k) ≥ 16`."** Concepts in the chapter
that fall below this bar are dropped from `T_c` entirely (not treated
as targets, not silently assumed mastered). The *original, non-relaxed*
C7.1 eligibility rule is then checked against this narrowed `T_c`:
`5 ≤ |T_c| ≤ 12`, ≥3 internal prerequisite edges, `2 ≤ |X_c| ≤ 10`,
≥⌈|T_c|/2⌉ targets with an external prerequisite within 5 hops,
`SC(target) ≥ 16` (satisfied by construction for the retained set),
`SC(external) ≥ 8`, `|Q_slice| ≥ 120`. No relaxation level is needed or
used under this rule — it is checked once, at the original thresholds.

Implemented in `src/research/phase8/slices/selectSlices.ts` as
`selectConceptSubgraphSlices`, sharing its eligibility/ranking
machinery with the original `selectSlices` (which remains in the file,
unmodified in behavior, as the documented original-design reference —
confirmed by its own pre-existing 7-test suite still passing unchanged
after the refactor that extracted the shared logic).

### 5. Deterministic slice/reserve selection method

1. For every chapter, compute the retained (well-evidenced) target set
   as above.
2. Evaluate the original eligibility rule against each chapter's
   retained set.
3. Rank every eligible chapter by (internal edges + edges from external
   prerequisites into targets), descending; ties broken by `chapterId`
   ascending — the protocol's own pre-existing tie-break rule (C7.1),
   reused unchanged.
4. The top 3 ranked chapters are the primary slices; the 4th (if any)
   is the predefined reserve.

Applied to the real bank (2026-10-27 snapshot): **CH07 (score 14) >
CH03 (score 10) = CH10 (score 10, CH03 wins the chapterId tie-break) >
CH12 (score 8)**. Primary: **CH07, CH03, CH10**. Reserve: **CH12**.
Nothing about this ranking was chosen by hand — it is the direct,
reproducible output of `selectConceptSubgraphSlices(RISE_CONCEPTS,
RISE_QUESTIONS)`, pinned by a regression test
(`tests/research/phase8/selectConceptSubgraphSlices.test.ts`) that
fails if the bank or curriculum ever changes this outcome.

**Every input to this method is pre-experimental**: curriculum
structure (`prerequisiteIds`, `chapterId`, `curriculumLevel`) and
question-bank structure (`conceptWeights`/`primaryConceptId`,
item counts). No estimator, selection policy, simulated learner, or
any other outcome-bearing computation was run before or during this
selection.

### 6. Implications

**Internal validity.** Unaffected for the retained concepts — the
eligibility thresholds that bound internal validity (coverage,
prerequisite structure, pool size) are the ORIGINAL, unrelaxed ones for
every slice. The one new, honestly-disclosed caveat: *why* a given
concept is excluded is an artifact of bank authoring effort, not of
anything about the concept's content or difficulty, and this could
correlate with difficulty or recency of authoring in a way this data
cannot rule out. This should be stated as a named limitation in the
eventual paper for CH07 and CH10 (CH12 if used).

**Reproducibility.** Fully preserved — the selection is a pure
function of `RISE_CONCEPTS`/`RISE_QUESTIONS` (confirmed by a
determinism test: identical inputs produce identical output across
repeated calls), requires no RNG, and is independently re-derivable by
anyone re-running `selectConceptSubgraphSlices` against the same
question-bank/curriculum snapshot (pinned by `data/question-bank/MANIFEST.json`'s
existing content hashes, unaffected by this amendment).

**Generalizability.** A claim of "generalizes across three distinct
mathematical strands (exponents, geometry, probability)" is justified.
A claim of "generalizes across the full breadth of each chapter's own
curriculum" is **not** — CH07 excludes 2 of its 9 concepts (GEO07,
GEO09) and CH10 excludes 1 of its 8 (PRO08) from the study entirely.

**Inter-slice question overlap (discovered during validation, reported
here for completeness).** CH07/CH03/CH10/CH12's `Q_slice` pools share
12-93 questions pairwise (10-38% of the smaller pool in each pair),
because all four slices reach into a common pool of foundational
algebra prerequisites (`ALG01`-`ALG05`) as external concepts. This is
**not new to this amendment** — checked against the *original*
whole-chapter CH03/CH04 pair, CH03's entire 183-question `Q_slice` is
already a strict subset of CH04's 354-question `Q_slice` (100%
overlap), for the identical reason. Nothing in B5.1/B6.1 requires
`Q_slice` sets to be disjoint across slices, and each slice runs its
own fully independent Track A/B analysis (separate worlds, separate
schedules) — a shared item in two slices' pools does not let
information flow between those slices' results, since no single
Track A/B run ever draws from more than one slice's pool. This is
flagged as a pre-existing structural property of the protocol's slice
design (present under Design A too, more severely), not a defect
introduced by Design B, and not a reason to treat either design as
producing "leakage" between experimental conditions within a slice
(all four Tier 1 policies C0-C3 still draw from the *same* `Q_slice`
pool within a given slice, which is what B6.4's validity audit
actually requires).

### 7. Confirmation: no simulation results influenced this decision

Confirmed. At the time this amendment was written and approved, no
simulator family (S1-S4) had generated a single learner, no estimator
(Det, BKT, RunProp, EMA, B0) had been fit or run on any simulated or
real response, and no Track A/B session had been executed. The only
code exercised was `selectSlices`/`selectConceptSubgraphSlices`
themselves (structural/curricular computation) and the pre-existing,
unmodified `effectiveConceptWeights` helper. `git log` and the test
suite at the time of this amendment confirm no `research-output/`
artifact existed.
