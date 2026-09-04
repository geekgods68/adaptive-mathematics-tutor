# Difficulty Framework

Source of truth:
[`src/domain/curriculum/difficultyFramework.ts`](../src/domain/curriculum/difficultyFramework.ts)
(what each level means) and
[`src/domain/curriculum/conceptDifficultyGuidance.ts`](../src/domain/curriculum/conceptDifficultyGuidance.ts)
(which levels each concept supports).

## Difficulty is about reasoning structure, not arithmetic size

`Question.difficulty` (1-5) is not a proxy for "how big are the numbers."
A question with three-digit coefficients but one signposted operation is
still Difficulty 1-2; a question with single-digit numbers that requires
reverse reasoning across two concepts is Difficulty 4-5. What actually
drives difficulty:

- number of reasoning steps
- how much algebraic manipulation is required
- whether the given representation is the one the method needs, or must
  first be converted
- whether the method to use is signposted by the question or must be
  chosen
- how many concepts are combined
- whether reasoning must run backwards (from an outcome to a constraint)
  rather than forwards
- whether a parameter is present
- whether irrelevant information is present
- how abstract/unfamiliar the presentation is

## The five levels

### Level 1 — Direct Recognition / Single Skill

One concept, one obvious operation, on values already in the form the
operation needs. The method is explicit, not inferred.

- Identify whether an expression is quadratic.
- Given `x² − 5x + 6 = 0`, state `a = 1, b = −5, c = 6`.
- State the direction a parabola opens, given its equation.
- Compute a discriminant when `a`, `b`, `c` are already supplied.

### Level 2 — Routine Application

A standard procedure, start to finish, on a straightforward instance of
one primary concept. 1-2 reasoning steps, familiar representation.

- Factorise a straightforward monic quadratic, e.g. `x² − 5x + 6`.
- Solve a quadratic already given in factorised form.
- Identify the roots of a quadratic from its graph.
- Find the axis of symmetry of `y = x² − 4x + 1`.

### Level 3 — Multi-Step / Representation Conversion

Several steps, typically including a representation conversion (rearrange
before factorising, standard form to completed-square form) before the
primary procedure applies. Two related concepts.

- Rearrange `x(x − 5) = 6` into standard form before solving.
- Convert `x² + 6x + 1` to completed-square form.
- Use the discriminant to state the number of real roots of a given
  equation.
- Infer a graph's y-intercept and opening direction directly from its
  equation.

### Level 4 — Integrated Reasoning

Multiple concepts, a non-obvious setup, some reverse reasoning, more than
one plausible approach.

- Combine discriminant reasoning with an unknown parameter: "for what
  values of `k` does `x² + kx + 9 = 0` have exactly one real root?"
- Determine an unknown coefficient from a stated relationship between the
  roots.
- Infer a quadratic's equation from stated graphical properties (vertex
  plus one point, say).
- Find where a line and a parabola intersect, requiring the student to
  set up the simultaneous equation themselves.

### Level 5 — Advanced Reasoning

Several concepts combined, abstract or unfamiliar presentation, minimal
procedural signposting — the student must decide the approach — and
several distractors are plausible unless the whole problem is reasoned
through carefully. TMUA-style discrimination between strong and weak
understanding.

- Parameter constraints combining the discriminant with a second
  condition (e.g. "and the roots are both positive").
- Reverse-engineer a quadratic's coefficients from a mix of root and
  graph information.
- Combine roots, graph properties, and coefficients in one multi-part
  chain of reasoning.
- A modelling problem requiring both solving a quadratic and rejecting a
  contextually invalid root.

## Why the same numbers can be two different difficulties

Compare:

- *"Compute the discriminant of `2x² − 4x + 5 = 0`."* — Level 1. One
  operation, explicit, no interpretation required.
- *"How many real roots does `2x² − 4x + 5 = 0` have?"* — Level 3-4 (this
  is `q-discriminant-nature-01` in the seed data, Difficulty 4, because it
  additionally requires: computing the discriminant, correctly
  interpreting its sign as a root count, AND resisting the pull of a
  wrong-but-plausible factorisation attempt as a distractor path).

Same equation, same underlying arithmetic — different difficulty, because
difficulty tracks what the student has to *do with* the arithmetic, not
the arithmetic itself.

## Per-concept difficulty ranges

Not every concept supports the full 1-5 range — forcing "collecting like
terms" to Difficulty 5 would not produce a meaningful question. See
[`CONCEPT_DIFFICULTY_GUIDANCE`](../src/domain/curriculum/conceptDifficultyGuidance.ts)
for the full per-concept table (35 entries); representative examples:

| Concept | Range | Why |
| --- | --- | --- |
| Collecting Like Terms | 1 | Purely mechanical; no meaningful harder variant within scope |
| Factorising Monic Quadratics | 1-3 | Routine at 1-2; multi-step when combined with rearrangement at 3 |
| Completing the Square | 2-4 | Genuinely multi-step; can be combined with vertex-form reasoning at 4 |
| Discriminant: Parameter Reasoning | 4-5 | Inherently reverse reasoning plus a parameter — never a Level 1-2 skill |
| Line-Parabola Intersections | 3-5 | Setup-heavy at 3; open-ended at 5 with an added constraint |
