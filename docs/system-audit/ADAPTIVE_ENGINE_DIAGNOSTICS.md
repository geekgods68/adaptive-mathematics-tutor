# Adaptive Engine Diagnostics

See [`AUDIT_INDEX.md`](AUDIT_INDEX.md) for the evidence-level legend.

## 1. Mastery initialization

**SOURCE VERIFIED.** `createInitialConceptState` (`src/domain/learner-model/initialize.ts:13-35`): every `(learnerId, conceptId)` pair starts at `mastery = parameters.initialMastery` (`0.5` for both shipped parameter sets — `src/domain/learner-model/parameters.ts:14,42`), zero observations, empty evidence, `lastSequenceIndex: -1`. Concepts are **fully independent** — there is no cross-concept prior-sharing (explicitly documented, `initialize.ts:9-11`): mastering one concept never gives another concept a head start, and conversely, a brand-new concept's cold start never resets any *other* concept's existing mastery.

## 2. Mastery representation and update

**SOURCE VERIFIED**, `src/domain/learner-model/updateMastery.ts`. The formula (identical to `docs/research-decisions.md` RD-0003):

```
Correct:   M_new = M_old + α·(1 − M_old)·w_d·w_h
Incorrect: M_new = M_old − β·M_old·w_d'
```

- `α` (correctGainRate) = 0.12, `β` (incorrectLossRate) = 0.10, both parameter sets.
- `w_h` (hint multiplier, 0.6) applies **only** when `correct && usedHint` — never on an incorrect response (`updateMastery.ts:81`). The adaptive student-facing UI never exposes a hint control, so `usedHint` is hardcoded `false` on every real student response (`service.ts:183` comment: "hints are not exposed in this UI").
- `w_d'` (the incorrect-branch difficulty factor) is the one place the two shipped parameter sets differ: Variant A (`deterministic-mastery-v1`) uses `w_d` directly (harder wrong answers penalized *more*); Variant B (`deterministic-mastery-v2-inverse-difficulty`, the one actually deployed as condition C2) uses `1/w_d` (harder wrong answers penalized *less* — "failing an easy question is treated as stronger evidence of a gap than failing a hard one," `parameters.ts:34-39`).
- Every update is clamped to `[0,1]` and produces a `MasteryUpdateTrace` whose `explanation` string is generated *from* the computed terms, never authored independently (`updateMastery.ts:23-48`) — a verifiable (not just claimed) "this decision is reconstructable" property.
- Multi-concept attribution: a question's `conceptWeights` map fans the same evidence out across every concept it's attributed to, each computed from *that concept's own* prior mastery, scaled by that concept's weight (`applyResponseEvidence`, `updateMastery.ts:183-206`). At weight 1 this is byte-identical to the single-concept formula (TEST VERIFIED via the project's own `multiConceptAndState.test.ts`, which this audit's full suite run included and passed).
- A question's `prerequisiteConceptIds` are **never** updated by answering the question itself — only the concept(s) the question is actually attributed to (`updateMastery.ts:177-181`). Prerequisite mastery can only move by being directly assessed (progression) or by being the explicit target of a remediation/diagnostic-probe question.

## 3. Active model parameters (as deployed, condition C2 — the default for both adaptive routes)

**SOURCE VERIFIED**, `src/tutoring/selection/adaptive/config.ts:92-113`:

