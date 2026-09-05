# The Non-Adaptive Study Sequence

`NON_ADAPTIVE_STUDY_SEQUENCE`
([`src/tutoring/selection/nonAdaptive/studySequence.ts`](../src/tutoring/selection/nonAdaptive/studySequence.ts))
is the fixed 35-question sequence the completed tutor actually runs
(`src/tutoring/session/service.ts` builds every session on it). It
supersedes Phase 2's `CANDIDATE_NON_ADAPTIVE_SEQUENCE` — that one was a
curriculum-coverage sanity check (one question per concept, no Level 5,
lower-difficulty skew), not a deliberate assessment design. This is the
deliberate one. `CANDIDATE_NON_ADAPTIVE_SEQUENCE` and the original
5-question Phase 0 `NON_ADAPTIVE_CURRICULUM_SEQUENCE` both still exist,
unmodified, for their original purposes (architecture demo and coverage
check respectively) — nothing was deleted.

Run `npm run audit:session` at any time for a live, non-hard-coded report
of everything below.

## Length and rationale

**35 questions** — broad enough to sample all 9 strands and repeat the
most important concepts and misconceptions, short enough not to require
the full 161-question bank in one sitting.

## Difficulty composition

| Level | Count | Brief's target |
| --- | ---: | ---: |
| 1 | 5 | 4-5 |
| 2 | 9 | 8-9 |
| 3 | 10 | 10-11 |
| 4 | 7 | 7-8 |
| 5 | 4 | 3-4 |

Every level lands inside the requested range. Difficulty rises overall
(the second half of the sequence averages meaningfully harder than the
first) without being sorted into flat L1-then-L2-then-... blocks —
enforced by
`tests/tutoring/session/studySequence.test.ts`'s "does not sort into flat
ascending difficulty blocks" test.

## Strand composition

| Strand | Count |
| --- | ---: |
| algebra_foundations | 3 |
| factorisation | 6 |
| solving | 8 |
| discriminant | 5 |
| roots_coefficients | 3 |
| graphs | 4 |
| transformations | 2 |
| intersections | 2 |
| reasoning | 2 |

All 9 strands represented. `solving`, `factorisation`, and `discriminant`
— the strands with the richest misconception coverage and the most
prerequisite centrality — get the largest allocations (8, 6, and 5
respectively), well above the simpler `algebra_foundations` (3),
matching the "core topics receive more coverage than recognition
concepts" principle.

## Repeated measurement

Some concepts are deliberately tested more than once
(`concept-factorising-monic-quadratics` at positions 5, 6, 9;
`concept-solving-by-factorisation` at 12, 13;
`concept-discriminant-nature-of-roots` at 19, 20). More importantly,
high-frequency misconceptions get independent opportunities to surface
across *different* questions and contexts even where the concept itself
isn't repeated — e.g. `FACTOR_SIGN_ERROR` appears as a possible distractor
in at least 3 of the 35 selected questions, `B2_PLUS_4AC` in at least 3,
and `PLUS_MINUS_DROPPED` in at least 2 — verified by
`tests/tutoring/session/studySequence.test.ts`.

## Full sequence

<!-- generated from src/tutoring/selection/nonAdaptive/studySequence.ts, src/domain/questions, src/domain/concepts -->

