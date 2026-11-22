# Research decisions

A log of significant, hard-to-reverse decisions made while building this
repository, in the same spirit as the sibling `adaptive-math-tutor`
repo's `docs/research-decisions.md` (this project's architecture
explicitly aims to share as much as possible between the two
conditions — see `CLAUDE.md`'s "Shared infrastructure" section). Each
entry: Date / Decision / Motivation / Alternatives considered /
Consequences / Status.

---

### RD-0001

**Date:** 2026-10-23

**Decision:** Integrated a large, externally-generated "RISE Adaptive
Mathematics Tutor" question bank (1,840 questions, 109 concepts, 68
misconceptions, 14 chapters) as a **separate, parallel dataset**
(`src/domain/rise/`, exporting `RISE_QUESTIONS`/`RISE_CONCEPTS`/
`RISE_MISCONCEPTIONS`), rather than merging it into the existing
`QUESTIONS`/`CONCEPTS`/`MISCONCEPTIONS` exports that the original
161-question, 9-strand, quadratics-only Phase 0-3 bank uses.

**Motivation:** Several existing tests assert tight size ranges
calibrated specifically to the original hand-curated bank — e.g.
`MISCONCEPTIONS.length` between 20 and 40, `CONCEPTS.length` between 20
and 40, `QUESTIONS.length` between 140 and 170
(`tests/domain/misconceptionTaxonomy.test.ts`,
`tests/domain/conceptGraph.test.ts`,
`tests/domain/questionBank/bankIntegrity.test.ts`). Merging the RISE
data (109 + 68 + 1,840 additional records) would blow every one of these
ranges, forcing either (a) widening them — functionally weakening
sanity checks this project's own conventions explicitly forbid
weakening — or (b) leaving them failing. Keeping the two datasets
separate avoids the dilemma entirely: every existing test continues to
assert exactly what it always asserted, about exactly the dataset it was
written for.

This also matches a structural reality: the original bank is a complete,
locked Phase 3 artifact (`NON_ADAPTIVE_STUDY_SEQUENCE` is a fixed
35-question sequence already wired into the running `/tutor` session);
the RISE bank is a much larger, not-yet-reviewed, broader-curriculum
dataset intended as the foundation for a future phase. Conflating them
into one array would blur that distinction without any present benefit —
nothing today needs them unioned, since `NON_ADAPTIVE_STUDY_SEQUENCE`
references fixed ids from the original bank only, by design.