| Parameter | Value | Effect |
|---|---|---|
| `masteryProgressionThreshold` | 0.75 | mastery at/above this, with enough evidence, is "done" |
| `masteryRemediationThreshold` | 0.35 | a prerequisite found during backtracking is "needs work" at/below this |
| `minEvidenceCount` | 3 | fewer observations than this → treated as "insufficient evidence," diagnostic difficulty used |
| `consecutiveIncorrectRemediationThreshold` | 2 | 2 consecutive wrong → ordinary remediation check |
| `diagnosticBacktrackConsecutiveIncorrectThreshold` | 4 | 4 consecutive wrong → stronger diagnostic-probe check (can revisit an already-mastered prerequisite) |
| `diagnosticStalenessThreshold` | 8 | a prerequisite is eligible for diagnostic re-probing only if its last observation is ≥8 sequence steps old |
| `maxPrerequisiteBacktrackDepth` | 5 | hard cap on prerequisite-graph hops searched |
| `difficultyByMastery` | 5 bands, L1 ≤0.30 … L5 ≤1.0 | mastery → difficulty mapping once evidence is sufficient |
| `diagnosticDifficultyForLowEvidence` | L2 | difficulty offered while evidence is insufficient |
| `maxConsecutiveSameDifficulty` | 3 | nudges away from a 4th consecutive identical difficulty |
| `questionFamilyRepetitionLimit` | 1 | soft cap before deprioritizing (not forbidding) a repeated question family |
| `misconceptionEvidenceMinCount` | 2 | a misconception tally must reach this before it affects candidate ranking |
| `prerequisiteAware` | `true` | condition C3 is the only registered condition with this `false` |

All explicitly labeled in source as "researcher-defined heuristic thresholds, NOT an empirically calibrated educational standard" (`config.ts:16-18`) — this audit found no claim anywhere in the student-facing UI that contradicts that framing; every mastery/progress display is captioned "model estimate," not "measurement" (e.g., `PracticeClient.tsx:570-572`).

## 4. Target-concept decision (`chooseTargetConcept`, `src/tutoring/selection/adaptive/targeting.ts:213-298`)

In priority order, for the current "progression frontier" concept (the first not-yet-mastered concept in curriculum order, `findProgressionFrontier`):
1. **`no_eligible_concept`** — every concept in the curriculum is mastered (falls back to the last concept, so there is always something to practice further).
2. **`insufficient_evidence`** — frontier concept has `< minEvidenceCount` observations.
3. (if `prerequisiteAware`) **`diagnostic_probe`** — triggers only above the *higher* consecutive-incorrect threshold (4); searches the full prerequisite subtree (breadth-first, bounded, cycle-safe) for the first prerequisite that is either never-observed or stale (≥8 steps since last observation), **regardless of that prerequisite's historical mastery** — this is the one mechanism that can revisit an already-mastered concept.
4. (if `prerequisiteAware`) **`prerequisite_backtrack`** — triggers above the lower threshold (2); searches the same subtree but only for a prerequisite that is under-evidenced *or* below the remediation threshold (0.35) — cannot select an already-mastered prerequisite (structurally: a concept at/above 0.75 cannot simultaneously be at/below 0.35).
5. **`remediation`** — same concept, implying it couldn't find (or isn't allowed, under C3, to look for) a prerequisite to blame.
6. **`progression`** — the ordinary case: keep practicing the frontier concept.

Every branch produces a `ConsideredConceptTrace`/`DiagnosticCandidateInfo` record of exactly what was looked at and why it was or wasn't chosen (`types.ts:49-78`) — this audit confirmed these traces are genuinely populated (not stubbed) by reading `targeting.ts`'s construction of each decision object directly.

## 5. Investigation A — "Moving to a harder question after consistent success."

**Exact trigger** (`src/tutoring/adaptiveSession/explanations.ts:26-28`, SOURCE VERIFIED):

```ts
case "progression":
  return targetDifficulty.evidenceCount >= 3 && (targetDifficulty.difficulty ?? 0) >= 4
    ? "Moving to a harder question after consistent success."
    : "Continuing to practise this topic.";
```