| # | Question ID | Strand | Concept | Difficulty |
| ---: | --- | --- | --- | ---: |
| 1 | q-recognise-quadratic-001 | algebra_foundations | Recognising Quadratic Expressions | 1 |
| 2 | q-standard-form-002 | algebra_foundations | Standard Form | 2 |
| 3 | q-expand-002 | algebra_foundations | Expanding Two Binomials | 2 |
| 4 | q-factor-common-001 | factorisation | Factorising by Common Factor | 1 |
| 5 | q-factor-monic-001 | factorisation | Factorising Monic Quadratics | 1 |
| 6 | q-factorise-identify-01 | factorisation | Factorising Monic Quadratics | 2 |
| 7 | q-factor-nonmonic-002 | factorisation | Factorising Non-Monic Quadratics | 3 |
| 8 | q-diff-squares-003 | factorisation | Difference of Two Squares | 2 |
| 9 | q-factor-monic-007 | factorisation | Factorising Monic Quadratics | 3 |
| 10 | q-identify-abc-001 | solving | Identifying a, b, and c | 1 |
| 11 | q-zero-product-003 | solving | The Zero-Product Principle | 2 |
| 12 | q-solve-factorisation-01 | solving | Solving Quadratic Equations by Factorisation | 2 |
| 13 | q-solve-factorisation-005 | solving | Solving Quadratic Equations by Factorisation | 3 |
| 14 | q-complete-square-001 | solving | Completing the Square | 3 |
| 15 | q-solve-complete-square-001 | solving | Solving by Completing the Square | 3 |
| 16 | q-quadratic-formula-01 | solving | The Quadratic Formula | 3 |
| 17 | q-quadratic-formula-005 | solving | The Quadratic Formula | 4 |
| 18 | q-discriminant-compute-001 | discriminant | Computing the Discriminant | 1 |
| 19 | q-discriminant-nature-01 | discriminant | Nature of Roots From the Discriminant | 4 |
| 20 | q-discriminant-nature-004 | discriminant | Nature of Roots From the Discriminant | 3 |
| 21 | q-discriminant-reverse-001 | discriminant | Reasoning Backwards From the Discriminant | 3 |
| 22 | q-discriminant-parameter-002 | discriminant | Parameter Reasoning via the Discriminant | 5 |
| 23 | q-root-sum-product-001 | roots_coefficients | Sum and Product of Roots | 2 |
| 24 | q-construct-from-roots-003 | roots_coefficients | Constructing a Quadratic From Given Roots | 4 |
| 25 | q-root-coeff-parameter-001 | roots_coefficients | Parameter Reasoning via Roots and Coefficients | 5 |
| 26 | q-parabola-shape-002 | graphs | Parabola Shape and Key Features | 2 |
| 27 | q-roots-x-intercepts-002 | graphs | Roots as x-Intercepts | 3 |
| 28 | q-vertex-axis-003 | graphs | Vertex and Axis of Symmetry | 4 |
| 29 | q-graph-nature-roots-003 | graphs | Graphical Interpretation of the Nature of Roots | 4 |
| 30 | q-vertex-form-001 | transformations | Vertex Form | 2 |
| 31 | q-graph-transform-004 | transformations | Graph Transformations | 4 |
| 32 | q-line-parabola-001 | intersections | Line-Parabola Intersections | 3 |
| 33 | q-modelling-004 | intersections | Modelling With Quadratics | 5 |
| 34 | q-integrated-004 | reasoning | Integrated Quadratic Reasoning | 5 |
| 35 | q-integrated-007 | reasoning | Integrated Quadratic Reasoning | 4 |

## Performance independence — the guarantee, precisely

The sequence above is a plain `string[]` constant, fixed at build time.
Every position in it is selected the same way, for every participant,
regardless of what they answer:

```ts
const context: NonAdaptiveSelectionContext = {
  participantId: session.participantId,
  predeterminedSequence: session.sequence, // = NON_ADAPTIVE_STUDY_SEQUENCE
  positionIndex: position,
};
selectionPolicy.selectNextQuestion(context); // returns sequence[positionIndex]
```

`NonAdaptiveSelectionContext`
([`src/tutoring/selection/nonAdaptive/types.ts`](../src/tutoring/selection/nonAdaptive/types.ts))
has exactly three fields: `participantId`, `predeterminedSequence`,
`positionIndex`. There is no field through which correctness, mastery,
misconception evidence, response time, or per-difficulty performance
could reach this call, even by accident — widening that type to add one
would be a visible, reviewable diff (see `CLAUDE.md` constraint 4).

This is demonstrated three ways, not just asserted:

1. `tests/tutoring/session/studySequence.test.ts`'s "has no
   performance-based branching" test walks the entire sequence through the
   real `NonAdaptiveSelectionPolicy` and confirms it reproduces
   `NON_ADAPTIVE_STUDY_SEQUENCE` exactly.
2. `tests/tutoring/session/performanceIndependence.test.ts` runs two full
   simulated sessions end-to-end through the real session service — one
   student answering every question correctly, one answering every
   question incorrectly — and asserts their observed question sequences
   are identical, position by position.
3. The same file also branches at every position (correct vs. incorrect)
   and confirms the *next* question always agrees, and separately confirms
   that selecting a distractor carrying misconception evidence has no
   effect on the next question either.
