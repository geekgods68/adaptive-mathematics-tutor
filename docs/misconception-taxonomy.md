# Misconception Taxonomy

Source of truth: [`src/domain/misconceptions/data.ts`](../src/domain/misconceptions/data.ts)
(35 entries). This document is the human-readable write-up of that data,
generated from it directly — if the two ever disagree, the code is
correct and this file is stale.

## Evidence vs. persistent misconception

A `misconceptionId` on a selected `AnswerOption` is **evidence consistent
with** that misconception — not proof the student has it. A single wrong
answer could be a slip (a momentary arithmetic error unrelated to the
student's actual understanding) rather than the persistent flawed
reasoning the misconception describes. Write and talk about this using:

> "response consistent with misconception X" / "misconception evidence"

not:

> "the student has misconception X" / "the student definitely thinks..."

The non-adaptive tutor in this repository only ever logs this evidence
(via `ResearchEvent`s) — it never acts on it. A later adaptive system may
choose to require repeated evidence across multiple questions before
treating a misconception as persistent enough to intervene on; that
policy decision is out of scope here (see
[`docs/experimental-conditions.md`](experimental-conditions.md)).

## Taxonomy (35 entries, 11 categories)

## Signs and Rearrangement

### SIGN_ERROR_TRANSPOSE

**Sign error while transposing a term**

Moves a term across the equals sign without flipping its sign.

- **Associated concepts:** Algebraic Rearrangement, Rearranging Into Standard Form Before Solving
- **Error pattern:** Transposes a term without negating it.
- **Example:** From x² + 3x = 5, writes the standard form as x² + 3x + 5 = 0 instead of x² + 3x − 5 = 0.

### NEGATIVE_COEFFICIENT_MISHANDLED

**Drops the sign of a negative coefficient**

Mishandles a negative coefficient when identifying a, b, c or substituting into a formula.

- **Associated concepts:** Identifying a, b, and c, The Quadratic Formula
- **Error pattern:** Reads off a coefficient's magnitude but drops its negative sign.
- **Example:** For x² − 5x − 6 = 0, states b = 5 instead of b = −5.

### NEGATIVE_SQUARE_ERROR

**Squares a negative value with the wrong sign**

Treats (−n)² as −n² instead of +n².

- **Associated concepts:** Expanding Two Binomials, Completing the Square
- **Error pattern:** Carries a negative sign through a squaring operation instead of it cancelling.
- **Example:** Within expanding (x − 3)², computes (−3)² as −9 instead of 9.

## Expansion

### DISTRIBUTION_ERROR

**General error expanding brackets**

While expanding two brackets, drops, mis-signs, or mis-combines one of the terms, without a more specific pattern applying.

- **Associated concepts:** Expanding Two Binomials
- **Error pattern:** One term of the expansion is dropped, mis-signed, or mis-combined with another.
- **Example:** Expands (x + 3)(x − 4) as x² − 7x − 12, combining the coefficients 4 and 3 by addition instead of computing −4x + 3x.

### FOIL_TERM_OMITTED

**Omits a term when expanding two binomials**

Omits one of the four terms (typically a cross term) produced when expanding two binomials.

- **Associated concepts:** Expanding Two Binomials
- **Error pattern:** Multiplies only the first and last terms of each bracket, skipping both cross terms.
- **Example:** Expands (x + 3)(x − 4) as x² − 12, omitting the −4x and 3x cross terms entirely.

### SQUARE_OF_BINOMIAL_ERROR

**Treats (a + b)² as a² + b²**

Squares a binomial by squaring each term separately, omitting the cross term 2ab.

- **Associated concepts:** Expanding Two Binomials, Completing the Square
- **Error pattern:** Applies '(a+b)² = a² + b²' rather than expanding fully.
- **Example:** Computes (x + 3)² as x² + 9 instead of x² + 6x + 9.

## Factorisation

### FACTOR_SUM_PRODUCT_CONFUSION

**Confuses the sum and product conditions**

When choosing a factor pair for x² + bx + c, searches for two numbers satisfying the wrong combination of sum and product (or a pair that satisfies neither correctly).

- **Associated concepts:** Factorising Monic Quadratics, Factorising Non-Monic Quadratics
- **Error pattern:** Selects a factor pair without correctly checking both the required sum and the required product.
- **Example:** For x² + 7x + 12, searches for two numbers that sum to 12 and multiply to 7, instead of two numbers that multiply to 12 and sum to 7.

### FACTOR_SIGN_ERROR

**Wrong sign assigned to a factor or root**

Finds the correct factor magnitudes but assigns the wrong sign to one factor, or copies a factor's internal sign directly as a root's sign instead of negating it.

- **Associated concepts:** Factorising Monic Quadratics, Factorising Non-Monic Quadratics, Solving Quadratic Equations by Factorisation
- **Error pattern:** The magnitude is right; the sign of a factor, or of the root derived from it, is wrong.
- **Example:** Factorises x² + 2x − 15 as (x − 5)(x + 3) instead of (x + 5)(x − 3); or, having correctly reached (x − 2)(x − 3) = 0, gives the roots as x = −2 and x = −3 instead of x = 2 and x = 3.

### LEADING_COEFFICIENT_IGNORED

**Ignores the leading coefficient when factorising**

Factorises ax² + bx + c as though a = 1, ignoring the leading coefficient's effect on the factor pair.

- **Associated concepts:** Factorising Non-Monic Quadratics
- **Error pattern:** Uses only b and c to find a factor pair, never incorporating a.
- **Example:** For 2x² + 7x + 6, treats it as x² + 7x + 6, finds the factor pair 1 and 6 (sum 7, product 6), and writes (x + 1)(x + 6) — which expands to x² + 7x + 6, not 2x² + 7x + 6.

### DIFFERENCE_OF_SQUARES_MISAPPLIED

**Applies the difference-of-squares pattern where it doesn't apply**

Factorises an expression as a difference of two squares when it is not a difference of two squares (e.g. it is a sum).

- **Associated concepts:** Difference of Two Squares, Recognising Non-Factorisable Expressions
- **Error pattern:** Pattern-matches on 'two squared terms' without checking that they are subtracted.
- **Example:** Factorises x² + 9 as (x + 3)(x − 3), which expands to x² − 9, not x² + 9.

## Zero-Product Principle

### ZERO_PRODUCT_NOT_APPLIED

**Does not apply the zero-product principle**

Having reached a factorised equation equal to zero, does not set each factor to zero and solve separately.

- **Associated concepts:** The Zero-Product Principle, Solving Quadratic Equations by Factorisation
- **Error pattern:** Manipulates the factorised equation as an ordinary algebraic expression rather than applying the zero-product principle.
- **Example:** From (x − 2)(x − 3) = 0, adds the two factors' constants together to get a single answer.

### CONSTANT_TREATED_AS_ROOT

**Treats the constant term as a root**

Treats the constant term of the original (unfactorised) equation as if it were itself a root.

- **Associated concepts:** Solving Quadratic Equations by Factorisation
- **Error pattern:** Reads the constant term c directly off ax² + bx + c = 0 and reports x = −c (or x = c) as the answer.
- **Example:** For x² − 5x + 6 = 0, answers x = −6, reading the constant term directly as the root instead of factorising.

### ONLY_ONE_FACTOR_SOLVED

**Solves only one factor**

Sets only one of the two factors to zero and reports a single root, never solving the second factor.

- **Associated concepts:** The Zero-Product Principle, Solving Quadratic Equations by Factorisation
- **Error pattern:** Stops after solving the first factor = 0, without also solving the second.
- **Example:** From (x − 2)(x − 3) = 0, solves x − 2 = 0 to get x = 2, and reports only x = 2.

## Completing the Square

### HALF_B_NOT_SQUARED

**Uses b/2 instead of (b/2)² when completing the square**

Adds or subtracts b/2 instead of (b/2)² when completing the square.

- **Associated concepts:** Completing the Square
- **Error pattern:** Uses the half-coefficient itself as the balancing term instead of squaring it.
- **Example:** For x² + 6x + 1, writes (x + 3)² + 1 − 3 instead of (x + 3)² + 1 − 9.

### HALF_B_SIGN_ERROR

**Wrong sign inside the completed-square bracket**

Uses the wrong sign for the constant inside the completed-square bracket.

- **Associated concepts:** Completing the Square
- **Error pattern:** Writes (x + b/2)² regardless of the sign of b.
- **Example:** For x² − 6x + 1, writes (x + 3)² instead of (x − 3)² when completing the square.

### BALANCING_TERM_NOT_SUBTRACTED

**Adds the balancing term inside without subtracting it outside**

Adds (b/2)² inside the bracket but forgets to subtract the equivalent amount outside it, changing the expression's value.

- **Associated concepts:** Completing the Square
- **Error pattern:** Adds (b/2)² to complete the square but never compensates for the amount added.
- **Example:** For x² + 6x + 1, writes (x + 3)² + 1 instead of (x + 3)² + 1 − 9 = (x + 3)² − 8.

## Quadratic Formula

### NEGATIVE_B_DROPPED

**Substitutes +b instead of −b**

Substitutes +b instead of −b into the numerator of the quadratic formula.

- **Associated concepts:** The Quadratic Formula
- **Error pattern:** Uses (b ± √(b²−4ac)) / 2a instead of (−b ± √(b²−4ac)) / 2a.
- **Example:** For x² + 4x − 1 = 0 (b = 4), computes x = (4 ± √20) / 2 instead of x = (−4 ± √20) / 2.

### PLUS_MINUS_DROPPED

**Drops one branch of ±**

Interprets ± as producing a single value rather than two possible values, and reports only one root.

- **Associated concepts:** The Quadratic Formula, Correct Interpretation of ±, Solving by Completing the Square
- **Error pattern:** Keeps only the positive (or only the negative) branch of a ± expression.
- **Example:** From x = −2 ± √5, records only x = −2 + √5.

### DENOMINATOR_ONLY_APPLIED_TO_RADICAL

**Divides only the square root by 2a**

Divides only the √(b²−4ac) term by 2a, not the whole numerator (−b ± √(b²−4ac)).

- **Associated concepts:** The Quadratic Formula
- **Error pattern:** Treats 2a as the denominator of the radical only, not of the full numerator.
- **Example:** Computes x = −4 ± (√20 / 2) instead of x = (−4 ± √20) / 2.

### FORMULA_COEFFICIENT_SUBSTITUTION_ERROR

**Substitutes a, b, c into the wrong position**

Substitutes a, b, or c into the wrong position in the quadratic formula.

- **Associated concepts:** The Quadratic Formula, Identifying a, b, and c
- **Error pattern:** Swaps two of a, b, c when substituting into the formula.
- **Example:** For 2x² + 3x − 2 = 0, substitutes a = 3 and b = 2 (swapping a and b) instead of a = 2, b = 3.

## Discriminant

### B_SQUARED_AS_2B

**Computes b² as 2b**

Computes b² as 2 × b instead of b × b.

- **Associated concepts:** Computing the Discriminant
- **Error pattern:** Confuses squaring with doubling.
- **Example:** For b = −4, computes b² as −8 instead of 16.

### B2_PLUS_4AC

**Computes the discriminant as b² + 4ac**

Computes the discriminant as b² + 4ac instead of the correct b² − 4ac.

- **Associated concepts:** Computing the Discriminant
- **Error pattern:** Uses + instead of − before the 4ac term.
- **Example:** For a = 2, b = −4, c = 5, computes 16 + 40 = 56 instead of 16 − 40 = −24.

### ROOT_COUNT_INTERPRETATION_REVERSED

**Reverses the discriminant-sign-to-root-count rule**

Reverses the association between the sign of the discriminant and the number of real roots.

- **Associated concepts:** Nature of Roots From the Discriminant
- **Error pattern:** Associates a negative discriminant with real roots and a positive discriminant with no real roots.
- **Example:** States that a discriminant of −24 means the equation has two real roots.

### ZERO_DISCRIMINANT_TWO_DISTINCT_ROOTS

**Believes a zero discriminant gives two distinct roots**

Believes a discriminant of exactly zero gives two distinct real roots rather than one repeated root.

- **Associated concepts:** Nature of Roots From the Discriminant
- **Error pattern:** Treats discriminant = 0 the same as discriminant > 0.
- **Example:** For x² − 6x + 9 = 0 (discriminant = 0), states 'two distinct real roots' instead of 'one repeated root, x = 3'.

## Roots and Coefficients

### ROOT_SUM_SIGN_ERROR

**Computes the sum of roots with the wrong sign**

Computes the sum of the roots as +b/a instead of −b/a.

- **Associated concepts:** Sum and Product of Roots
- **Error pattern:** Omits the negative sign in the sum-of-roots formula −b/a.
- **Example:** For x² + 5x + 6 = 0, states the sum of the roots is 5 instead of −5.

### ROOT_PRODUCT_SIGN_ERROR

**Computes the product of roots with the wrong sign**

Computes the product of the roots as −c/a instead of c/a.

- **Associated concepts:** Sum and Product of Roots
- **Error pattern:** Introduces a spurious negative sign in the product-of-roots formula c/a.
- **Example:** For x² + 5x + 6 = 0, states the product of the roots is −6 instead of 6.

### ROOT_COEFFICIENT_CONFUSION

**Confuses which coefficient relates to sum vs. product**

Confuses which coefficient relates to the sum of the roots and which relates to the product.

- **Associated concepts:** Sum and Product of Roots, Constructing a Quadratic From Given Roots
- **Error pattern:** Uses the sum of the roots where the product is needed in the formula x² − (sum)x + (product), or vice versa.
- **Example:** To construct a quadratic with roots 2 and 3 (sum 5, product 6), writes x² − 6x + 5 instead of x² − 5x + 6.

## Graphs

### VERTEX_X_COORDINATE_SIGN_ERROR

**Computes the vertex x-coordinate with the wrong sign**

Computes the x-coordinate of the vertex as b/2a instead of −b/2a.

- **Associated concepts:** Vertex and Axis of Symmetry
- **Error pattern:** Omits the negative sign in the vertex formula x = −b/2a.
- **Example:** For y = x² − 4x + 1, states the axis of symmetry is x = −2 (computing −4/2 without negating b) instead of x = 2.

### ROOTS_CONFUSED_WITH_Y_INTERCEPT

**Confuses a root with the y-intercept**

Reads the y-intercept off the equation and treats its value as if it were a root, or vice versa.

- **Associated concepts:** Parabola Shape and Key Features, Roots as x-Intercepts
- **Error pattern:** Uses the constant term c as a root instead of as the y-intercept.
- **Example:** For y = x² − 5x + 6, states 'x = 6 is a root' by reading off the y-intercept, instead of solving to find the roots x = 2 and x = 3.

### AXIS_OF_SYMMETRY_CONFUSED_WITH_ROOT

**Confuses a root with the axis of symmetry**

Treats one of the roots as if it were the axis of symmetry, instead of their midpoint.

- **Associated concepts:** Vertex and Axis of Symmetry, Roots as x-Intercepts
- **Error pattern:** Reports one root's x-value as the axis of symmetry instead of averaging both roots.
- **Example:** For roots x = 2 and x = 6, states the axis of symmetry is x = 2 instead of the midpoint x = 4.

### PARABOLA_DIRECTION_ERROR

**Confuses the sign of a with the opening direction**

States the parabola opens downward when a > 0 (or upward when a < 0).

- **Associated concepts:** Parabola Shape and Key Features
- **Error pattern:** Associates a positive leading coefficient with a downward-opening parabola, or vice versa.
- **Example:** For y = 2x² − 3x + 1 (a = 2 > 0), states the parabola opens downward.

## Transformations

### HORIZONTAL_TRANSLATION_DIRECTION_ERROR

**Reads the horizontal translation in the wrong direction**

Reads the horizontal translation of a(x − h)² + k in the wrong direction, confusing the sign inside the bracket.

- **Associated concepts:** Vertex Form, Graph Transformations
- **Error pattern:** Associates (x − h) with a translation of −h rather than +h.
- **Example:** For y = (x − 3)² + 1, states the graph is y = x² translated 3 units left instead of 3 units right.

### VERTICAL_TRANSLATION_SIGN_ERROR

**Misreads the sign of a vertical translation**

Misreads the sign of k as a vertical translation in a(x − h)² + k.

- **Associated concepts:** Vertex Form, Graph Transformations
- **Error pattern:** Flips the sign of k when describing the vertical translation.
- **Example:** For y = (x + 2)² − 5, states the graph is translated 5 units up instead of 5 units down.

### STRETCH_TRANSLATION_CONFUSION

**Confuses a stretch with a translation**

Confuses a vertical stretch/compression (from the coefficient a) with a translation.

- **Associated concepts:** Graph Transformations
- **Error pattern:** Describes the leading coefficient a as shifting the graph rather than stretching or compressing it.
- **Example:** For y = 3(x − 1)² + 2, describes the factor of 3 as a translation rather than a vertical stretch.

## Intersections and Modelling

### EXTRANEOUS_SOLUTION_NOT_REJECTED

**Accepts a contextually invalid solution**

Accepts a mathematically valid root that is not valid in the modelling context (e.g. negative time or length) without checking.

- **Associated concepts:** Modelling With Quadratics
- **Error pattern:** Reports every algebraic solution without checking whether it makes sense in context.
- **Example:** For a height model h(t) = −5t² + 20t + 2 solved for h = 0, giving t ≈ 4.06 or t ≈ −0.10, reports t ≈ −0.10 as a valid answer despite negative time being physically impossible.

