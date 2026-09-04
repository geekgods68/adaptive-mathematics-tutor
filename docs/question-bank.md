# Question Bank

The Phase 2 production question bank:
[`src/domain/questions/index.ts`](../src/domain/questions/index.ts) (the
combined `QUESTIONS` export) drawing from
[`src/domain/questions/bank/`](../src/domain/questions/bank/) (one file per
curriculum strand). Authored against the Phase 1 taxonomy — see
[`docs/curriculum.md`](curriculum.md),
[`docs/difficulty-framework.md`](difficulty-framework.md), and
[`docs/misconception-taxonomy.md`](misconception-taxonomy.md) — following
the rules in [`docs/question-authoring-guide.md`](question-authoring-guide.md).

Run `npm run audit:questions` at any time for a live report of everything
in this document, generated directly from the bank.

## Final count

**161 questions.** Five are migrated unchanged from the Phase 0 seed set
(`q-solve-factorisation-01`, `q-expand-brackets-01`,
`q-quadratic-formula-01`, `q-discriminant-nature-01`,
`q-factorise-identify-01`) — they met the Phase 2 quality bar as-is, so
they were folded into their strand files rather than replaced, per
`docs/curriculum.md`'s "no renumbering existing questions unnecessarily"
principle. The other 156 are new.

161 sits inside the requested 140-170 range and close to the suggested
~155 — it emerged from covering every concept adequately (see below)
rather than from a quota.

## Allocation by strand

| Strand | Questions | Guidance target |
| --- | ---: | ---: |
| algebra_foundations | 14 | 10-14 |
| factorisation | 27 | 22-28 |
| solving | 33 | 28-34 |
| discriminant | 20 | 18-22 |
| roots_coefficients | 14 | 12-16 |
| graphs | 21 | 18-22 |
| transformations | 12 | 10-14 |
| intersections | 10 | 8-12 |
| reasoning | 10 | 8-12 |

Every strand landed inside its guidance range. `solving` and
`factorisation` — the two strands with the richest set of distinct
misconceptions and the most prerequisite centrality — got the largest
allocations, matching the "core concepts get substantially more coverage"
principle.

## Difficulty distribution

| Level | Count | Share | Target |
| --- | ---: | ---: | ---: |
| 1 | 23 | 14.3% | 10-15% |
| 2 | 47 | 29.2% | 20-25% |
| 3 | 49 | 30.4% | 25-30% |
| 4 | 30 | 18.6% | 20-25% |
| 5 | 12 | 7.5% | 10-15% |

L1 and L3 land inside target; L2 runs about 4 points over its ceiling and
L4/L5 run a few points under their floors. This is disclosed rather than
forced into range — see
`tests/domain/questionBank/bankCoverage.test.ts`'s difficulty-distribution
test for the tolerance actually enforced (major-imbalance guard, not
exact-percentage matching, per `docs/question-bank-validation.md`), and
Phase 3's recommendation in the Phase 2 completion report if rebalancing
becomes a priority.

## Concept coverage

All 35 Phase 1 concepts have at least one question as their primary
concept; every one has at least two. Full per-concept table (question
count, difficulty range actually used, and the
`CONCEPT_DIFFICULTY_GUIDANCE` range it's checked against) is in
[`docs/question-bank-coverage.md`](question-bank-coverage.md).

Three `CONCEPT_DIFFICULTY_GUIDANCE` ranges were widened during authoring,
each backed by a specific question that genuinely earned the extra
difficulty (documented inline in
[`conceptDifficultyGuidance.ts`](../src/domain/curriculum/conceptDifficultyGuidance.ts)):

- `concept-identifying-abc`: 1-2 → 1-3 (`q-identify-abc-004` combines
  rearranging into standard form with identifying b)
- `concept-solving-by-factorisation`: 1-3 → 1-4
  (`q-solve-factorisation-006`, `x(x−3)=18`, has a genuine reasoning trap)
- `concept-constructing-quadratic-from-roots`: 3-4 → 2-4
  (`q-construct-from-roots-004` gives sum/product directly, a genuinely
  simpler instance)

## Misconception coverage

All 35 misconceptions appear in at least one distractor — full
distractor-count table in
[`docs/question-bank-coverage.md`](question-bank-coverage.md). Coverage is
deliberately uneven: `FACTOR_SIGN_ERROR` (33 distractors) and
`B2_PLUS_4AC` (18) recur across many questions and contexts because
they're high-value, broadly-applicable errors; narrow ones like
`AXIS_OF_SYMMETRY_CONFUSED_WITH_ROOT` and
`DIFFERENCE_OF_SQUARES_MISAPPLIED` appear once each because a natural fit
for them only arose in one place — no question was written solely to give
an obscure misconception an appearance.

## Option statistics

- Average options per question: **3.10**
- Distribution: 146 questions with 3 options, 14 with 4, 1 with 5
- Option count was never padded to hit a round number — see
  `docs/question-authoring-guide.md`'s "option-count flexibility" rule.
  Most questions ended up at 3 options because that's how many
  independently-derivable, non-forced distractors the mathematics
  actually supported; where a fourth or fifth genuinely distinct error
  path existed, it was included.

## Authoring methodology

Every question in this bank was authored using the same process:

1. **Compute first, write second.** For every question, the correct
   answer and every diagnostic distractor's exact value were computed
   programmatically (small Node/TypeScript scratch scripts using the
   shared verification helpers in
   [`tests/helpers/quadratics.ts`](../tests/helpers/quadratics.ts)) before
   being transcribed into the question data — never worked out by hand
   and eyeballed. See `docs/question-bank-validation.md` for what's
   re-verified automatically afterward.
2. **One misconception, mechanically applied.** Each diagnostic
   distractor started from an existing (or, 3 times, a newly-proposed)
   misconception's `errorPattern`, applied literally to the question's
   own numbers, to guarantee the "flawed rule → flawed value → displayed
   option" chain actually holds (`docs/question-authoring-guide.md`).
3. **Strand-by-strand, gated.** Authored in curriculum order (foundations
   → factorisation → solving → discriminant → roots/coefficients → graphs
   → transformations → intersections → reasoning), running
   `npm run audit:questions` and the full test suite after each strand
   before moving to the next.
4. **Difficulty from structure, not size.** Every difficulty rating
   followed `docs/difficulty-framework.md`'s reasoning-structure criteria
   — never assigned because a number looked big or a fraction appeared.

## Quality-control rules enforced on every question

See [`docs/question-bank-validation.md`](question-bank-validation.md) for
the full validator list. In summary, every question in this bank has:
exactly one correct option; a `correctOptionId` that matches it; a
`primaryConceptId` included in `conceptIds`; only valid concept and
misconception references; a non-empty stem and worked solution; no two
options with identical display text; no distractor whose display
duplicates the correct answer; a non-empty `derivationNote` on every
option that carries a `misconceptionId`; and a difficulty within its
primary concept's guidance range.
