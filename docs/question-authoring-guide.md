# Question Authoring Guide

Rules for Phase 2 (production question bank authoring). Read this
alongside [`docs/curriculum.md`](curriculum.md),
[`docs/difficulty-framework.md`](difficulty-framework.md), and
[`docs/misconception-taxonomy.md`](misconception-taxonomy.md) — this
document is the *procedure*; those are the *content* it draws on.

## Distractor categories

Every incorrect `AnswerOption` should fall into one of these four
categories. Prefer A, then B, then C; use D only when necessary.

**A. Diagnostic distractor** — the value a specific, named misconception
produces. Set `misconceptionId` to a real id from
[`docs/misconception-taxonomy.md`](misconception-taxonomy.md), and write a
`derivationNote` showing the incorrect working. This is the default
category and should be most of your distractors.

**B. Procedural-error distractor** — the value a plausible incorrect
intermediate calculation produces, not tied to one of the taxonomy's named
misconceptions (e.g. a one-off arithmetic slip specific to this question's
numbers). Still requires a `derivationNote`; `misconceptionId` may be
omitted if no taxonomy entry genuinely fits — do not force a fit.

**C. Representation-error distractor** — the value produced by
misreading or misinterpreting a graph or an algebraic form (e.g. reading
a y-intercept off the wrong axis, or misreading which curve is which in a
figure). Tag with `misconceptionId` when a graphs/transformations-strand
misconception fits (see the "Graphs" and "Transformations" sections of
the taxonomy).

**D. Carefully justified non-diagnostic distractor** — a value included
only because the option count needs filling and no diagnostic, procedural,
or representation-error value is available. Allowed, but should be rare.
Never insert an arbitrary value purely to reach a round option count (4,
say) — option count is not fixed (see
[`docs/data-model.md`](data-model.md)); a 3-option question with two solid
diagnostic distractors is better than a 4-option question with a filler
one.

## Distractors must be derivable — this is the critical rule

Never attach a `misconceptionId` to a distractor unless that distractor's
value actually follows from that misconception's flawed procedure. Verify
this by doing the flawed working yourself and checking you land on the
option's exact displayed value.

Worked example — correct calculation:

```text
x = (−6 ± √(36 − 20)) / 2 = (−6 ± 4) / 2 = −1 or −5
```

A distractor generated from `NEGATIVE_B_DROPPED` (substituting +b instead
of −b) must use the same discriminant but the wrong-signed numerator:

```text
x = (6 ± 4) / 2 = 5 or 1
```

The option's `display` must be `"x = 5 or x = 1"` (or equivalent), not an
unrelated plausible-looking number. If you cannot derive the option's
exact value from the misconception's stated error pattern, either fix the
option's value or drop the `misconceptionId` and reclassify as category B
or D.

## Mathematical verification checklist

For every new question:

1. Solve it yourself (or compute it) independently of any distractor
   derivation, and confirm `correctOptionId` matches that answer.
2. For every distractor with a `misconceptionId`: apply that
   misconception's `errorPattern` mechanically to this question's numbers
   and confirm you reach the option's exact `display` value.
3. Where practical, add a substitution-based test (see
   `tests/domain/questionMath.test.ts` for the pattern) — evaluate both
   sides of an equation/expansion/factorisation at a few numeric values of
   x and assert they match (or, for a distractor, that they deliberately
   don't).
4. Never rely on eyeballing an expression as "probably right."

## Difficulty assignment

Use [`docs/difficulty-framework.md`](difficulty-framework.md)'s five
levels — assign difficulty based on reasoning structure (steps, concepts
combined, signposting, reverse reasoning), never on how large the numbers
are. Check the question's primary concept against
[`CONCEPT_DIFFICULTY_GUIDANCE`](../src/domain/curriculum/conceptDifficultyGuidance.ts)
before assigning a level outside that concept's supported range — if you
need to, that's a signal the question is really testing a different
(probably more advanced) concept than you labelled it with.

## Misconception tagging

- Prefer exactly one `misconceptionId` per distractor. Multiple
  independent flawed-reasoning paths coincidentally producing the same
  wrong value happens in the real taxonomy (see e.g. `B2_PLUS_4AC` and
  `FACTOR_SUM_PRODUCT_CONFUSION` both appearing across different
  questions), but don't stack more than one `misconceptionId` onto a
  *single* option — that overstates the diagnostic precision of a single
  selection. If a genuine multi-cause case arises, discuss extending
  `AnswerOption` to `misconceptionIds?: string[]` rather than picking one
  arbitrarily; don't do it speculatively.
- Look up existing misconceptions for your question's concept first:
  `getMisconceptionsForConcept(conceptId, MISCONCEPTIONS)`
  ([`src/domain/curriculum/queries.ts`](../src/domain/curriculum/queries.ts)).
  Reuse an existing id before proposing a new one.
- If no existing misconception fits, propose a new taxonomy entry (id,
  label, description, `conceptIds`, `errorPattern`,
  `exampleIncorrectReasoning`) in
  [`src/domain/misconceptions/data.ts`](../src/domain/misconceptions/data.ts)
  rather than force-fitting an ill-matching existing one.
- `derivationNote` and `errorPattern`/`exampleIncorrectReasoning` are
  developer/research metadata. Never surface them to a student — see
  [`docs/data-model.md`](data-model.md).

## Avoiding ambiguity

- Exactly one option must be unambiguously correct. If a distractor could
  be defended as "also sort of right" under a different but reasonable
  reading of the stem, rewrite the stem, not the option.
- State units/exactness requirements explicitly in the stem ("give exact
  (surd) answers", "to 2 decimal places") so a correct-but-differently-
  formatted answer isn't wrongly excluded.
- Avoid stems where the correct option is identifiable by superficial
  pattern (e.g. always the "nicest-looking" number, or always the longest
  option) rather than by doing the mathematics.

## Stable IDs

- `Question.id`, `AnswerOption.id`, `Concept.id`, and `Misconception.id`
  are permanent once a question has been used with real participants —
  research analysis joins on them. Never derive an option id from its
  display position (no `"A"`/`"B"`/`"C"`/`"D"` semantics); option order is
  randomized per presentation independent of these ids.
- If a question needs a substantive revision after it's been used, bump
  `version` and consider a new `id` rather than mutating the existing
  item's meaning in place — see
  [`docs/data-model.md`](data-model.md#question--srcdomainquestionstypests).

## Option-count flexibility

`options: AnswerOption[]` has no fixed length. Let the number of
genuinely derivable distractors decide the count — 3 is fine, 6 is fine.
Do not pad to a round number (see category D above), and do not trim a
mathematically solid distractor just to hit exactly 4.
