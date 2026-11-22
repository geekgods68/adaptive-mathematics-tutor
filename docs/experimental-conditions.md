# Experimental Conditions

This document defines the independent variable of the study precisely.
Read it before changing anything under `src/tutoring/selection/`.

**Stage 1 update (2026-10-31, docs/research-decisions.md RD-0010):**
"Same question bank" (first row below) is now a tested invariant for the
live product's modern comparison (`/practice`), not only a design intent
— see `tests/tutoring/stage1/sharedQuestionBank.test.ts`. Everything else
on this page — the policy-level contract for what the non-adaptive
condition must never do — is unchanged and remains exactly as accurate as
it always was; `NonAdaptiveSelectionPolicy`
(`src/tutoring/selection/nonAdaptive/nonAdaptiveSelectionPolicy.ts`)
itself was not modified by Stage 1 at all.

## Feature matrix

| Feature                               | Adaptive | Non-Adaptive       |
| -------------------------------------- | -------- | ------------------ |
| Same question bank                     | Yes      | Yes                 |
| Deterministic grading                  | Yes      | Yes                 |
| Misconception detection (from selected option) | Yes | Yes         |
| Research event logging                 | Yes      | Yes                 |
| Mastery calculation                    | Yes      | Optional / log-only |
| Uses mastery to choose next question   | Yes      | **No**              |
| Changes difficulty from performance    | Yes      | **No**              |
| Retests misconceptions adaptively      | Yes      | **No**              |
| Question sequence                      | Computed per-session from a `StudentModel` | Fixed, identical for every participant |

## What the non-adaptive condition must never do

The non-adaptive question-selection policy must never use any of the
following to decide what question comes next:

- mastery estimates
- misconception history
- recent correctness
- response time
- per-difficulty performance
- concept weakness

This repository enforces that boundary structurally, not just by
convention: `NonAdaptiveSelectionContext`
([`src/tutoring/selection/nonAdaptive/types.ts`](../src/tutoring/selection/nonAdaptive/types.ts))
has no field capable of carrying any of the above. `NonAdaptiveSelectionPolicy`
cannot read what its input type does not contain. If a future change needed
to widen that type, the diff would say so explicitly — it could not happen
as a quiet behavioral change inside the policy's logic.

Contrast with `AdaptiveSelectionContext`
([`src/tutoring/selection/adaptive/types.ts`](../src/tutoring/selection/adaptive/types.ts)),
which is where a `StudentModel` and answered-question history are, on
purpose, available to be read — because the adaptive policy is allowed to
use them. It is defined here for architectural completeness; the adaptive
policy itself (`AdaptiveSelectionPolicy`) is an explicit skeleton — see
[`architecture.md`](architecture.md) — and is developed in the sibling
adaptive-tutor repository, not here.

## What the non-adaptive condition IS allowed to do

Observing, grading, and logging are not the same as adapting on. The
non-adaptive tutor may:

- mark answers correct or incorrect (deterministically, by option id)
- identify which distractor was selected
- record the misconception associated with that distractor
- provide an explanation and worked solution
- calculate performance statistics for reporting
- store all of the above as research data

None of that observed information may feed back into which question is
selected next. The distinction is *record, don't react*.

## Reproducibility requirement

Every participant in the non-adaptive condition receives an equivalent
predetermined sequence
([`NON_ADAPTIVE_CURRICULUM_SEQUENCE`](../src/tutoring/selection/nonAdaptive/curriculumSequence.ts))
unless experimental randomisation is deliberately introduced in a later
phase. Concretely: a student answering question 3 incorrectly must never
cause question 4 to become easier, retest the same concept, or otherwise
differ from what a student who answered question 3 correctly would see
next.
