# Research Design

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