- **Does difficulty actually increase?** Not necessarily, and not as an input to this message. The message is computed from the *current* selection's absolute `evidenceCount`/`difficulty` for whichever concept is currently targeted — it is **not** a comparison against the difficulty of the question the student was just shown. If a concept's mastery has already crossed into the L4/L5 band and stays there for several consecutive "progression" selections (a common steady-state once a student is doing well), this exact message will display on every one of those questions, even though the difficulty did not change between them.
- **Concept-specific or session-wide?** Concept-specific. `targetConcept`/`targetDifficulty` are computed fresh per selection, for whichever single concept `chooseTargetConcept` picked that round (`adaptiveSelectionPolicy.ts:69`). A student moving between several different concepts across a session will see this message governed independently by each concept's own state, not by any session-wide aggregate.
- **Derived from the selection engine or a separate heuristic?** Entirely derived from the real trace's `targetConcept.reason`/`targetDifficulty` fields — `explainSelection` never inspects the question itself or invents a reason (module doc comment, `explanations.ts:3-12`, confirmed by reading every branch). It is, however, a *second-order* heuristic layered on top of the real decision: the engine does not itself compute or expose a "this is harder than last time" boolean — `explainSelection` approximates that English-language claim from an absolute-threshold proxy (`evidenceCount >= 3 && difficulty >= 4`), and that proxy is not actually equivalent to "the difficulty just increased."
- **Conclusion:** SOURCE VERIFIED defect in wording precision, not in the underlying mastery/selection computation. See Finding F-06.

## 6. Investigation B — "Starting with a question to see where you're at on this topic."

**Exact trigger** (`explanations.ts:23-24`): `targetConcept.reason === "insufficient_evidence"`, i.e., the current progression-frontier concept has fewer than 3 recorded observations.