**Alternatives considered:** (a) Merge everything into `QUESTIONS`/
`CONCEPTS`/`MISCONCEPTIONS` and widen the range-bound tests — rejected,
see Motivation. (b) Keep the RISE data purely as CSVs with no TypeScript
integration at all — rejected, since the integration brief explicitly
asked for it to be usable by the application's existing type system,
grading, and (eventually) session/selection code, which requires real
`Question`/`Concept`/`Misconception` objects, not just files sitting in
`data/`. (c) Generate a large committed TypeScript literal (mirroring how
the original bank's `src/domain/questions/bank/*.ts` files are authored)
— rejected in favor of loading directly from the canonical CSV at
module-init time (see RD-0002): the data already exists in a clean,
externally-validated CSV form, and transcribing ~1,840 richly-detailed
records into TS literals would create a second copy of the same content
with no real benefit and a real risk of transcription drift.

**Consequences:** `ALL_QUESTIONS` (`src/domain/rise/index.ts`) is
provided as a convenience union for future code that genuinely wants
both banks together; nothing existing uses it. `ConceptStrand`
(`src/domain/concepts/types.ts`) gained 14 new union members
(`ch01_algebra` .. `ch14_complex_numbers`) — purely additive, verified
safe since nothing in the codebase switches on this type exhaustively.
`Question` and `Concept` gained several new optional fields
(`chapterId`, `conceptWeights`, `prerequisiteConceptIds`, `questionType`
on `Question`; `chapterId`, `curriculumLevel` on `Concept`) — all
optional, so the original 161 questions and 35 concepts remain valid
without any changes to their own data.

**Status:** Frozen.

---

### RD-0002

**Date:** 2026-10-23

**Decision:** The RISE question bank is loaded from its canonical CSV
files (`data/question-bank/*.csv`) at module-init time via a hand-rolled
RFC 4180 parser (`src/domain/rise/csvParser.ts`), rather than converted
once into a committed TypeScript data file.

**Motivation:** The canonical CSVs are already the externally-validated
source of truth (see `data/question-bank/README.md` and `MANIFEST.json`
for the compatibility checks run before integration: every concept/
misconception id referenced by a question resolves in the taxonomy and
vice versa, the 204-edge prerequisite graph is acyclic with no self-
dependencies or duplicate edges). Reading them directly means there is
exactly one place this content is authored — a transcription step would
create a second, divergence-prone copy for no benefit, since Node's
module caching already means the CSV is parsed exactly once per server
process (functionally equivalent to "build time" for this app).

**Alternatives considered:** A real npm CSV-parsing dependency (e.g.
`csv-parse`) — rejected in favor of a small hand-rolled parser, matching
this codebase's existing "plain TypeScript over a dependency" preference
(see `validateDomainModel.ts`'s own stated rationale for the same
choice); the format in use (comma-delimited, `"`-quoted, `""`-escaped) is
simple enough that a ~90-line parser is more auditable than a dependency.
Verified against the real 1,840-row file with zero parse failures across
every JSON-nested cell before being trusted (see
`tests/domain/rise/riseImportIntegrity.test.ts`).

**Consequences:** `src/domain/rise/loadQuestions.ts` and
`loadCurriculum.ts` call Node's `fs.readFileSync` at module scope — this
works in this app's server-side/build context (confirmed via `npm run
build`) but would not work if any of this code were ever imported into a
Client Component; none of it currently is.

**Status:** Frozen.

---

### RD-0003

**Date:** 2026-10-23

**Decision:** Implemented a deterministic, per-concept mastery-update
formula in `src/domain/learner-model/` as the Phase 3 learner model,
using a researcher-supplied formula and parameter set ported faithfully
from the sibling `adaptive-math-tutor-v1.0` repo's `MasteryPolicy`
(`src/domain/students/mastery-policy.ts`) and `mastery-engine.ts`, and
extended with an explicit, approved multi-concept attribution rule.

**The formula (as approved, not independently invented):**

```
Correct:   M_new = M_old + α(1 − M_old)·w_d·w_h
Incorrect: M_new = M_old − β·M_old·w_d
```

clamped to `[0, 1]` after every update. Parameters
(`src/domain/learner-model/parameters.ts`,
`DEFAULT_MODEL_PARAMETERS`, version `deterministic-mastery-v1`):
`α (correctGainRate) = 0.12`, `β (incorrectLossRate) = 0.10`,
`w_h (hintGainMultiplier) = 0.6` (applied only when `correct && usedHint`
— a hint never affects an incorrect response), difficulty weights
`w_d`: L1=0.8, L2=0.9, L3=1.0, L4=1.1, L5=1.2 (identical for both
branches — see the unresolved question below), initial mastery
`M_0 = 0.5`.

**Multi-concept attribution rule (the extension this repo added, not
present in the single-concept sibling formula):** for a question whose
`conceptWeights` map assigns weight `w_c` to concept `c`, that concept's
delta is `unweightedDelta(c) × w_c`, where `unweightedDelta` is computed
from that concept's own prior mastery exactly as in the single-concept
formula above. At `w_c = 1` this is byte-identical to the single-concept
formula (verified in
`tests/domain/learnerModel/multiConceptAndState.test.ts`). Each
concept's state updates independently from its own prior state — there
is no cross-concept averaging or shared term.

**Critical examination performed before implementation (per explicit
instruction):**
- **Boundedness:** mostly self-enforcing in the single-concept case —
  the correct branch's `(1 − M_old)` factor and the incorrect branch's
  `M_old` factor both shrink to 0 at the relevant boundary, so the clamp
  is a safety net against parameter misconfiguration (verified by the
  "extreme permitted parameter values" tests) rather than something the
  default parameters rely on to stay in range during normal operation.
- **Asymptotic behavior:** repeated identical responses converge
  geometrically toward 1 (all-correct) or 0 (all-incorrect), never
  reaching the bound exactly except at the clamp.
- **Path dependence:** an alternating correct/incorrect sequence does
  not return to its starting value (verified explicitly as a documented,
  expected property, not a bug, in `updateMastery.test.ts`) — because the
  gain term shrinks as mastery rises while the loss term shrinks as
  mastery falls, a "correct then incorrect" and "incorrect then correct"
  sequence from the same start produce different end states.
- **Difficulty-direction question (explicitly asked by the researcher):**
  "should increasing difficulty increase the magnitude of both positive
  and negative updates?" The current approved formula applies `w_d`
  symmetrically — a harder question produces both a larger gain when
  answered correctly AND a larger penalty when answered incorrectly.
  **This symmetry is questionable and is flagged here as an open
  question, per instruction not to implement unapproved substantive
  changes:** failing an *easy* question is arguably *stronger* evidence
  of a gap (a learner who has the concept should rarely miss an easy
  item), while failing a *hard* question is weaker evidence (even a
  learner with real mastery may miss hard items) — the opposite of what
  symmetric weighting produces. A plausible refinement would invert the
  incorrect branch's difficulty weighting (e.g. use `1/w_d` or a
  separately calibrated set of penalty weights decreasing with
  difficulty). **This refinement is NOT implemented.** The formula above
  is implemented exactly as specified, with this concern documented for
  a future decision rather than acted on unilaterally.

**Motivation:** The task explicitly provided this formula as "our
researcher-defined heuristic, not an established or empirically
calibrated knowledge-tracing formula," with an explicit instruction not
to replace it with BKT/IRT/Elo and not to implement substantive changes
without approval. Faithfully porting the sibling repo's already-reviewed
formula (rather than inventing a new one) also maximizes architectural
sharing between the adaptive and non-adaptive conditions per `CLAUDE.md`'s
"Shared infrastructure" principle.

**Alternatives considered:** (a) Invert or otherwise asymmetrize the
difficulty weighting on the incorrect branch — rejected for this phase
per the explicit "do not implement substantive formula changes without
approval" instruction; documented above instead. (b) Average concept
deltas across a multi-concept question's weights instead of scaling each
concept's own independently-computed delta — rejected because it would
make one concept's update depend on another concept's prior mastery,
contradicting "independent concept states" (explicitly required and
tested). (c) Auto-propagate some credit to prerequisite concepts on a
correct response — explicitly forbidden by the task brief; not
implemented (`applyResponseEvidence` only ever touches concepts named in
a question's own `conceptWeights`, verified by a dedicated test showing a
prerequisite's state is left byte-identical/untouched).

**Consequences:** Every mastery update produces a full
`MasteryUpdateTrace` (`src/domain/learner-model/types.ts`) whose
`explanation` string is generated from the same `termsComputed` object
used to compute `newMastery`, so it cannot describe anything other than
what was actually calculated. A `MasteryEstimator<TState>` interface
(`src/domain/learner-model/estimatorInterface.ts`) wraps this formula so
a future estimator (e.g. BKT) can be compared against it through the same
contract without either implementation needing to know the other's
internals — no second estimator is implemented in this phase.

**Status:** Approved and implemented as specified. The difficulty-
direction question on the incorrect branch is an explicitly unresolved
design question, not a defect — any change to it requires separate
approval before implementation.

---

### RD-0004

**Date:** 2026-10-23

**Decision:** Resolved RD-0003's open difficulty-direction question by
implementing BOTH weightings as explicit, separately-versioned,
configurable variants, rather than picking one and discarding the other.
`ModelParameters` gained a required `incorrectDifficultyWeighting:
"multiplicative" | "inverse"` field
(`src/domain/learner-model/types.ts`). The correct-response formula is
unchanged and identical under both variants.

- **Variant A** (`DEFAULT_MODEL_PARAMETERS`, version
  `deterministic-mastery-v1`, `incorrectDifficultyWeighting:
  "multiplicative"`): `M_new = M_old − β·M_old·w_d` — the original RD-0003
  baseline, frozen, byte-identical behavior preserved (verified by a
  dedicated regression test re-running the original 6-step worked example
  through the refactored code).
- **Variant B** (`DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY`, version
  `deterministic-mastery-v2-inverse-difficulty`,
  `incorrectDifficultyWeighting: "inverse"`): `M_new = M_old −
  β·M_old·(1/w_d)`. Identical to Variant A in every other parameter.

**Comparison performed (the ten points requested):**
1. **Bounds/stability:** both variants stay within `[0,1]` under the
   configured weight table without relying on the clamp in ordinary
   operation; `1/w_d` ranges `[0.833, 1.25]` over L1-L5 (vs. `w_d` itself
   ranging `[0.8, 1.2]`), so Variant B's per-step penalty magnitude is of
   the same order as Variant A's, not qualitatively different. A stability
   guard was added: if `incorrectDifficultyWeighting` is `"inverse"` and a
   configured `difficultyWeights` entry is exactly `0`, `updateMastery`
   throws rather than silently producing `Infinity`/`NaN` (the
   multiplicative variant has no such failure mode — a `0` weight there
   just zeroes the penalty, which is well-defined).
2. **Monotonicity in mastery:** unchanged by this decision — both variants
   keep the existing property that the penalty magnitude shrinks as
   `M_old → 0` (the `M_old` factor), independent of which difficulty
   weighting is used.
3. **Monotonicity in difficulty:** Variant A's incorrect-branch penalty is
   increasing in difficulty (matches its gain branch's direction);
   Variant B's is decreasing in difficulty — this is the entire point of
   the variant.
4. **Behavior near mastery 0 and 1:** identical between variants (governed
   by the shared `gapOrCurrentTerm`, not by `w_d`); both still reach the
   boundary only asymptotically before the clamp.
5-7. **Repeated correct / repeated incorrect / alternating sequences:**
   both variants preserve strict monotonic improvement under all-correct
   and all-incorrect runs, and both preserve path-dependence under
   alternating sequences (verified by the existing `updateMastery.test.ts`
   suite, which exercises both variants' shared correct-branch code and,
   separately, `difficultyVariants.test.ts`, which exercises the
   diverging incorrect branch under both variants at every difficulty
   level with exact expected values).
8. **Across the five difficulty levels:** tabulated and tested exactly —
   Variant A: w_d = 0.8/0.9/1.0/1.1/1.2; Variant B: 1/w_d ≈
   1.25/1.111/1.0/0.909/0.833.
9. **Sensitivity to α, β, M₀:** unaffected by this change — both rates and
   the cold-start value are shared, untouched parameters; sensitivity to
   them is identical in kind under both variants (only the difficulty
   multiplier on the incorrect branch differs).
10. **Interpretability / educational assumptions:** Variant A assumes "a
    harder question is more diagnostic evidence in both directions."
    Variant B assumes "an easy-question failure is stronger evidence of a
    genuine gap than a hard-question failure, while a hard-question
    success remains stronger evidence of genuine mastery than an
    easy-question success" — i.e. evidence strength is NOT assumed
    symmetric between the two response outcomes. Neither assumption is
    empirically validated here; both are plausible, differently-motivated
    heuristics.

**Motivation:** The task instructions explicitly required investigating
whether symmetric difficulty weighting is defensible (already flagged as
an open question in RD-0003) and, this time, explicitly authorized
implementing the inverse alternative as a second variant — provided both
are preserved rather than one silently replacing the other, so that
Variant A's historical behavior is never silently changed for any
existing caller.

**Alternatives considered:** (a) Replace Variant A outright with the
inverse formula — rejected; the instructions explicitly required
preserving the original baseline's behavior unchanged. (b) Make the
weighting mode an ad hoc boolean or a second difficulty-weight table
authored independently per branch — rejected in favor of a single shared
`difficultyWeights` table plus a mode flag (`incorrectDifficultyWeighting`),
since the two variants are meant to be "the same weights applied two
different ways," not two independently-calibrated tables; this also keeps
the five-level table as the one place difficulty weights are authored.
(c) Default `updateMastery`'s own parameterless call to Variant B —
rejected, to avoid silently changing the behavior of any code that calls
`updateMastery`/`createInitialConceptState` without passing `parameters`
explicitly; `DEFAULT_MODEL_PARAMETERS` (Variant A) remains that default.

**Consequences:** `MasteryUpdateTrace.termsComputed` gained a
`difficultyFactorApplied` field distinct from `difficultyWeight`, so a
trace always shows both the raw w_d table value and the factor actually
multiplied into the delta (these diverge only for an incorrect update
under Variant B). `trace.parameters.incorrectDifficultyWeighting` and
`trace.modelVersion` together identify which variant produced any given
trace. Variant B (`DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY`) is
adopted as the **provisional default for Phase 4 development** — a
research-design choice, not a claim of empirical superiority — meaning
Phase 4 code that needs to pick a default `ModelParameters` should prefer
this export, while anything touching the frozen Phase 3 baseline
continues to use `DEFAULT_MODEL_PARAMETERS` (Variant A).

**Status:** Both variants implemented, tested (18 new tests in
`tests/domain/learnerModel/difficultyVariants.test.ts`, covering exact
per-difficulty-level values, bounds, determinism, multi-concept scaling,
trace reconstruction, and the stability guard), and green against the
full existing suite (335/335 tests, typecheck, lint, both audits — see
the 2026-10-23 Phase 3 refinement entry in `docs/development-log.md`).
Frozen as two parallel, explicitly-versioned baselines; no further
mathematical change to either is in scope without a new decision record.

---

### RD-0005

**Date:** 2026-10-23

**Decision:** Built the Phase 4 deterministic, prerequisite-aware
adaptive question-selection engine
(`src/tutoring/selection/adaptive/{config,types,targeting,
candidateSelection,adaptiveSelectionPolicy,index}.ts`) directly in this
repository, replacing the throwing `AdaptiveSelectionPolicy` skeleton
with a real implementation. This required first amending `CLAUDE.md`,
which until this date stated this repository would never build the
adaptive condition's selection logic — see the "Phase 4 scope conflict"
entry in `docs/development-log.md` for why that came up as a decision
point rather than being treated as routine, and `CLAUDE.md`'s "This is a
research experiment, not a product" section for the resulting amendment.
Only the selection ENGINE moved here; the adaptive condition's own
participant-facing session/UI remains in the sibling `adaptive-math-tutor`
repository, per the unchanged "Shared infrastructure" boundary.

**Architecture:**
- `config.ts` — `AdaptiveSelectionConfig`, a single versioned object
  holding every researcher-defined threshold (`masteryProgressionThreshold
  = 0.75`, `masteryRemediationThreshold = 0.35`, `minEvidenceCount = 3`,
  `consecutiveIncorrectRemediationThreshold = 2`,
  `maxPrerequisiteBacktrackDepth = 5`, a 5-band mastery→difficulty table,
  `diagnosticDifficultyForLowEvidence = 2`,
  `maxConsecutiveSameDifficulty = 3`, `questionFamilyRepetitionLimit = 1`,
  `misconceptionEvidenceMinCount = 2`). None of these are empirically
  calibrated — they are starting points, explicitly not optimised against
  any evaluation dataset, exportable wholesale for future ablations (B7,
  B12).
- `targeting.ts` — pure functions deciding WHAT to target next:
  `isConceptMastered` / `findProgressionFrontier` (first not-yet-mastered
  concept in curriculum order; the LAST concept once everything is
  mastered, never `null`, except for an empty curriculum), and
  `findRemediationTarget` (bounded breadth-first search over DIRECT
  `prerequisiteIds` edges, closest-first, looking for a prerequisite with
  insufficient evidence or low mastery — bounded by both a visited-set
  and `maxPrerequisiteBacktrackDepth`, so a cyclic or malformed graph
  cannot cause an infinite loop even though the curriculum model's own
  validation should already prevent cycles). `chooseTargetDifficulty`
  maps mastery to a difficulty band once evidence is sufficient, uses a
  diagnostic difficulty otherwise, and nudges away from a difficulty
  repeated too many times in a row. None of this reads or writes the
  Phase 3 mastery formula itself — only `ConceptMasteryState.mastery`/
  `numObservations`/`consecutiveIncorrect`.
- `candidateSelection.ts` — deterministic filtering (concept match → not
  already presented → question-family repetition limit, a SOFT
  constraint relaxed if it would otherwise empty the pool → target
  difficulty, widened outward by `|difficulty − target|` if nothing
  matches exactly) and ranking (misconception-overlap score, weighted
  heavily, then difficulty-match closeness, with `questionId` ascending
  as the final deterministic tie-break — never random sampling).
- `adaptiveSelectionPolicy.ts` — orchestrates the above: tries the
  targeted concept first; if its question pool is exhausted, falls
  through to the next not-yet-mastered concept in curriculum order
  (bounded by curriculum length, each concept tried at most once — B6's
  "exhausted question pools" + "no infinite loops"); builds the full
  `AdaptiveSelectionTrace`, whose `explanation` is generated from the
  same already-computed fields (same pattern as
  `MasteryUpdateTrace.explanation` in Phase 3); implements
  `QuestionSelectionPolicy<AdaptiveSelectionContext>` so it is a drop-in
  alternative to `NonAdaptiveSelectionPolicy` behind the existing shared
  interface, never the other way around.

**Known, deliberate limitation (worth recording precisely because it is
non-obvious):** because `masteryRemediationThreshold` (0.35) is strictly
lower than `masteryProgressionThreshold` (0.75), a concept the engine has
already advanced past via `findProgressionFrontier` can **never** later
be re-flagged as a backtracking target by `findRemediationTarget` — by
the time a concept is behind the frontier, its stored mastery is already
≥ 0.75, which is never < 0.35. Backtracking is therefore only able to
surface prerequisites that exist in the concept GRAPH
(`Concept.prerequisiteIds`) but are NOT part of the specific
`curriculumOrder` the caller supplied — e.g. an assumed-background
concept from an earlier unit that the primary walked sequence doesn't
revisit. This is verified directly in
`tests/tutoring/selection/adaptive/targeting.test.ts` and is a structural
consequence of reusing a single frozen mastery estimate once a concept
is no longer being asked about, not a bug — but it means
`curriculumOrder` should deliberately be constructed as a partial
ordering (only the concepts meant to be walked in sequence), leaving
true background prerequisites out of it if backtracking into them is
meant to ever be reachable.

**Motivation:** The task instructions requested a prerequisite-aware,
deterministic, auditable adaptive selection engine built on top of the
Phase 3 learner model, with the explicit caveat not to assume failure on
a dependent concept proves a prerequisite is unmastered (B3) — satisfied
structurally here, since `findRemediationTarget` only ever SELECTS a
concept to ask about next; it never writes to `conceptMasteryStates`
(verified by a dedicated test asserting the states object is untouched,
by reference, after a backtracking decision).

**Alternatives considered:** (a) Random or round-robin tie-breaking among
equally-scored candidates — rejected; B6 explicitly requires deterministic
tie-breaking, and research reproducibility requires it generally. (b)
Hard-excluding (rather than soft-deprioritising) a question whose family
is at its repetition limit — rejected because it could empty the
candidate pool entirely in a small question bank; the soft-relax-if-empty
rule keeps a selection possible while still preferring family diversity
when there's a real choice. (c) Treating a single misconception-tagged
wrong answer as sufficient to drive diagnostic question selection —
rejected per CLAUDE.md principle 7 and this phase's own B5 instruction;
`misconceptionEvidenceMinCount` (2) gates this, tested explicitly.

**Consequences:** `src/domain/student/types.ts`'s Phase 0 `StudentModel`/
`ConceptMastery` placeholder is now superseded by the real
`ConceptMasteryState` map (from `src/domain/learner-model/`) as what
`AdaptiveSelectionContext` actually carries — the old file is left
in place, unused by the adaptive policy, rather than deleted (nothing
currently imports it outside its own module). `/tutor` and
`NonAdaptiveSelectionPolicy` required no changes and were verified
unaffected (`npm run build` still produces the same two routes,
`/tutor` and `/dev/session`; the non-adaptive baseline test suite is
untouched). No simulated-learner engine, BKT implementation, or formal
experiment/ablation harness was built — only the selection engine and
its unit/integration tests, per this phase's explicit scope limits.

**Status:** Implemented and tested: 52 new tests across
`tests/tutoring/selection/adaptive/{targeting,candidateSelection,
adaptiveSelectionPolicy}.test.ts` (prerequisite backtracking including a
cyclic-graph non-infinite-loop case, deterministic tie-breaking,
misconception-aware scoring with the evidence-threshold gate, exhausted-
pool fallthrough, missing/invalid metadata, a worked multi-round session
combining this engine with the real Phase 3 learner model, and
compatibility runs against the actual 1,840-question/109-concept RISE
bank). Full suite: 387/387 tests, typecheck clean, lint clean, both
audits unchanged, production build unchanged. See the Phase 4 entry in
`docs/development-log.md` for the complete report.

**Known limitation above, refined 2026-10-23 — see the diagnostic-
backtracking addendum immediately below.** The "once advanced past, a
concept can never be re-flagged by backtracking" limitation documented
above was real but turned out to directly conflict with the research
objective of prerequisite-aware adaptive sequencing: ordinary
remediation's threshold design made it structurally impossible to ever
revisit an already-mastered prerequisite, even when a downstream concept
showed sustained, unresolved difficulty. Rather than changing the
existing progression/remediation thresholds (0.75/0.35, preserved
unchanged), a SECOND, independent mechanism was added — see below.

---

### RD-0005 addendum — diagnostic backtracking into previously-progressed prerequisites

**Date:** 2026-10-23

**Decision:** Added `findDiagnosticBacktrackTarget` (`targeting.ts`) and
a new `"diagnostic_probe"` branch in `chooseTargetConcept`, triggered by
a NEW, stricter threshold (`diagnosticBacktrackConsecutiveIncorrectThreshold
= 4`, checked BEFORE the existing `consecutiveIncorrectRemediationThreshold
= 2` check) — crossing it implies ordinary remediation already ran on
earlier calls and the learner is STILL struggling. Unlike
`findRemediationTarget`, this searches EVERY direct prerequisite —
including ones already past `masteryProgressionThreshold` — gated only
by a NEW `diagnosticStalenessThreshold = 8`: a prerequisite is eligible
for diagnostic probing only if it has no evidence at all, or its last
recorded observation is ≥8 sequence steps behind the current one,
**regardless of how high its historical mastery is**. Config bumped to
`adaptive-selection-v2`; policy to `adaptive-selection-policy-v2`.

**Why this needed a second mechanism rather than adjusting the existing
one:** `findRemediationTarget`'s eligibility test is `mastery <
masteryRemediationThreshold (0.35)`. Any concept the frontier has
already advanced past satisfies `mastery ≥ masteryProgressionThreshold
(0.75)` by construction (that is literally why the frontier moved past
it) — and 0.75 can never be < 0.35. No adjustment to either existing
threshold value can fix this without destroying what each threshold
means (lowering `masteryProgressionThreshold` would make "mastered" mean
something much weaker; raising `masteryRemediationThreshold` above
`masteryProgressionThreshold` would make EVERY non-maximal concept
permanently eligible, destroying the "reserved for genuinely weak
concepts" signal ordinary remediation relies on). The requirement was
also explicit that requirement 3 (preserve 0.75/0.35 "unless a separate
mathematical justification requires changing them") — no such
justification existed; the two thresholds measure different things
(confidence to advance vs. confidence something is weak), and the real
gap was the absence of a THIRD signal: "is this estimate still current,"
independent of its value. `diagnosticStalenessThreshold` is that signal.

**How this avoids both halves of the risk the task named:**
- *Auto-penalizing a prerequisite merely because a dependent concept
  failed* — never happens. `findDiagnosticBacktrackTarget` is read-only
  (verified by a dedicated test asserting `states` is referentially
  untouched); a prerequisite's mastery only ever changes via a REAL
  response to a REAL question about it, through the unmodified Phase 3
  `applyResponseEvidence`. Being selected for a diagnostic probe records
  nothing by itself.
- *Trapping a learner in a remediation cycle that never returns to the
  downstream concept* — prevented by the staleness gate being
  self-correcting: the moment a prerequisite is actually probed (a real
  response arrives), its `lastSequenceIndex` advances, making it
  immediately ineligible again (gap resets near 0). On the next call,
  that prerequisite drops out of the eligible set; once every direct
  prerequisite (and, if the graph is deep, everything within
  `maxPrerequisiteBacktrackDepth`) has been freshened this way, the
  search returns `null` and control falls through to ordinary
  remediation on the ORIGINAL downstream concept — bounded by the number
  of distinct prerequisites in the subgraph, never open-ended. Verified
  directly: a test gives a diagnostic target a fresh `lastSequenceIndex`
  (simulating "it was just probed") and confirms the very next call
  returns to the downstream concept rather than re-selecting it.
- *Permanent curriculum regression vs. temporary diagnosis* — the
  `"diagnostic_probe"` reason is structurally distinct from
  `"prerequisite_backtrack"`/`"remediation"`; `TargetConceptDecision`
  carries a `diagnosticDetails` object (`originalConceptId`,
  `triggerConsecutiveIncorrect`, `isTemporaryProbe: true`,
  `prerequisitesConsidered`, and a human-readable `returnCondition`
  stating exactly what makes selection return to the original target) —
  a trace reader never has to infer "is this permanent or temporary" from
  the reason string alone.

**Ranking among eligible diagnostic candidates** ("prefer prerequisites
with lower mastery or insufficient recent evidence," deterministically):
never-observed first, then ascending mastery, then descending staleness
gap, then `conceptId` ascending as the final tie-break — same
closest-first, depth-bounded, visited-set-guarded traversal structure as
`findRemediationTarget` (same cycle/runaway-depth protection, verified
again on a cyclic graph fixture for this new function specifically).

**Alternatives considered:** (a) Simply widen
`masteryRemediationThreshold` upward — rejected per the "no mathematical
justification" analysis above; also would have silently changed ordinary
remediation's behavior, which requirement 3 asked to avoid. (b) Have the
diagnostic mechanism directly lower a stale prerequisite's recorded
mastery toward some "uncertainty" value to force it back below the
remediation threshold — rejected outright: this is exactly the
"automatically decrease mastery... merely because the learner failed a
dependent concept" the task explicitly forbade (requirement 5); mastery
must only move in response to real evidence about that concept itself.
(c) Track "episodes" of diagnostic probing as new persistent session
state (e.g. a counter of how many probes have occurred since a trigger)
— rejected in favor of deriving eligibility entirely from the
ALREADY-PRESENT `lastSequenceIndex` field via the staleness gate: no new
mutable session state was needed, keeping the policy fully stateless
and reproducible from `(context, config)` alone, consistent with every
other decision in this module.

**Consequences:** `AdaptiveSelectionConfig` gained two required fields
(`diagnosticBacktrackConsecutiveIncorrectThreshold`,
`diagnosticStalenessThreshold`); any config object constructed before
this change needs both. `TargetConceptDecision.reason` gained
`"diagnostic_probe"` as a sixth variant. The orchestration layer
(`adaptiveSelectionPolicy.ts`) needed NO changes beyond its explanation
string and version bump — the existing "fall through to the next
eligible concept if the targeted concept's pool is exhausted" logic
already handles an exhausted diagnostic-probe question pool for free,
since it operates on `targetConcept.conceptId` generically regardless of
which reason produced it.

**Status:** Implemented and tested — 16 new tests in
`tests/tutoring/selection/adaptive/diagnosticBacktracking.test.ts`
(backtracking into previously-mastered and previously-weak prerequisites,
multi-level chains, mastery/never-observed preference ordering, the
depth bound, cycle protection, no-mutation/no-auto-penalty, determinism,
and the "returns to the original concept" round-trip) plus 2 new
orchestration-level tests in `adaptiveSelectionPolicy.test.ts` (a
diagnostic probe actually gets a question selected and the explanation
names it as temporary; an exhausted diagnostic question pool correctly
falls through to the next eligible concept). Full suite: **405/405
tests**, typecheck clean, lint clean, both audits unchanged, production
build unchanged. Phase 4 is considered complete with this refinement
folded in; no further mathematical or architectural change to the
selection engine is in scope without a new decision record.

---

### RD-0006

**Date:** 2026-10-23

**Decision:** Built Phase 5 — a controlled experimental session
framework (`src/research/experiment/`) that runs different mastery
estimators and question-selection policies under equivalent, reproducible
conditions, strictly computational (no real participants), using
externally-supplied response evidence rather than generating responses
itself (Phase 8's job). Also introduced one small, backward-compatible
extension to the Phase 4 adaptive engine: a `prerequisiteAware` flag on
`AdaptiveSelectionConfig` (`src/tutoring/selection/adaptive/config.ts`)
enabling the prerequisite-UNAWARE ablation (condition C3) without
touching mastery-based difficulty adaptation.

**Architecture:**
- `types.ts` — `EstimatorAdapter<TState>` (wraps the Phase 3
  `MasteryEstimator` interface with multi-concept fan-out, serialization,
  and identity fields), `SelectionAdapter` (wraps
  `QuestionSelectionPolicy<TContext>` behind one generic input shape),
  `ExperimentConfig`, `ExperimentScenario`, `ExperimentSessionState`
  (plain, JSON-serializable — no class instances or closures, so it can
  be compared byte-for-byte during replay).
- `estimatorAdapter.ts` — `createNullEstimatorAdapter` (condition C0's
  "no mastery estimation," a true no-op) and
  `createDeterministicEstimatorAdapter` (wraps Phase 3's
  `applyResponseEvidence` directly — reused, not re-derived — for both
  Variant A and Variant B via different `ModelParameters`).
- `selectionAdapter.ts` — `createNonAdaptiveSelectionAdapter` (wraps
  `NonAdaptiveSelectionPolicy`; structurally never reads
  `conceptMasteryStates`, preserving hard constraint 4) and
  `createAdaptiveSelectionAdapter` (wraps `AdaptiveSelectionPolicy`,
  exposing its full `AdaptiveSelectionTrace`). The SAME adapter
  constructor serves C1/C2 (prerequisite-aware) and C3 (prerequisite-
  unaware) — only the `AdaptiveSelectionConfig` passed in differs.
- `conditions.ts` — the C0-C3 registry plus `buildExperimentCondition`
  (the generic factory used for C4's "pluggable estimator" extension
  point and for Track A's non-adaptive+estimator combination) and
  `buildC4PluggableEstimatorCondition` (type-checks the shape a future
  BKT adapter would take; no estimator is implemented here).
- `sessionEngine.ts` — `startExperimentSession` /
  `recordExperimentResponse` / `advanceExperimentSession`, mirroring the
  existing non-adaptive `service.ts`'s start/submit/advance shape (reused
  at the design level — the actual stateful, singleton-store
  implementation in `service.ts` is specific to the one live `/tutor`
  bank and was correctly NOT reused directly, since this engine must be
  pure, headless, and estimator/policy-generic for replay to work).
  Grading is the REAL `gradeAnswer` (`src/tutoring/grading/grade.ts`),
  called directly, not reimplemented. `runExperimentToCompletion` plus
  `createFixedResponseSequenceProvider` are the "replaceable response
  provider / externally supplied sequence" (section 3's explicit
  requirement that the engine never generate a learner's response
  itself).
- `provenance.ts` — `buildExperimentProvenance`, a direct copy-out of
  everything requirement 9 lists (condition/run/scenario id, a SHA-256
  content hash of the question bank and curriculum graph, estimator and
  selection-policy identity/version/parameters, session limits, the
  actual selection/response sequences, and every estimator/selection
  trace already produced during the run) — nothing is recomputed or
  re-explained after the fact.
- `validation.ts` — `validateExperimentConfig`, run before a session
  starts; rejects malformed adapters, an adaptive policy paired with the
  "none" estimator, a non-adaptive policy missing its predetermined
  sequence, invalid deterministic-mastery parameters, invalid session
  limits, and unsupported difficulty levels. Deliberately does NOT
  maintain a closed allowlist of estimator-type strings (that would make
  C4's explicit "pluggable estimator" extension point impossible).
- `replay.ts` — `replayExperimentSession`: re-runs
  `startExperimentSession`/`recordExperimentResponse`/
  `advanceExperimentSession` from scratch against the identical
  config/scenario/response sequence and deep-diffs the result against
  the original, reporting the first point of disagreement.

**Why a NEW parallel engine rather than reusing `src/tutoring/session/service.ts`
directly:** that module is a stateful singleton tied to one global
module-level store, the one fixed `QUESTIONS` bank, and a single
hardcoded `NonAdaptiveSelectionPolicy` instance — correct and sufficient
for `/tutor`, but incompatible with running several estimator/policy
combinations side by side, supplying an arbitrary question bank
(including the 1,840-question RISE bank), or supporting deterministic
replay (a global mutable store cannot be "replayed" against — there is
no clean "initial state" to restart from). The experiment engine
mirrors `service.ts`'s start/submit/advance SHAPE deliberately (same
lifecycle, same responsibility split) while being pure, parameterized,
and side-effect-free, which is what replay and multi-condition
comparison both require. `service.ts` and `/tutor` were not modified.

**Fairness controls (requirement 6):** matched scenarios share
`scenarioId`, `availableQuestions`, `concepts`, `curriculumOrder`, and
`initialEstimatorStates` — everything about the STARTING conditions.
Adaptive and non-adaptive conditions are explicitly NOT required to
administer the same question sequence (an adaptive policy choosing
differently than a fixed sequence is the entire point of adapting);
fairness instead means identical starting conditions, a controlled
response-generation mechanism (the SAME externally-supplied response
sequence or provider function across compared conditions — see the
"C1 and C2 can diverge... given the identical response sequence" test),
and explicit, recorded model/policy versions so any observed difference
is attributable to a named, versioned change rather than an
unaccounted-for one.

**Estimation vs. sequencing tracks (requirement 7):** Track A
(estimator comparison) is built by pairing different `EstimatorAdapter`s
with the SAME `SelectionAdapter` — typically the non-adaptive one, since
a fixed question sequence cannot be confounded by selection differences
(`buildExperimentCondition("estimator-comparison", someEstimator,
createNonAdaptiveSelectionAdapter())`, tested). Track B (sequencing
comparison) is built by pairing the SAME estimator with different
`SelectionAdapter`s (C2 vs. C3 — identical Variant B estimator,
prerequisite-aware vs. unaware selection; tested to produce different
question sequences from an identical scenario). Nothing in the engine
claims a policy "improved learning" from a higher internal mastery
estimate — the engine only ever reports what was estimated and what was
selected, not an evaluation verdict (Phase 8's job).

**Known threats to experimental validity (recorded, not resolved here —
this phase builds infrastructure, not a benchmarking study):** (a) no
response-generation mechanism exists yet beyond a fixed, pre-recorded
sequence or an arbitrary caller-supplied function — without a validated
simulated-learner model (Phase 8), any demonstration using a fixed
correctness pattern (as this phase's own tests do) is illustrative of
the MECHANISM only, not evidence about real learning; (b) the
`completionCheck`/`maxExposurePerQuestion` mechanisms are new, untested
against real response distributions; (c) provenance's content hash
covers question identity/version/correct-answer and the curriculum
graph shape, not full question text — sufficient to detect "a different
bank was used" but not a byte-for-byte text diff.

**Alternatives considered:** (a) Extend `src/tutoring/session/service.ts`
itself with a condition parameter — rejected per the analysis above
(global store, replay-incompatible, and would risk destabilizing the
already-verified live `/tutor` flow CLAUDE.md explicitly protects). (b)
Wire `ResearchEvent`/`ResearchEventLogger` (`src/research/events/`,
`src/research/logging/`) directly into the experiment engine — considered,
but `ResearchEventType` is a closed discriminated union with no event
shapes for estimator/selection traces, and extending it risked touching
the Phase 3 non-adaptive session's own event schema; `provenance.ts`
instead provides a purpose-built, equivalent-but-not-identical record
covering the same information requirement 9 lists. This is a deliberate
substitution, not an oversight. (c) A single `EstimatorAdapter`/
`SelectionAdapter` pair hardcoded per condition with no generic
factory — rejected; `buildExperimentCondition` existing as a public,
tested factory is exactly what makes C4 (and any future condition)
addable without touching the session engine, per requirement 13's "must
be designed so these capabilities can be added without major
architectural restructuring."

**Consequences:** `AdaptiveSelectionConfig` gained a required
`prerequisiteAware: boolean` field (default `true` via
`DEFAULT_ADAPTIVE_SELECTION_CONFIG`, preserving Phase 4's behavior
unchanged); a new `PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG` export
provides the ablation. No other Phase 3/4 file changed. `/tutor`,
`NonAdaptiveSelectionPolicy`, and `NON_ADAPTIVE_STUDY_SEQUENCE` are
untouched and unaffected — verified via the unchanged production build.

**Status:** Implemented and tested — 67 new tests across six files in
`tests/research/experiment/` (estimator adapters including Variant A/B
divergence, selection adapters including the prerequisite-aware/unaware
comparison, the C0-C3 condition registry and the C4/Track-A factories,
configuration validation's accept and reject paths, the full session
engine across every termination reason and both evaluation tracks
including a real run against the 1,840-question RISE bank, and
deterministic replay including divergence detection) plus 6 new tests in
`tests/tutoring/selection/adaptive/prerequisiteUnawareAblation.test.ts`
for the new config flag. Full suite: **478/478 tests**, typecheck clean,
lint clean, both audits unchanged, production build unchanged (same two
routes, `/tutor` and `/dev/session`). No unresolved architectural
blocker prevents Phase 6 or Phase 8 development. No substantive
research-design decision was left unresolved — scope exclusions
(no BKT, no simulated learners, no statistical significance testing)
were respected throughout.

---

### RD-0007

**Date:** 2026-10-23

**Decision:** Built Phase 6 — a versioned research-data pipeline
(`src/research/artifact/`) that converts a completed Phase 5
`ExperimentSessionState` into a canonical, content-addressed, persistable
artifact; durably stores and retrieves it via the local filesystem;
verifies its integrity along four independently-reportable dimensions;
exports it into five analyst-facing datasets (CSV/JSONL); groups runs
into reproducibility manifests; and replays a persisted run by reusing
Phase 5's `replayExperimentSession` rather than duplicating its logic.
No simulated learners, no BKT, no statistical analysis — this phase is
infrastructure for Phase 8, not a results phase.

**Architecture:**
- `types.ts` — `ExperimentRunArtifact`, schema-versioned
  (`ARTIFACT_SCHEMA_VERSION = "experiment-run-artifact-v1"`). Built
  AROUND the existing Phase 5 `ExperimentProvenance` (embedded verbatim
  as `artifact.provenance`, never re-derived) plus exactly the fields
  Phase 5 didn't already capture: schema/envelope metadata,
  `initialEstimatorStates`/`finalEstimatorStates` (the full-precision
  mastery snapshot — not reconstructable from a trace history alone for
  a concept whose only update trace doesn't survive export-time
  flattening), `finalMisconceptionTallies`, `configurationErrors`/
  `errorMessage` (so a persisted failed/invalid run keeps its own
  diagnostic explanation, not just a status code), and `contentDigest`.
- `canonicalize.ts` — deterministic canonicalization (recursively
  sorted object keys, array order preserved as meaningful data,
  `undefined` dropped) feeding a SHA-256 content digest. Numbers are
  never reformatted or rounded — the same IEEE-754 value always produces
  the same digest input, satisfying "do not store only rounded display
  values."
- `buildArtifact.ts` — `buildExperimentRunArtifact` (the one, and only,
  place an artifact is constructed; the digest is always computed over
  every field except itself) and `getCurrentSoftwareVersion` (package
  version from `package.json`, plus a best-effort `git rev-parse HEAD`
  that is OMITTED, not faked, when git is unavailable).
- `persistence.ts` — filesystem-only (guarded against accidental
  client-bundle import), atomic temp-file-then-rename writes, a
  collision-safe/path-traversal-safe id validator, overwrite protection
  (refuses to replace an existing run unless `overwrite: true` is
  explicit), and a lightweight `.meta.json` sidecar written alongside
  every full artifact so listing/filtering stored runs never requires
  parsing full traces.
- `integrity.ts` — `verifyArtifactIntegrity` reports FOUR independent,
  never-merged outcomes: content-digest validity (was this artifact's
  own data modified), question-bank hash match (has the referenced
  dataset since changed), curriculum hash match, and software-version
  match — each a `TriStateCheck` (`true | false | "not_checked"`) so "we
  didn't check" is never confused with "we checked and it matched/failed."
- `export/csv.ts` + `export/datasets.ts` — a small dependency-free
  CSV/JSONL writer (same "hand-rolled over a dependency" convention as
  `src/domain/rise/csvParser.ts`) plus the five required datasets:
  run-level summary (no fabricated learning-gain/mastery-accuracy
  figure — only directly-observed counts), question-response
  observations (concept/difficulty looked up from a caller-supplied LIVE
  bank reference, never duplicated into the artifact itself), concept
  mastery trajectories (one row per concept a multi-concept question
  touched, correctly attributed via `conceptWeight`, sourced directly
  from `MasteryUpdateTrace` at full precision), selection-decision
  records (one row per adaptive decision; none for non-adaptive, which
  produces no per-call trace — a correct reflection of reality, not a
  gap), and misconception evidence (`isConfirmedDiagnosis` hardcoded
  `false` on every row, so this export can never be mistaken for a
  diagnosis table).
- `manifest.ts` — `buildManifestFromArtifacts`, schema-versioned
  separately from individual runs (`MANIFEST_SCHEMA_VERSION`), rejects a
  batch mixing different question-bank or curriculum hashes, and marks a
  run `verified` only when a caller-supplied check actually ran against
  that specific artifact and passed — never inferred from the artifact
  merely existing on disk. Carries no generation timestamp, so
  regenerating a manifest from the same artifacts is trivially,
  byte-for-byte deterministic with nothing incidental to exclude.
- `replayArtifact.ts` — `replayFromArtifact` reuses
  `replayExperimentSession` (Phase 5) directly; always integrity-checks
  first and distinguishes `"integrity_only"` from `"computational_replay"`
  results — the former when the schema is unsupported, the content
  digest is invalid, the run is non-terminated (an artifact doesn't
  separately record an in-progress run's exact pre-termination cursor,
  so replay is honestly not attempted rather than guessed), or the
  recorded condition id can't be resolved to a runnable configuration in
  the current build (the "software implementation unavailable" case).
  `resolveConfigFromRegistry` is the default resolver, keyed off Phase
  5's own `EXPERIMENT_CONDITIONS`; a caller can supply their own for a
  custom condition.
- `inspect.ts` — a headless, read-only researcher API (`listRuns`,
  `getRun`, `verifyRun`, `summarizeRun`, `compareRunProvenance`) plus
  `scripts/research-cli.ts`, a thin command-line wrapper over the exact
  same functions (`list`, `show`, `verify`, `export`, `compare`) — no
  separate implementation, no graphical dashboard.

**Why the artifact embeds `ExperimentProvenance` rather than replacing
it:** Phase 5 already built and tested a complete, correct record of
everything about a run's identity, sequences, and traces; re-deriving
that would risk silent drift between two descriptions of the same run.
The one thing `ExperimentProvenance` doesn't carry is the run's STATE
beyond its trace history (final per-concept snapshot, misconception
tallies, a terminated-but-invalid run's own error detail) — exactly what
the envelope in `types.ts` adds, and nothing more.

**Why NOT force this into the `ResearchEvent` union:** re-confirmed the
Phase 5 decision (RD-0006) after inspecting it again per this phase's
own instruction 1.8 — `ResearchEventType` remains a closed discriminated
union with no shapes for estimator/selection traces, and extending it
would still risk the already-verified Phase 3 non-adaptive session event
schema for no benefit; `ExperimentRunArtifact`/`ExperimentProvenance`
together already satisfy every field requirement 3 and 9 list.

**Alternatives considered:** (a) A real embedded or remote database for
persistence — rejected; a computational research tool producing modest
per-run JSON files has no need for one, and the task explicitly asked
not to introduce one without genuine need. (b) Storing full question
objects inside each artifact (self-contained, no external lookup needed
for export) — rejected per requirement 9's explicit "avoid unnecessary
duplication of static question-bank content... store references and
content hashes instead"; exports instead take the live bank as a
parameter. (c) A single boolean "verified"/"tampered" integrity result —
rejected; collapsing the four failure categories (requirement 5) would
hide the difference between "this run's own file was altered" and "the
dataset it references has since changed," which call for different
researcher responses. (d) Giving the manifest a `generatedAt` timestamp
and excluding it from equality checks in tests only — rejected in favor
of simply not having one, since the manifest's content is already a pure
function of its input artifacts; no incidental field exists to need
excluding.

**Consequences:** A new `research-output/` directory (gitignored, same
reasoning as `/research-data/` from RD-0001) is where persisted artifacts
and their metadata sidecars live; nothing under `data/question-bank/` or
any Phase 1-5 source file is modified by this phase. No change to the
Phase 3 mastery equations or Phase 4 selection policy. `package.json`
gained one script (`research:cli`).

**Status:** Implemented and tested — 93 new tests across nine files in
`tests/research/artifact/` (canonicalization and digest stability/
sensitivity, artifact construction and precision preservation,
persistence including atomic writes/overwrite protection/path-traversal
rejection/corrupt-file detection, all four integrity-check dimensions
verified as independently reportable, all five export datasets including
multi-concept attribution and CSV/JSONL escaping, manifest construction
including mixed-dataset rejection and deterministic regeneration,
artifact-replay including the integrity-only/computational-replay
distinction across every documented reason, the read-only researcher
inspection API, and a full end-to-end demonstration run against both a
synthetic bank and the real 1,840-question RISE bank). Full suite:
**571/571 tests**, typecheck clean, lint clean, both audits unchanged,
production build unchanged. No unresolved architectural blocker prevents
Phase 7 or Phase 8.

---

### RD-0008

**Date:** 2026-10-24

**Decision:** Built Phase 7 — a functional, participant-facing adaptive
mathematics tutoring application (`/adaptive-tutor`,
`src/app/adaptive-tutor/`, `src/tutoring/adaptiveSession/`) that consumes
the REAL Phase 3 mastery estimator, Phase 4 adaptive selection engine,
and the full 1,840-question RISE bank — directly in this repository,
not the sibling repo CLAUDE.md previously named. See the "Phase 7 repo-
boundary finding" entry in `docs/development-log.md` for the full
discovery and the user's explicit decision to build here.

**The repo-boundary finding (why this required a decision before any
code was written):** CLAUDE.md said the adaptive participant-facing UI
belonged in a sibling repository named `adaptive-math-tutor` (on disk,
`adaptive-math-tutor-v1.0`). Inspecting that repository directly (its own
`CLAUDE.md`, `README.md`, `src/`) revealed it is a separate, pre-existing
research prototype with: a different research question (LLM-tutor vs.
conversational-LLM comparison, not deterministic-model vs. knowledge-
tracing), its own small quadratic-equations-only domain model (not the
1,840-question/14-chapter RISE bank), its own unrelated mastery
heuristic (`recordStudentPerformance`, nothing to do with this repo's
Phase 3 formula), and an LLM-generation layer this repo's hard
constraint 2 forbids. Wiring a UI there to consume this repo's actual
intelligence would have meant either replacing that repo's own,
already-developed system, or running two incompatible domain models side
by side in it — a substantive cross-repository change, not the
"narrowly scoped, versioned interface" Phase 7's own instructions called
for, and squarely the situation those instructions said to stop and
report rather than build around unilaterally. Given the choice, the user
selected building the UI directly in this repository, with `CLAUDE.md`
updated accordingly (see its "This is a research experiment, not a
product" section for the full amendment). `adaptive-math-tutor-v1.0` was
not touched.

**Architecture:**
- `src/tutoring/adaptiveSession/` — a new session-orchestration layer
  that is a THIN wrapper around the EXISTING Phase 5 session engine
  (`startExperimentSession`/`recordExperimentResponse`/
  `advanceExperimentSession`), never reimplementing grading, mastery
  updates, or selection: `service.ts` (the public API:
  `startAdaptiveSession`, `getSession`, `getCurrentQuestion`,
  `getCurrentPublicQuestion`, `submitAdaptiveAnswer`,
  `advanceAdaptiveSession`, `getAdaptiveSessionSummary`,
  `resetAdaptiveSession`), `store.ts` (a separate in-memory store from
  the non-adaptive condition's, same pattern as
  `src/tutoring/session/store.ts`), `errors.ts` (mirrors
  `src/tutoring/session/errors.ts`'s class hierarchy), `curriculum.ts`
  (chapter listing and curriculum-order construction from the real RISE
  concept taxonomy), `publicViews.ts` (the research-metadata boundary —
  see below), `explanations.ts` (plain-language selection explanations
  derived from real `AdaptiveSelectionTrace` reasons), `progress.ts` /
  `summary.ts` (student-facing mastery/progress presentation, derived
  from real `ConceptMasteryState` values).
- `src/app/adaptive-tutor/` — Server Actions (`actions.ts`, cookie-based
  session identity, identical thin-transport shape to
  `src/app/tutor/actions.ts`) and the Client Component UI
  (`adaptive-tutor-client.tsx`): session setup (chapter picker,
  plain-language description of adaptive practice), the question screen
  (KaTeX-rendered stem/options, progress bar, selection explanation),
  feedback (correct/incorrect, correct answer, worked solution,
  pedagogical misconception note), and the completion summary (accuracy,
  a per-concept mastery-before/after table, concepts flagged for further
  practice).
- `src/app/dev/adaptive-session/` — a development/researcher-only trace
  viewer, mirroring `/dev/session`'s existing pattern exactly: the
  COMPLETE numerical `AdaptiveSelectionTrace`/`MasteryUpdateTrace`
  history, never linked from `/adaptive-tutor`.
- `src/components/MathText.tsx` — a new, small KaTeX-rendering component.
  No KaTeX usage existed anywhere in this repository before this phase
  (verified by search) — Phase 7's brief assumed "the existing KaTeX
  rendering," which turned out not to exist yet; only an automated
  delimiter-balance VALIDATOR did (from the RISE import integrity tests).
  Added `katex`/`@types/katex` as real dependencies (confirmed via `npm
  audit` to introduce zero new vulnerabilities themselves — the audit's
  flagged issues are pre-existing, unrelated `next`/`sharp`/
  `source-map-js` transitive advisories, left untouched as out of
  scope). The RISE bank's actual delimiter convention
  (`\( ... \)` inline, `\[ ... \]` display) was confirmed directly
  against the real data before writing the parser, not assumed.

**The research-metadata boundary, extended for this phase
(`publicViews.ts`):** `PublicAdaptiveQuestionView` never includes
`misconceptionId`, `derivationNote`, `difficulty`, `conceptIds`, or
`correctOptionId` — the same non-negotiable list as the non-adaptive
condition's `toPublicQuestionView` (CLAUDE.md hard constraint 11). The
one addition, `selectionExplanation`, deliberately does NOT name a
concept (by id or by name) — a concept NAME is 1:1 derived from a
concept ID and would leak the identical information the constraint
already names, just spelled out in words. `explainSelection` instead
describes the SELECTION PROCESS ("revisiting an earlier concept,"
"moving to a harder question") without saying which concept, which is
exactly what section 8 asked for and no more. A `misconceptionNote`
shown on incorrect answers is a FIXED, generic sentence — never the
misconception taxonomy's own research-authored description text,
and never phrased as "you have X" — satisfying "present feedback
pedagogically without asserting that the student definitively possesses
that misconception" directly, not by convention.

**Default configuration:** condition C2 (`EXPERIMENT_CONDITIONS.C2`) —
deterministic mastery Variant B (inverse difficulty weighting) +
prerequisite-aware adaptive selection — exactly as section 4.A
instructed ("default to the currently-configured inverse difficulty-
weighted variant"). Progression threshold 0.75, remediation threshold
0.35, and the separate diagnostic-backtracking trigger are all read from
`DEFAULT_ADAPTIVE_SELECTION_CONFIG` unchanged — nothing in this phase
touches Phase 3 or Phase 4's approved parameters. The only new, UI-level
parameter introduced is `ADAPTIVE_SESSION_MAX_QUESTIONS = 20` (a session-
length choice, not a model parameter).

**Session integrity guarantees (section 3/6), all inherited by
construction from reusing Phase 5's engine and the non-adaptive
condition's existing cookie/store pattern, not reimplemented per-
guarantee:** a response cannot be applied twice (`responses.length >
sequenceIndex` guard, identical to the non-adaptive service's own
check); a question cannot be silently skipped (`advanceAdaptiveSession`
throws `AdaptiveNoAnswerSubmittedError` otherwise); the correct answer
is never sent before submission (`publicViews.ts`); mastery updates use
only the actual graded response, via `recordExperimentResponse`;
selection reads the just-committed state, since `advanceAdaptiveSession`
is always called after `submitAdaptiveAnswer` has already saved the
updated session; the client never computes or sends a grading outcome or
mastery value — it sends only a `selectedOptionId`, and the server
recomputes everything through `gradeAnswer`/the Phase 3 estimator.

**Verification:** a real end-to-end browser run (Playwright, installed
ad hoc for this verification and not added as a project dependency —
consistent with how the original non-adaptive flow was verified per
`docs/tutor-flow.md`) confirmed: the setup screen and chapter picker,
a full adaptive session through real `progression`/`remediation`
decision reasons with correctly-varying plain-language explanations,
real KaTeX rendering of the bank's actual LaTeX delimiters (verified
directly on real question stems, not a synthetic fixture), a session
reaching its configured 20-question limit and showing an accurate
summary, the `/dev/adaptive-session` trace viewer showing real decision
traces, a page refresh correctly resuming an in-progress session with no
console/page errors at any point.

**Alternatives considered:** (a) Build the UI inside
`adaptive-math-tutor-v1.0` by replacing or bypassing its existing domain
model — rejected as the invasive, high-risk path Phase 7's own stop
conditions warned against. (b) Reuse `src/tutoring/session/service.ts`'s
stateful store directly for the adaptive condition — rejected; a shared
store risks exactly the kind of accidental cross-condition contamination
CLAUDE.md's "Shared infrastructure" section warns against, and the two
conditions' session lifecycles differ enough (fixed sequence vs. dynamic
selection) that forcing one store to serve both would require
condition-branching inside the store itself. A separate store, same
pattern, costs nothing and keeps the boundary structural rather than
conventional — consistent with how `NonAdaptiveSelectionContext` vs.
`AdaptiveSelectionContext` already enforce the equivalent boundary at
the type level. (c) Display concept names per-question for richer
context — rejected per the research-metadata boundary analysis above.

**Consequences:** `package.json` gained `katex`/`@types/katex` as real
dependencies. No Phase 1-6 file was modified except (already recorded
under RD-0006/RD-0007) the two hash-helper exports from
`provenance.ts` — Phase 7 added no further changes to Phase 1-6 code.
`/tutor` and `src/tutoring/session/` are completely untouched.

**Status:** Implemented and tested — new tests across
`tests/tutoring/adaptiveSession/` (curriculum, explanations, public-view
sanitization against REAL bank questions — not just fixtures —, and a
full service-integration suite covering grading, mastery-update
integration, duplicate-submission/skip guards, a multi-round scenario
exercising real Phase 4 decision reasons, and misconception-evidence
consistency), `tests/components/MathText.test.tsx`, and
`tests/app/adaptive-tutor/adaptive-tutor-client.test.tsx`. Full suite:
**640/640 tests**, typecheck clean, lint clean, both audits and the
production build unchanged apart from the two new routes. Verified
additionally in a real browser end-to-end. No unresolved architectural
blocker prevents Phase 8.

---

### RD-0009

**Date:** 2026-10-24

**Decision:** Produced `docs/PHASE8_TECHNICAL_BRIEFING.md` — a complete,
file-and-function-cited description of the actually-implemented research
architecture (Phases 1-7), for a scientific reviewer designing the
Phase 8A protocol separately (in Claude Chat, per the user's stated
workflow) without repository access. Also added a small set of generic,
protocol-independent infrastructure extensions to
`src/research/experiment/`, explicitly NOT including any simulated
learner, BKT/IRT implementation, scientific metric choice, or threshold
change — those remain reserved for Phase 8A/8B approval.

**Why a separate briefing document rather than pointing the reviewer at
the development log:** the development log is a chronological narrative
of WORK SESSIONS (what was built, in what order, including false starts
and corrections); the briefing is organized around the SYSTEM AS IT
CURRENTLY STANDS, cited to exact files/functions/line numbers, and
explicitly separates implemented behavior from documented intent from
unimplemented features (its own stated scope note). The two serve
different readers — development-log.md for continuing this
implementation, the briefing for someone deciding what to test against
it.

**Task B additions (`src/research/experiment/`), each deliberately
narrow:**
- `rng.ts` — `createSeededRandom(seed)`, a dependency-free deterministic
  PRNG (mulberry32 + FNV-1a seed hash) mirroring the algorithm already
  used for option-display shuffling
  (`src/tutoring/session/optionOrder.ts`) rather than silently
  introducing a second, different one. A general-purpose utility; chooses
  no distribution, no simulator behavior.
- `simulator.ts` — `LearnerSimulator` (the contract a future simulated
  learner must satisfy: `simulatorId`, `version`, `parameters`,
  `respond(context)`) and `createResponseProviderFromSimulator`, bridging
  any conforming simulator into the `ExperimentResponseProvider` shape
  Phase 5's `runExperimentToCompletion` already consumes. No response
  probabilities, knowledge-transition dynamics, or prerequisite
  simulation logic — those are Phase 8B.
- `batch.ts` — `runExperimentBatch(specs)`, a deterministic-order,
  per-run-isolated wrapper around repeated `runExperimentToCompletion`
  calls (Phase 5, unmodified). Adds no new run semantics and no
  additional in-memory accumulation beyond what each individual run
  already produces.
- `matchedScenarios.ts` — `createMatchedScenarioSet` (stamps an identical
  `scenarioId` across byte-identical starting scenarios for several
  condition ids) and `isMatchedScenarioSet` (a structural check that a
  given set of scenarios really does share identical starting
  conditions). Makes no claim about which conditions SHOULD be compared.
- `metrics.ts` — `MetricDefinition<TResult>` (a plain
  `{metricId, version, compute(artifacts)}` contract) and
  `computeMetric`/`computeMetrics`, invoking a CALLER-SUPPLIED metric
  function. No metric is implemented here — see the explicit
  "test-run-count"/"test-total-questions" fixtures in
  `tests/research/experiment/metrics.test.ts`, deliberately trivial and
  labelled as test-only, never presented as a real research metric.
- `estimatorRegistry.ts` — a generic `EstimatorRegistry` class plus one
  process-wide `estimatorRegistry` instance, pre-populated with EXACTLY
  the three estimators this build already implements (`"none"`,
  `"deterministic-mastery-v1"`, `"deterministic-mastery-v2-inverse-difficulty"`)
  and nothing else — no placeholder `"bkt-v1"` entry, since registering
  one would misrepresent what this build can run. A future BKT estimator
  self-registers here with zero change to this file.

**What was deliberately NOT done, per explicit instruction:** no
simulated learner's response probabilities, knowledge-transition
dynamics, or prerequisite-dependency model; no BKT/IRT parameter priors
or implementation; no mastery-threshold changes (Phase 3/4 parameters are
completely untouched — `config.ts` and `updateMastery.ts` were not
modified by this phase); no benchmark sizes, hypotheses, or evaluation
metrics chosen; no question-bank modification.

**Alternatives considered:** (a) Implement a minimal placeholder
simulated learner now, to exercise the batch/simulator infrastructure
with something concrete — rejected; even a "trivial" simulator encodes
response-probability assumptions the task explicitly reserved for
Phase 8A approval, and the test suite instead uses clearly-labelled
test-only fixtures (`makeAlwaysCorrectTestSimulator`,
`makeCountingTestSimulator` in `tests/research/experiment/simulator.test.ts`)
that make no behavioral claim. (b) Pre-register a `"bkt-v1"` entry in
`estimatorRegistry.ts` with a `build()` that throws "not implemented" —
rejected as more confusing than useful; an absent entry is a clearer
signal than a registered-but-broken one.

**Consequences:** `src/research/experiment/index.ts` gained six new
exports. No existing Phase 5/6/7 file was modified. `docs/development-log.md`
records the full Task A/B/C/D breakdown and the exact file list.

**Status:** Implemented and tested — 46 new tests across six files in
`tests/research/experiment/` (`rng`, `simulator`, `batch`,
`matchedScenarios`, `metrics`, `estimatorRegistry`), each explicitly
covering determinism, run isolation, and reproducibility as instructed.
Full suite: **686/686 tests**, typecheck clean, lint clean, both audits
and the production build unchanged. Phase 5/6 remain fully headless and
functional; this phase stops at the scientific approval gate — Phase 8B
(the actual simulator/BKT/metrics/protocol) is not started.

---

### RD-0010

**Date:** 2026-10-31

**Decision:** "Stage 1" — remediated Finding F-02 from the October 29,
2026 read-only system audit (`docs/system-audit/FINDINGS_REGISTER.md`):
the live `/practice` page's adaptive and non-adaptive modes drew from two
disjoint question banks (RISE for adaptive, the original 161-question
quadratics bank for non-adaptive via the legacy `/tutor` engine),
contradicting `docs/research-design.md`'s own stated requirement that the
two conditions share a question bank, with selection policy as the one
deliberate difference. Built a new non-adaptive condition that runs over
the SAME canonical RISE bank, wired `/practice`'s non-adaptive mode to
it, and left the legacy bank/engine/route (`src/domain/questions/`,
`src/tutoring/session/`, `/tutor`) completely untouched as an explicitly
preserved legacy artifact.

**Why RISE is now the canonical bank for the live comparison, not the
original 161-question bank:** the adaptive condition had already moved
to RISE for sound, independently-documented reasons (RD-0001: the
original bank's own tests assert tight size ranges that RISE's scale
would break; RD-0002: RISE is externally pre-validated for referential
integrity). Moving the adaptive condition BACK to the 161-question bank
was rejected — it would have discarded RD-0001/RD-0002's reasoning and
shrunk the live product's curriculum coverage from 14 chapters back to
quadratics only, a regression Stage 1's brief explicitly did not ask for
("The existing 1,840-question... dataset is the primary curriculum for
future development"). Moving the non-adaptive condition TO RISE was the
only direction that both resolved the confound and matched the explicit
Stage 1 decision ("RISE_QUESTIONS... canonical question bank").

**How the fix was built — reusing, not replacing, existing tested code:**
- `src/tutoring/nonAdaptiveRiseSession/` (new): a non-adaptive session
  engine parallel to `src/tutoring/adaptiveSession/`, built on three
  pieces of ALREADY-EXISTING, UNMODIFIED infrastructure: the Phase 5
  session engine (`startExperimentSession`/`recordExperimentResponse`/
  `advanceExperimentSession`), the ALREADY-REGISTERED condition `C0`
  (`EXPERIMENT_CONDITIONS.C0` — null estimator + `NonAdaptiveSelectionPolicy`,
  present since Phase 5/RD-0006 but never previously wired into a live
  product route), and the legacy condition's own bank-agnostic
  `gradeAnswer`/`toPublicQuestionView`/`toPublicFeedbackView`
  (`src/tutoring/session/publicViews.ts`) — these were already generic
  over `Question`, and RISE questions ARE `Question` objects (RD-0001),
  so zero changes were needed to use them against the new bank.
- `src/tutoring/selection/nonAdaptive/riseSequence.ts` (new): the one
  genuinely new algorithm — a deterministic, concept-balanced
  predetermined-sequence builder for RISE, feeding the EXISTING,
  UNMODIFIED `NonAdaptiveSelectionPolicy` via its existing
  `predeterminedSequence` field. `NonAdaptiveSelectionPolicy` itself
  needed no change at all: it was already bank-agnostic (an index into a
  caller-supplied `string[]`), so the new, larger bank required a new
  sequence BUILDER, not a new selection POLICY. Modeled on the existing
  hand-authored `NON_ADAPTIVE_STUDY_SEQUENCE`'s own design goals
  (concept-balanced, difficulty-varied-but-controlled) and structurally
  similar to Phase 8's own `c0Slice.ts` (confirming this shape of
  sequence-builder was already an established, working pattern for a
  non-adaptive RISE condition) — but implemented independently, using
  this codebase's existing `seededShuffle` utility
  (`src/tutoring/session/optionOrder.ts`) rather than Phase 8's
  research-only RNG internals, to avoid coupling the live product to
  Phase 8 infrastructure.
- `src/domain/rise/curriculum.ts` (new): `buildAdaptiveCurriculumOrder`/
  `listAvailableChapters`/`CHAPTER_TITLES` relocated here, unchanged, from
  `src/tutoring/adaptiveSession/curriculum.ts` (which now re-exports them)
  — the "shared question-bank access layer" the Stage 1 brief asked for,
  so the non-adaptive condition's sequence builder does not import from a
  module named for the other condition. No behavior changed; every
  existing import of the old path still resolves identically.
- `getExperimentProvenance` (new, additive export on BOTH
  `adaptiveSession/service.ts` and the new `nonAdaptiveRiseSession/service.ts`):
  both now expose the SAME canonical `ExperimentProvenance` record shape
  (already defined, unmodified, in `src/research/experiment/provenance.ts`
  since Phase 6/RD-0007) for a live session — the "shared research-data
  contract" the Stage 1 brief's Part 8 asked for, scoped deliberately to
  an INTERFACE guarantee (both conditions produce a directly-comparable
  record, verified by `questionBankVersion.contentHash` equality in
  `tests/tutoring/stage1/sharedQuestionBank.test.ts`), not durable
  persistence — persistence remains explicitly Stage 2's job (see
  "Stage 2 readiness" in `docs/stage1-experimental-validity-report.md`).
- `src/research/experiment/conditionRegistry.ts` (new, additive): a
  documented, programmatically-validated metadata table over the
  EXISTING, UNMODIFIED `EXPERIMENT_CONDITIONS` registry
  (`conditions.ts`) — `validateConditionRegistry()` cross-checks the
  metadata against what each condition's real `build()` output actually
  produces, so the two can never silently drift apart.
- `scripts/audit-rise-questions.ts` (new): a RISE-bank counterpart to
  `scripts/audit-questions.ts` (Finding F-10), reusing the SAME generic
  validators the original script uses (`validateDomainModel`,
  `validateQuestionBank`, `computeBankStatistics`,
  `findDuplicateStemGroups`/`findDuplicateOptionSetGroups`,
  `findConceptGraphCycles`) plus two new RISE-specific checks
  (`conceptWeights` internal consistency; question/concept chapter
  consistency). Run against the real bank: **zero structural errors**.
  Per-question mathematical re-derivation (the original bank's
  `tests/helpers/quadratics.ts` pattern) is NOT ported to RISE's broader
  domain in Stage 1 — recorded as an explicit residual limitation, not
  silently skipped.

**What was deliberately NOT done (Part 9 preservation list, all
verified still true after this work):** `src/domain/learner-model/`,
`src/tutoring/selection/adaptive/`, `src/research/phase8/`,
`data/question-bank/*.csv`, `conditions.ts`'s `EXPERIMENT_CONDITIONS`
object, Phase 6's `provenance.ts`/hashing functions, and the already-
tested session-continuity fix in `src/app/practice/PracticeClient.tsx`
were not modified in any way that changes their behavior (only additive
imports/wiring were added to `PracticeClient.tsx`, `DashboardClient.tsx`,
and `adaptiveSession/service.ts`'s own new `getExperimentProvenance`
export — every PRE-EXISTING exported function in that file keeps its
exact prior signature and behavior). The legacy `/tutor` route,
`src/tutoring/session/`, and `src/domain/questions/` (the original
161-question bank) were not touched at all. No protocol approval gate
was created or bypassed; no confirmatory Phase 8 run was executed.

**Phase 8 compatibility (Part 6.3 of the Stage 1 brief):** verified, not
assumed — `src/research/phase8/pipeline/pilot.ts` (the only currently-
executed Phase 8 orchestrator) already passes `RISE_QUESTIONS`/
`RISE_CONCEPTS` into BOTH Track A and Track B for every condition
including `C0` (via `src/research/phase8/trackB/c0Slice.ts`, which
explicitly documents reusing the unmodified
`createNonAdaptiveSelectionAdapter`). Phase 8 was never affected by the
F-02 confound — it already ran its non-adaptive control over the same
bank as its adaptive conditions, before Stage 1 existed. F-02 was
strictly a LIVE-PRODUCT-level defect (the two real tutoring routes), not
a Phase 8 methodology defect.

**Alternatives considered:** (a) Generalize
`src/tutoring/adaptiveSession/service.ts` itself to branch on condition
id internally — rejected: that file was the most recently and heavily
tested file in the repository (the session-continuity fix), and adding a
second condition's control flow into it would have increased regression
risk for no benefit over a small, separate, parallel module reusing the
same underlying Phase 5 engine. (b) Reuse `src/tutoring/session/service.ts`
(the legacy bespoke, pre-Phase-5 engine) for the new RISE-based
non-adaptive condition instead of going through Phase 5 — rejected: it
predates Phase 5 and has its own bespoke `ActiveTutorSession` state shape
with no `ExperimentProvenance`-equivalent, which would have reintroduced
exactly the "two non-interoperable logging schemas" half of Finding F-02
even after fixing the bank half. (c) Enable chapter selection in the
non-adaptive mode's UI, now that the backend supports it — deferred: the
Stage 1 brief (Part 5.1) explicitly reserves broader UI consolidation for
Stage 3; the dropdown's disabled-for-non-adaptive state was kept, with
its explanatory copy corrected to describe this as a product-scope
choice rather than (as it previously, now-inaccurately, said) a technical
limitation. (d) Hand-author a RISE-scale predetermined sequence the way
the original 161-question bank's sequence was hand-authored — rejected
as impractical at 1,840 questions/109 concepts and not responsive to
arbitrary chapter selection; a deterministic programmatic builder was
chosen instead and documented as a new, explicit design decision (no
existing protocol document specified a RISE-scale non-adaptive policy).

**Consequences:** `/practice`'s non-adaptive mode now presents different
question content and a shorter default session (20 questions, matching
the adaptive condition, versus the legacy bank's fixed 35) than before
this change — a real, user-visible behavior change, not merely internal
refactoring. The legacy `/tutor` route is unaffected and remains the only
way to experience the original 35-question quadratics sequence. A new
session cookie (`nonAdaptiveRiseSessionId`) was introduced, distinct from
both `tutorSessionId` and `adaptiveTutorSessionId` — no session record
from any condition can be confused with another's.

**Status:** Implemented and tested. See
[`stage1-experimental-validity-report.md`](stage1-experimental-validity-report.md)
for the full verification run, completion-criteria checklist, and
residual limitations (notably: no durable persistence yet — Stage 2;
RISE content itself remains independently-unreviewed per its own
disclosed metadata — unaffected by Stage 1; the non-adaptive UI's topic
scope is still "Across All Topics" only, by deliberate Stage-3 deferral,
not a backend limitation).
