# Research Design

**Stage 1 update (2026-10-31, docs/research-decisions.md RD-0010):** the
"Adaptive vs. non-adaptive" and "What must remain controlled across
conditions" sections below describe the ORIGINAL design, written when
the adaptive condition was planned to be "developed separately, in a
sibling repository" and the only question bank in existence was the
161-question quadratics-only bank. Neither is still accurate as a
description of the live product. Both statements are left in place,
unedited, as the historical record of the original design; each is
followed by a dated update block explaining what changed, why, and what
is true now. See RD-0010 for the full account, including why this
drifted silently for a time (the October 29, 2026 system audit's Finding
F-02) before being corrected here.

## Target population

Grade 9–10 secondary-school students. The mathematics is scoped to a
secondary-school algebra/functions curriculum, but questions are designed
to require genuine multi-step reasoning rather than direct arithmetic
substitution — deep enough that students can make meaningful mistakes,
improve over a session, show different levels of mastery, and exhibit
identifiable misconceptions.

## Mathematics domain

**Quadratic Equations and Quadratic Functions.** The eventual full scope
(not built in Phase 0 — see [`architecture.md`](architecture.md) for what
exists now) spans:

1. identifying quadratic expressions
2. expanding quadratic expressions
3. factorisation
4. solving quadratic equations by factorisation
5. completing the square
6. quadratic formula
7. discriminant
8. number and nature of roots
9. relationships between roots and coefficients
10. quadratic graphs
11. vertex and axis of symmetry
12. transformations of quadratic graphs
13. intersections between functions
14. parameter-based quadratic problems
15. reasoning problems combining several of the above

**Stage 1 update (2026-10-31):** this 15-topic quadratics-only scope is
still exactly what the ORIGINAL 161-question bank (`src/domain/questions/`)
covers, and that bank and its non-adaptive sequence
(`NON_ADAPTIVE_STUDY_SEQUENCE`) remain fully intact, legacy-labeled, and
reachable at `/tutor` — see `docs/question-bank.md` and CLAUDE.md's Phase
0-3 history. It is no longer the scope of the canonical comparison the
live product's `/practice` page runs, which now spans the full RISE
curriculum (109 concepts, 14 chapters, arithmetic through complex numbers
and combinatorics — see `data/question-bank/README.md`) for BOTH
conditions. See RD-0010 for why: in short, the adaptive condition had
already moved to this broader bank (RD-0001/RD-0002, for sound,
locally-reasoned engineering reasons at the time) while the non-adaptive
condition had not, producing the disjoint-bank confound RD-0010 fixes.

## Adaptive vs. non-adaptive: what's under test

Two tutoring conditions share the same question bank, grading, interface,
explanations, scoring, session structure, and research logging. The one
deliberate difference is **whether question selection is allowed to use
information about the student's performance**:

- **Non-adaptive** (this repository) — the sequence of questions is fixed
  in advance and does not change based on what the student does during the
  session. It may still observe and log correctness, selected distractors,
  and misconceptions; it must never act on them to choose what comes next.
- **Adaptive** (developed separately, in a sibling repository) — question
  selection may use mastery estimates, misconception history, recent
  correctness, response time, per-difficulty performance, and per-concept
  weakness to decide what to test next, whether to change difficulty,
  whether to retest a misconception, and when to progress.

See [`experimental-conditions.md`](experimental-conditions.md) for the
precise, testable boundary between what each condition may and may not do.

**Stage 1 update (2026-10-31):** the adaptive condition is no longer
developed in a sibling repository — see CLAUDE.md's Phase 4/Phase 7
entries and RD-0005/RD-0008 for that scope change, made explicitly and
deliberately in 2026-10-23/24. Both conditions now run in THIS
repository, over the SAME canonical RISE question bank and curriculum,
through the SAME Phase 5 experiment engine
(`src/research/experiment/sessionEngine.ts`): the non-adaptive condition
is `src/tutoring/nonAdaptiveRiseSession/` (Phase 5 condition `C0` — a
null estimator and the unmodified `NonAdaptiveSelectionPolicy` walking a
deterministic, concept-balanced predetermined sequence built by
`src/tutoring/selection/nonAdaptive/riseSequence.ts`); the adaptive
condition is `src/tutoring/adaptiveSession/` (condition `C2` by default).
Both are reachable through the one `/practice` page's mode selector.
Question selection remains the one deliberate, isolated difference
between them — see
[`stage1-experimental-validity-report.md`](stage1-experimental-validity-report.md)
Part E for the specific invariants now tested and enforced.

