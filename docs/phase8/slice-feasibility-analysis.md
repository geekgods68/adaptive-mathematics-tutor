# C7.1 Slice-Feasibility Analysis

Read-only investigation of the C7.1/B5.1 slice-eligibility shortfall
reported after the first Phase 8B session (2 eligible chapters found
against RISE_CONCEPTS/RISE_QUESTIONS, below the 3 Track A/B requires).
**Nothing in the repository was modified to produce this document** —
no source file, question-bank file, config file, or protocol file was
touched. All numbers come from a throwaway analysis script (imported
only `RISE_CONCEPTS`, `RISE_QUESTIONS`, and the already-committed,
unmodified `effectiveConceptWeights` helper from
`src/research/phase8/slices/selectSlices.ts`), run against the current
repository state, then deleted. The complete structured results are at
[`c7-slice-feasibility-analysis.json`](c7-slice-feasibility-analysis.json)
in this same directory; this document is the narrative reading of it.

**No slice was selected based on anticipated model performance.**
Every number below is structural (prerequisite-graph shape) or
curricular/coverage-based (question counts per concept). Nothing here
runs a simulator, an estimator, or a selection policy.

## 1. Diagnosis: why only 2 chapters are eligible

### 1.1 Bank-wide coverage context

Across all 109 RISE concepts: single-concept-item coverage SC(k) has
**minimum 6, median 18, maximum 20**; all-items coverage AC(k) has
**minimum 10, median 18, maximum 28**. **37 of 109 concepts (34%)**
fall below the SC(k) ≥ 16 bar the protocol requires for every target
concept; only **1 concept bank-wide** falls below 8 (the external-
prerequisite bar). The bank is not sparse overall (healthy median of
18) — a specific, identifiable minority of concepts were authored with
noticeably fewer items than the rest, and it is exactly these concepts
that sit inside 12 of the 14 chapters' target sets.

### 1.2 Per-chapter table

| Chapter | \|T_c\| | SC min/med/max | AC min/med/max | Internal edges | \|X_c\| (base) | Base-rule eligible? | Fails by |
|---|---|---|---|---|---|---|---|
| CH01 | 12 | 6 / 11.5 / 16 | 11 / 12 / 21 | 15 | 0 | No | \|X_c\|=0 outside [2,10]; targetsWithExternal=0 < 6; minSC(target)=6 < 16 |
| CH02 | 8 | 10 / 14 / 19 | 15 / 19 / 25 | 7 | 9 | No | minSC(target)=10 < 16; minSC(external)=6 < 8 |
| **CH03** | 5 | 17 / 19 / 20 | 20 / 20 / 23 | 4 | 6 | **Yes** | — |
| **CH04** | 5 | 18 / 20 / 20 | 20 / 20 / 22 | 4 | 16 | No (base/relax a); Yes (relax b) | \|X_c\|=16 outside [2,10] at base and relax (a); passes once relaxation (b) drops the \|X_c\|≤10 ceiling |
| CH05 | 10 | 9 / 13 / 20 | 10 / 15 / 28 | 11 | 27 | No | \|X_c\|=27 outside [2,10]; minSC(target)=9 < 16; minSC(external)=6 < 8 |
| CH06 | 8 | 12 / 18 / 20 | 12 / 18.5 / 20 | 8 | 29 | No | \|X_c\|=29 outside [2,10]; minSC(target)=12 < 16; minSC(external)=6 < 8 |
| CH07 | 9 | 10 / 18 / 20 | 10 / 18 / 22 | 12 | 11 | No | \|X_c\|=11 outside [2,10]; minSC(target)=10 < 16 |
| CH08 | 8 | 14 / 20 / 20 | 14 / 20 / 20 | 8 | 17 | No | \|X_c\|=17 outside [2,10]; minSC(target)=14 < 16 |
| CH09 | 7 | 12 / 18 / 20 | 12 / 18 / 20 | 9 | 15 | No | \|X_c\|=15 outside [2,10]; minSC(target)=12 < 16; minSC(external)=6 < 8 |
| CH10 | 8 | 14 / 18 / 20 | 14 / 18 / 20 | 8 | 8 | No | minSC(target)=14 < 16 |
| CH11 | 8 | 12 / 18 / 20 | 12 / 18 / 20 | 9 | 18 | No | \|X_c\|=18 outside [2,10]; minSC(target)=12 < 16 |
| CH12 | 8 | 10 / 17 / 20 | 10 / 17 / 20 | 12 | 2 | No | minSC(target)=10 < 16 |
| CH13 | 6 | 12 / 16 / 20 | 12 / 16.5 / 21 | 6 | 6 | No | minSC(target)=12 < 16 |
| CH14 | 7 | 14 / 20 / 20 | 14 / 20 / 20 | 7 | 20 | No | \|X_c\|=20 outside [2,10]; minSC(target)=14 < 16 |