- **New concept, chapter, or diagnostic state?** New *concept* specifically — not a chapter-level event and not a "diagnostic mode" the session enters. It fires every time the frontier advances onto any concept (brand new or, in principle, one whose state happens to have fewer than 3 observations for some other reason) that hasn't yet accumulated 3 observations.
- **Is mastery genuinely reset?** No. Confirmed directly: `createInitialConceptState`/`applyResponseEvidence` only ever read or write the state keyed by that concept's own id (`updateMastery.ts:183-206`); nothing iterates over or clears other concepts' states. A student seeing this message has every *other* concept's mastery exactly as it was.
- **Are topic transitions intentional?** Yes — this is `findProgressionFrontier` doing exactly its documented job (`targeting.ts:19-29`): walk `curriculumOrder` and stop at the first not-yet-mastered concept. In an "Across All Topics" session, `curriculumOrder` spans every chapter's concepts in `curriculumLevel` order (`buildAdaptiveCurriculumOrder`, `curriculum.ts:48-53`), so a student who answers quickly and correctly will legitimately advance through many different low-level concepts (and therefore see this message many times) in a single session — this is intended progression, not a malfunction, though it may *read* to a student as the system "resetting" rather than "advancing."
- **Is persisted mastery reused?** Yes, as of the fix now in the working tree — a *returning* student's prior sessions' mastery is seeded via `startAdaptiveSession`'s `priorEstimatorStates` parameter. This message can therefore still appear for a returning student on any concept they genuinely haven't reached `minEvidenceCount` on yet, cold-start or not; it is not a signal that continuity failed.
- **Conclusion:** the message is accurate and the underlying behavior is correct; its plain-language phrasing ("this topic") may slightly overstate scope (it's one concept, which may be a small slice of what a student would call a "topic"). Not a defect; a wording-precision note. See Finding F-07 (low severity).

## 7. Investigation C — the observed arithmetic / percentages / proportional-reasoning / algebra / counting sequence

**What this audit can and cannot confirm:** no session log, fixture, or replay of the specific reported 20-question session was available. Per the task's own instruction, this audit does **not** claim to have reproduced that exact sequence. What follows is the mechanism that would plausibly produce a sequence of that shape, confirmed against real source and real curriculum data (SOURCE VERIFIED for the mechanism; **HYPOTHESIS** for whether it explains the specific reported session).

- `buildAdaptiveCurriculumOrder` sorts concepts by `curriculumLevel` ascending, then id (`curriculum.ts:48-53`). The lowest `curriculumLevel` concepts in the entire 109-concept graph are CH01 ("Algebra Foundations")'s own foundational entries — confirmed directly from `data/question-bank/concept-taxonomy-v1.csv`: `ALG01` ("Arithmetic and order of operations", level 1), `ALG02` ("Fractions, decimals, percentages and ratio", level 1), and further low-level concepts covering ratio/proportion.
- For a cold-start student (or "Across All Topics," which walks every chapter in curriculum order starting from CH01's lowest-level concepts), `findProgressionFrontier` will visit these foundational arithmetic/percentage/ratio concepts **first**, by design — not because the engine "fell back to arithmetic," but because that is where the curriculum graph's own lowest `curriculumLevel` concepts live.
- "Algebra" questions are consistent with slightly-higher-level CH01 concepts (e.g., precedence/signed-power items like `MATH-CH01-0001`, confirmed directly from the canonical CSV).
- "Counting" questions are not explained by CH01 — they would most plausibly come from CH13 ("Permutations and Combinations") or a related concept reached either by a long "Across All Topics" session progressing that far, or by a cross-chapter prerequisite edge pulled in during backtracking/diagnostic-probing. This audit did not trace `prerequisite-edges-v1.csv` for cross-chapter edges reaching CH13 specifically — **UNKNOWN** whether such an edge exists; see `OPEN_QUESTIONS.md`.
- **Is there a coherent progression strategy?** Yes, structurally: curriculum-level order, then prerequisite-aware backtracking/diagnostic-probing, then mastery-banded difficulty. **Are prerequisite constraints applied?** Yes, per §4 above, when `prerequisiteAware` is true (the deployed default, C2). **Can the engine enter a repetitive/unproductive pattern?** The `insufficient_evidence`→`progression` cycle on a long run of low-value, quickly-mastered foundational concepts (each needing only 3 observations before advancing) is the one pattern this audit can confirm, by construction, will repeat often in an "Across All Topics" session for a new student — whether that reads as "unproductive" is a product-judgment question, not a code defect.
- **Is selection responding to previous answers?** Yes, demonstrably (§4, and TEST VERIFIED via the project's own existing multi-round integration test exercising real `progression`/`remediation`/`prerequisite_backtrack`/`diagnostic_probe` reasons across a scripted response sequence).

## 8. Investigation D — answer validity and question quality

- **Correct-answer keys / grading:** `gradeAnswer` (`src/tutoring/grading/grade.ts`) is a direct `selectedOptionId === question.correctOptionId` comparison for both banks — no algebraic-equivalence checking, no fuzzy matching, consistent with CLAUDE.md hard constraint 2. **SOURCE VERIFIED.**
- **Duplicate/ambiguous distractors, original (161-question) bank:** `src/domain/questions/validateQuestionBank.ts` plus `npm run audit:questions` (re-run in this audit, 0 integrity errors) check referential integrity, per-question option-set sanity, and duplicate-stem/duplicate-option-set detection; the latter found 2 informational groups (classification-style questions legitimately reusing a label set), not true duplicates. Every distractor's arithmetic is independently, computationally verified (`tests/domain/questionBank/mathVerification.test.ts`, included in this audit's full-suite pass).
- **The RISE bank (used by the actual adaptive product) has a materially different quality-assurance posture:** its own validation CSV (`data/question-bank/canonical-question-bank-validation-v1.csv`) records, per question, `independent_human_review: not_performed` and `empirical_validation: not_performed` — confirmed directly by reading the file. This is self-disclosed in `data/question-bank/README.md` (referenced from CLAUDE.md) as a known limitation of the imported dataset, not a discovery of this audit — but it is worth stating plainly here: **the question bank the adaptive product actually serves to students has had zero independent human review, by its own metadata, while the bank the non-adaptive product serves has been through this repository's own, considerably more rigorous authoring/verification pipeline.** This compounds Finding F-02 rather than being a separate defect.
- **Mathematical rendering:** KaTeX, added specifically because the RISE bank's content requires it; delimiter convention (`\( \)`/`\[ \]`) confirmed against real data before the renderer was written (RD-0008). No rendering failures were observed in source inspection; this audit did not render any question in a browser to confirm visually (no browser tool available).
- **Misconception evidence vs. diagnosis:** correctly enforced throughout — every student-facing misconception note is the single fixed sentence `"This is a common point of confusion — review the worked solution carefully."` (`publicViews.ts:63`, both conditions' equivalents), never the taxonomy's own research-authored description, consistent with CLAUDE.md principle 7.