## Why MCQ, not free response

Correctness in this study must be deterministic and reproducible. A
free-response grader for algebraic answers — parsing arbitrary
student-written expressions and judging mathematical equivalence — is
itself a research problem, and its errors would be indistinguishable from
tutoring effects in the results. MCQ answers are graded by direct ID
comparison: no parsing, no fuzzy matching, no LLM judgment call standing
between a student's answer and a scored outcome.

MCQ items here are designed to be closer to TMUA-style reasoning items
than four-option school quizzes: the number of options is not fixed (see
`Question.options: AnswerOption[]` in [`data-model.md`](data-model.md)),
and each option is chosen for what it reveals about the student's
reasoning, not to pad out a fixed format.

## Why diagnostic distractors matter

An incorrect answer alone tells you a student is wrong. A distractor
authored as the endpoint of a specific, plausible incorrect line of
reasoning tells you *how* they are likely to be wrong — which sign was
dropped, which factor pair was guessed, which formula term was flipped.
That distinction (`incorrect` vs. `incorrect, consistent with
misconception X`) is what lets an adaptive policy eventually decide to
retest a misconception rather than just repeat a topic, and what lets the
non-adaptive condition's logs be analysed with the same diagnostic
richness after the fact, even though it never acts on them live.

## What must remain controlled across conditions

To keep adaptation as the sole manipulated variable, both conditions share:

- the question bank, `AnswerOption` data (including diagnostic metadata),
  and worked solutions
- the deterministic grading engine
- misconception detection (attaching `misconceptionId` from the selected
  option — this is lookup, not inference, and is identical in both
  conditions)
- the feedback/explanation presentation
- the session and research-event data model and logging
- the UI shell

The only thing that may differ is which `QuestionSelectionPolicy`
implementation a session uses, and — for the adaptive condition only —
whether a `StudentModel` is maintained and read. See
[`architecture.md`](architecture.md) for how that separation is enforced
in the type system, not just by convention.

**Stage 1 update (2026-10-31):** for the modern RISE-bank comparison,
every one of the six bullets above is now a tested invariant, not only a
stated intent:

- **Question bank, option data, worked solutions:** both conditions read
  `RISE_QUESTIONS` — the same array, the same objects. Verified by
  `tests/tutoring/stage1/sharedQuestionBank.test.ts`, which checks both
  conditions' `ExperimentProvenance.questionBankVersion.contentHash`
  (a content fingerprint over every question id/version/correct-option,
  see `src/research/experiment/provenance.ts`) are byte-for-byte equal.
- **Deterministic grading engine:** both conditions call the same
  `gradeAnswer` (`src/tutoring/grading/grade.ts`) on the same `Question`
  objects — never reimplemented per condition.
- **Misconception detection:** identical, for the same reason — grading
  is the single source for `misconceptionId`, not duplicated per
  condition.
- **Feedback/explanation presentation:** both conditions build their
  public feedback view through the same `toPublicFeedbackView`
  (`src/tutoring/session/publicViews.ts`); the adaptive condition adds
  only a `selectionExplanation` field the non-adaptive condition
  structurally has no equivalent decision to produce.
- **Session/research-logging data model:** both conditions are
  `ExperimentSessionState`s produced by the same Phase 5
  `startExperimentSession`/`recordExperimentResponse`/
  `advanceExperimentSession` (`src/research/experiment/sessionEngine.ts`),
  and both now expose the identical `ExperimentProvenance` shape via each
  service's own `getExperimentProvenance` — see
  [`stage1-experimental-validity-report.md`](stage1-experimental-validity-report.md)
  Part C/D. This is an interface-level guarantee, not yet durable
  persistence (Stage 2's scope).
- **UI shell:** both conditions run through the one `/practice` page
  (`src/app/practice/PracticeClient.tsx`); the student chooses Adaptive
  or Non-Adaptive mode from the same screen, same topic dropdown, same
  question/feedback layout.

The one thing that intentionally still differs beyond selection policy:
the adaptive condition's mastery-threshold stopping rule versus the
non-adaptive condition's fixed question-count budget (both currently set
to the same default length, `ADAPTIVE_SESSION_MAX_QUESTIONS` ===
`NON_ADAPTIVE_RISE_DEFAULT_MAX_QUESTIONS` = 20) — this is a deliberate,
protocol-level choice (Part 5.3 of the Stage 1 brief: do not force
identical stopping rules when the research question concerns
Questions-to-Mastery), not an oversight.