(Full per-concept SC/AC breakdown for every chapter is in the JSON
file, key `part1_perChapterDiagnosis[].perConceptSC` /
`.perConceptAC`.)

### 1.3 Pattern

In **11 of the 14 chapters** (CH02, CH05–CH14 excluding CH03/CH04), the
*sole surviving* blocking criterion after every C7.1 relaxation
(a)→(b)→(c) is **`minSC(target) < 16`** — one to six under-authored
concepts inside an otherwise well-covered chapter (§1.1's 37 globally
under-covered concepts are concentrated here). **CH01 is blocked on two
independent grounds at once**: it has `|X_c| = 0` (no reachable
external prerequisite at all within 5 hops — a structural fact about
this chapter, not reducible by any relaxation, since even relaxation
(b)'s loosened "≥1" floor needs at least one such concept to exist) in
addition to `minSC(target) = 6`, so CH01 could not become eligible
through a coverage fix alone. The chapter's *total* `Q_slice` size is
never the problem for any of the 14 (all clear 120 easily, up to 615);
it is specifically the *minimum per-concept* count, because the
eligibility rule is a floor over every target, not an average. A
secondary, independent `|X_c|` problem (outside `[2, 10]` under the
base rule) also appears in CH05, CH06, CH07, CH08, CH09, CH11, CH14 —
but C7.1's own relaxation (b) already resolves that one on its own for
all of them; it is `minSC(target)` that
survives through every relaxation level because none of (a)/(b)/(c)
targets it directly except (c)'s switch to all-items counting, which
only helps when a concept's shortfall is *specifically* in single-
concept items it also has from multi-concept items — not the case
here (SC(k) = AC(k) for essentially every bottleneck concept found,
confirmed in the JSON: CH08/CH10/CH14's bottleneck concepts have zero
multi-concept items at all).

## 2. Alternative designs

### A. Original three-slice design under existing C7.1 rules

As reported: **2 eligible (CH03, CH04)**, even after relaxation (c).
This is the baseline this analysis was asked to improve on.

### B. Concept-subgraph slices within existing chapters

Idea: instead of requiring `T_c` = *every* concept in a chapter, allow
`T_c` = the chapter's concepts that individually clear `SC(k) ≥ 16`,
dropping only the specific under-covered ones, then re-check the
**original, non-relaxed** eligibility rule (`|T_c|` 5–12, ≥3 internal
edges, `2 ≤ |X_c| ≤ 10`, ≥⌈|T_c|/2⌉ targets with an external
prerequisite, `SC(target) ≥ 16`, `SC(external) ≥ 8`, `|Q_slice| ≥ 120`)
against that smaller, well-covered target set.

**Result: 4 chapters become eligible under the ORIGINAL (unrelaxed) thresholds** — no protocol number changes, only which concepts count as "the chapter's targets":

| Chapter | Original \|T_c\| | Subgraph \|T_c\| | Dropped concepts | \|X_c\| | Q_slice | Eligible (original thresholds) |
|---|---|---|---|---|---|---|
| CH03 | 5 | 5 | none | 6 | 176 | Yes |
| CH07 | 9 | 7 | GEO07, GEO09 | 8 | 244 | Yes |
| CH10 | 8 | 7 | PRO08 | 5 | 203 | Yes |
| CH12 | 8 | 5 | PRF01, PRF04, PRF08 | 3 | 129 | Yes |

Ranked by the protocol's own tie-break rule (internal edges + edges
from external into targets, descending): **CH07 (14) > CH03 (10) =
CH10 (10, CH03 wins the chapterId tie-break) > CH12 (8)**. The
top-3-by-score reading is **CH07, CH03, CH10**, with CH12 as a fourth
option in reserve — CH12 is also the most aggressive drop (3 of 8
concepts, 37.5%, versus CH07's 2/9 and CH10's 1/8), which is a reason
to prefer the other three if a choice must be made.

Design B does not change any protocol threshold. It changes the
**definition of `T_c`** from "every concept whose `chapterId` matches"
to "every sufficiently-evidenced concept whose `chapterId` matches" —
a scope decision about what counts as a chapter's target set, not a
sample-size or margin change.

### C. Alternative chapter groupings (merging adjacent chapters)

Computed for all 13 adjacent chapter pairs (CH01+CH02, CH02+CH03, …,
CH13+CH14) under the literal curriculum ordering — "adjacent" was
read as consecutive `chapterId`s, the only grouping neutral with
respect to any pedagogical judgement this analysis would otherwise
have to make unilaterally.

