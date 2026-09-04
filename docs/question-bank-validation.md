# Question Bank Validation

What is checked automatically, how, and — just as important — what is
deliberately *not* checked automatically and why.

## Layered validators

Three layers, each with a distinct job:

1. **`validateDomainModel`** ([`src/domain/validateDomainModel.ts`](../src/domain/validateDomainModel.ts))
   — general Phase 0/1 schema and referential-integrity checks, over
   questions, concepts, and misconceptions together: unique ids, exactly
   one correct option, `correctOptionId` resolves to it, `primaryConceptId`
   is in `conceptIds`, every `conceptIds`/`misconceptionId` reference
   exists, concept-graph acyclicity, no self-dependent or duplicate
   prerequisites, non-empty names/descriptions. Unchanged in Phase 2 —
   still applies to the full 161-question bank exactly as it did to the
   5-question Phase 0 seed set.

2. **`validateQuestionBank`** ([`src/domain/questions/validateQuestionBank.ts`](../src/domain/questions/validateQuestionBank.ts))
   — Phase 2 production-quality gates that only make sense once there's a
   real bank and a difficulty framework to check against: non-empty stem
   and worked solution; no two options with identical display text; no
   distractor whose display text duplicates the correct answer's (an
   ambiguous-MCQ smell); every option carrying a `misconceptionId` also
   carries a non-empty `derivationNote`; difficulty falls inside the
   question's primary concept's `CONCEPT_DIFFICULTY_GUIDANCE` range.

3. **`computeBankStatistics` / duplicate-detection functions**
   ([`src/domain/questions/bankStatistics.ts`](../src/domain/questions/bankStatistics.ts))
   — not pass/fail validators but reporting functions: counts by strand,
   concept, difficulty, misconception; option-count histogram; which
   concepts have zero or low (<2) question coverage; which misconceptions
   are never represented; duplicate question ids, (normalized) stems,
   option-display sets, and worked solutions. Backs both
   `npm run audit:questions` and the coverage/duplicate-detection tests.

All three run over the full production bank in
`tests/domain/questionBank/`, and `npm run audit:questions` prints a live
human-readable report from the same functions (never hand-maintained
numbers — see `docs/question-bank.md`).

## Mathematical verification

Every question's correct answer and every diagnostic distractor's exact
value were computed programmatically *while authoring* (not worked out by
hand) — see "Authoring methodology" in `docs/question-bank.md`. What's
checked automatically, afterward, in
`tests/domain/questionBank/mathVerification.test.ts`:

- **Substitution checks**: for a representative sample spanning every
  strand, the stated correct root(s) are substituted back into
  `ax² + bx + c` (or the relevant factorised/vertex form) using the shared
  numeric helpers in [`tests/helpers/quadratics.ts`](../tests/helpers/quadratics.ts)
  and confirmed to evaluate to (approximately) zero — or, for
  factorisations/expansions, the two forms are confirmed equal at several
  sample x values.
- **Misconception-family checks**: for each of five misconception
  families used repeatedly across the bank (`B2_PLUS_4AC`,
  `NEGATIVE_B_DROPPED`, `ROOT_SUM_SIGN_ERROR`/`ROOT_PRODUCT_SIGN_ERROR`,
  `FACTOR_SIGN_ERROR`, `PLUS_MINUS_DROPPED`), several real questions'
  `(a, b, c)` are re-substituted into that misconception's flawed formula
  (e.g. `b² + 4ac` instead of `b² − 4ac`) and the result is confirmed to
  match the distractor actually shown — and to differ from the correct
  value.

This is **representative, not exhaustive** — 161 questions is too many to
usefully hand-maintain one bespoke symbolic-algebra test per item, and
doing so would mostly test the test-writer's transcription, not the
mathematics. The representative sample was chosen to cover every strand
at least once and to directly demonstrate (per the Phase 2 brief) that
distractors are *derivable*, not just plausible-looking.

## What is deliberately not automated

- **No symbolic algebra engine.** Checks use plain numeric substitution
  and hardcoded coefficients matched to specific question ids, not a CAS.
  This is intentional (`docs/question-authoring-guide.md`: "do not build
  a universal algebra parser") — it keeps verification legible and
  dependency-free, at the cost of the test author having to correctly
  transcribe each question's `(a, b, c)` into the test.
- **No automated check that non-diagnostic distractors are "plausible."**
  Plausibility is a judgment call verified during authoring (and in
  review), not something a script can assess.
- **No automated check of prose quality** (stem clarity, absence of
  ambiguity, absence of trick-question phrasing) — this is a human
  authoring standard (`docs/question-authoring-guide.md`, "Avoiding
  ambiguity"), not a testable property.

## Duplicate detection: false positives are expected and documented

`findDuplicateOptionSetGroups` flags questions that share an identical
*set* of option display strings, regardless of question content. In this
bank that legitimately fires for classification-style questions (e.g.
several "how many real roots does ... have?" questions all choosing among
the same three category labels: "no real roots" / "one repeated real
root" / "two distinct real roots"). These are not duplicate questions —
the underlying equations and correct answers differ — so
`npm run audit:questions` reports them as informational and does not fail
the build on them; only a duplicate *stem* (meaning the same question
text was accidentally authored twice) is treated as a real error. See the
"Duplicate analysis" section of the Phase 2 completion report for the
specific groups found and why each was accepted rather than reworded.

## Difficulty-distribution tolerance

`tests/domain/questionBank/bankCoverage.test.ts` checks the overall
difficulty distribution against wide bands (e.g. Level 2 must fall
between 15% and 35%), not the tighter target bands from
`docs/question-bank.md` (20-25%). This mirrors the Phase 2 brief directly:
flag *major* imbalance (its own example: "Level 1: 45%, Level 5: 1%"), not
minor drift from a target that was itself advisory ("approximately").