**Result: no new eligible unit.** The only pair that passes relaxation
(c) is CH03+CH04 — the union of the two chapters already independently
eligible — and it has **zero concealed under-coverage** (every member
concept already clears 16+ on its own). Every other pair fails, and
**every failing pair has between 2 and 16 concepts below SC(k)=16**
(full counts in the JSON, `part2C_chapterGroupings[].undercoveredConceptIds`)
— confirming the requested check explicitly: merging never "hides" an
under-covered target, because SC(k) is evaluated per concept, and a
merged `T_c` still contains every original member concept with its own
unchanged SC(k). **Design C does not produce a third slice.**

### D. SC(k) threshold sensitivity (16 / 14 / 12 / 10)

External threshold scaled with the same 16∶8 = 2∶1 ratio the protocol
itself uses (8, 7, 6, 5 respectively), all-items counting (relaxation
c's method) held fixed:

| SC(target) threshold | SC(external) threshold | Eligible chapters | Count | Evidence retained vs. baseline |
|---|---|---|---|---|
| 16 (original) | 8 | CH03, CH04 | 2 | 100% |
| 14 | 7 | CH03, CH04, CH08, CH10, CH14 | 5 | 87.5% (2 fewer guaranteed observations/concept) |
| 12 | 6 | CH02, CH03, CH04, CH06, CH08, CH09, CH10, CH11, CH13, CH14 | 10 | 75% (4 fewer) |
| 10 | 5 | 13 of 14 chapters (all but CH01) | 13 | 62.5% (6 fewer) |

A **two-point drop (16→14)** is already sufficient to reach 5 eligible
chapters, comfortably above 3, while keeping 87.5% of the original
per-concept evidence floor. This is the smallest threshold change that
resolves the shortfall, if the author is willing to amend D4-adjacent
protocol numbers (SC(k) is not literally one of D1–D6, but changing it
is the same *class* of decision C13 reserves for the author: "any
change to a ... sample size").

### E. Minimum additional validated questions needed

Per-chapter total shortfall (single-concept items needed, summed
across every under-covered target concept in that chapter, to bring
each one up to SC(k)=16), for the 12 currently-ineligible chapters:

| Chapter | Under-covered concepts (count) | Total additional items needed |
|---|---|---|
| CH08 | TRI08 (1) | **2** |
| CH10 | PRO08 (1) | **2** |
| CH14 | CPX07 (1) | **2** |
| CH11 | STA08 (1) | 4 |
| CH06 | INT07, INT08 (2) | 6 |
| CH09 | VEC04, VEC07 (2) | 6 |
| CH13 | CNT05, CNT06 (2) | 5 |
| CH07 | GEO07, GEO09 (2) | 12 |
| CH02 | FUN01, FUN04, FUN05, FUN07, FUN08 (5) | 16 |
| CH12 | PRF01, PRF04, PRF08 (3) | 10 |
| CH05 | DIF01, DIF02, DIF06, DIF08, DIF09, DIF10 (6) | 30 |
| CH01 | 11 of its 12 targets | 57 |

**Minimum path to a 3rd eligible slice: 2 new, independently-verified,
diagnostically-sound single-concept questions**, targeting whichever
single blocking concept in CH08 (TRI08), CH10 (PRO08), or CH14 (CPX07)
is judged easiest to author well — each of these three chapters has
exactly **one** under-covered concept once its other targets, which
already clear 16+, are set aside. Every other chapter needs items on
multiple concepts (CH01 needs 11 of its 12 targets topped up, 57 items
total) and is a materially larger undertaking.

This is "practical" in the sense the question asks (a small, bounded
authoring task), but it is **not free**: hard constraint 10 (this
repository's own CLAUDE.md) requires every new distractor's
`derivationNote` to be independently verified by computation before
being written, and constraint 9 requires `npm run audit:questions`/
`npm test` to stay green afterward — so "2 questions" is a lower bound
on quantity, not on effort or turnaround time, and the new items would
also need the same scrutiny as the original 1,840 before being trusted
as SC(k) evidence.

## 3. Scientific validity of each feasible design

### Design B (concept-subgraph slices: CH07, CH03, CH10)

- **Meaningfully distinct?** Yes — CH03 (exponents), CH07 (geometry),
  CH10 (probability) are three unrelated strands with disjoint target
  concepts and mostly disjoint external-prerequisite sets (shared
  reliance on `ALG01`/`ALG02`-family algebra prerequisites is expected
  and benign — algebra is a foundational prerequisite for nearly
  everything, not evidence of overlap between the slices' own content).
- **Prerequisite graphs still valid?** Yes. Dropping a concept from
  `T_c` does not touch `src/domain/concepts/data.ts` or the RISE
  taxonomy — the full graph (including the dropped concepts' edges) is
  untouched; those concepts simply are not themselves Track A/B
  targets in this slice. No cycle, no referential-integrity change.
- **Adequate diversity for repeated simulated sessions?** Yes — Q_slice
  sizes of 176–244 against a 60-question Track B budget and a ~87–240-
  question Track A history give ample without-replacement room; this
  is the same order of magnitude as CH03/CH04's own accepted sizes.
- **Selection bias / excessive overlap?** The dropped concepts
  (GEO07, GEO09, PRO08) are dropped **because of a bank-authoring gap,
  not because of anything about the concepts' content or difficulty**
  — this is the honest caveat: a slice built this way excludes
  whichever concepts happened to be under-authored, which could
  correlate with concept difficulty or recency of authoring (both
  plausible confounds, undetermined from the data here). This should
  be stated as a limitation if adopted, not hidden.
- **Equal-weight 3-slice aggregation (B8.1) defensible?** Yes,
  structurally unaffected — B8.1 averages over whichever 3 slices are
  used; nothing in the aggregation math assumes a particular selection
  rule for `T_c`.
- **Generalization claims justified?** A claim of "generalizes across
  three distinct mathematical strands" is justified; a claim of
  "generalizes across the full breadth of each chapter's curriculum"
  is **not** — CH07 and CH10 would each be missing 1–2 of their
  chapter's own concepts from the study.

### Design D (lower SC(k) to 14, yielding 5 eligible chapters incl. CH03/CH04 unchanged)

- **Meaningfully distinct?** Yes, and more choice (5 candidates for 3
  slots) than design B.
- **Validity concerns:** every target concept's per-concept evidence
  floor drops from 16 to 14 (a 12.5% reduction) bank-wide, for
  **every** slice chosen under this design, not just the newly-added
  ones — this is a genuine, global weakening of Track A/B's stated
  precision floor, whereas design B leaves the floor at 16 everywhere
  and only narrows *which* concepts are in scope.
- **Equal-weight aggregation:** still structurally fine.
- **Generalization claims:** same caveat as design B, but now
  bank-wide rather than chapter-specific, since the threshold itself
  changed for everyone, not just the marginal chapters.

### Design E (author new questions, no protocol change)

- **Most scientifically conservative** — the original protocol stays
  completely intact, including `T_c` = full chapter.
- **Not available on the timeline this session can affect**: new
  question authoring is a separate, slower workstream (constraints 3,
  9, 10) with its own verification burden; it cannot be done as part
  of "resolve this and continue Phase 8B today."

### Design A (do nothing) / Design C (merge chapters)

Neither produces 3 eligible slices under any sub-variant tested. Not
scientifically viable as stated.

## 4. Recommendation

Ranked by methodological defensibility, implementation complexity, and
impact on the eventual paper:

1. **Design B (concept-subgraph slices: CH07, CH03, CH10, CH12 in
   reserve) — recommended if an amendment is wanted now.** Changes
   **zero** protocol numeric thresholds (no D1–D6-adjacent value
   moves); the only deviation is redefining `T_c` for 2 of the 3
   chosen chapters as "the chapter's well-evidenced concepts" rather
   than "every concept in the chapter," with the dropped concepts
   named and auditable. Implementation complexity is low — it is a
   parameterization of the already-built, already-tested
   `selectSlices` logic (pass a pre-filtered concept list per chapter
   rather than the full chapter), not new algorithmic work. Paper
   impact: one limitation sentence per affected slice ("CH07's slice
   excludes GEO07/GEO09; CH10's excludes PRO08, due to insufficient
   single-concept item coverage at the time of the study").
2. **Design D at threshold 14 — second choice**, if the author prefers
   not to touch `T_c`'s definition and would rather accept a uniform,
   explicit, bank-wide evidence-floor reduction instead. Simpler to
   explain in one sentence ("the per-concept evidence floor was 14,
   not 16, documented as Amendment A1") but weakens every slice's
   precision, not just the marginal ones, and still requires an
   author-approved amendment of the same kind.
3. **Design E — the only path that requires no protocol deviation at
   all**, but is not implementable within this session's scope; worth
   pursuing in parallel for a future, less time-pressured iteration of
   the study, independent of which of 1/2 is chosen now.
4. **Designs A and C — not viable.** Neither reaches 3 slices under
   any variant tested; included here only to document that they were
   checked, per the request.

**Every one of 1–3 requires an author-approved amendment before any
slice work resumes** (C13: "any change to a simulator range, margin,
sample size, metric, family, condition or hypothesis" — redefining
`T_c`'s membership rule and lowering `SC(k)` both fall under "sample
size"/"condition" in spirit, even though neither is literally D1–D6).
**This analysis makes no selection on the author's behalf.** Per the
instructions this analysis was run under, no implementation code,
question-bank data, simulator configuration, protocol parameter, or
git history was modified to produce it, no amendment was written to
`protocol/AMENDMENTS.md`, `protocol/APPROVAL.md` was not touched, and
no further Phase 8B implementation (C7.2 onward) or pilot execution
was started.
