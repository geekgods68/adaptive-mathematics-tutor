# Pilot question review

Stage B contains exactly 25 original items. This readable view is supplementary; CSV and JSONL are the authoritative machine-readable exports. All items still require independent expert review before research deployment.

## MATH-CH01-0001

**Chapter:** CH01 · **Primary concept:** ALG01 · **Author difficulty:** 1 · **Type:** computational

Evaluate \(-3^2+2(5-1)\).

- **A.** \(-1\)
- **B.** \(17\)
- **C.** \(1\)
- **D.** \(0\)

**Correct option:** A

**Worked solution**

Exponentiation gives \(-3^2=-(3^2)=-9\). The bracket is \(4\), so the expression is \(-9+2\cdot4=-1\).

**Option explanations**

- **A:** Correct: the exponent applies before the leading minus.
- **B:** Treats \(-3^2\) as \((-3)^2=9\), giving \(9+8=17\). Diagnostic mapping: M001.
- **C:** Evaluates the bracket \(5-1\) as 5, then computes \(-9+2\cdot5=1\), omitting the subtraction inside the bracket. Diagnostic mapping: M004.
- **D:** Expands \(2(5-1)\) as \(10-1=9\), then obtains \(-9+9=0\). Diagnostic mapping: M005.

**Assumed prerequisites:** None within this taxonomy.
**Direct concept weights:** {"ALG01": 1.0}
**Domain:** Real quantities unless otherwise stated.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH01-0002

**Chapter:** CH01 · **Primary concept:** ALG07 · **Author difficulty:** 2 · **Type:** computational

What is the complete real solution set of \(x^2-5x+6=0\)?

- **A.** \(\{3\}\)
- **B.** \(\{-3,-2\}\)
- **C.** \(\{1,6\}\)
- **D.** \(\{2,3\}\)

**Correct option:** D

**Worked solution**

Factor: \(x^2-5x+6=(x-2)(x-3)\). A product is zero exactly when a factor is zero, so \(x=2\) or \(x=3\).

**Option explanations**

- **A:** Keeps only the root from \(x-3=0\), omitting \(x=2\). Diagnostic mapping: M010.
- **B:** Uses \((x+2)(x+3)\), which has middle term \(+5x\), not \(-5x\). Diagnostic mapping: M009.
- **C:** Chooses a pair with product 6 but sum 7 instead of 5. Diagnostic mapping: M009.
- **D:** Correct: both roots satisfy the equation.

**Assumed prerequisites:** ALG04, ALG05.
**Direct concept weights:** {"ALG07": 1.0}
**Domain:** \(x\in\mathbb R\).
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH02-0001

**Chapter:** CH02 · **Primary concept:** FUN04 · **Author difficulty:** 2 · **Type:** computational

Let \(f(x)=2x-3\) and \(g(x)=x^2+1\) for real \(x\). Find \((f\circ g)(2)\).

- **A.** \(5\)
- **B.** \(7\)
- **C.** \(2\)
- **D.** \(13\)

**Correct option:** B

**Worked solution**

First \(g(2)=2^2+1=5\). Then \(f(5)=2\cdot5-3=7\).

**Option explanations**

- **A:** Omits the constant 1 in \(g\), giving \(f(4)=2\cdot4-3=5\). Diagnostic mapping: M004.
- **B:** Correct: composition evaluates the inner function first.
- **C:** Reverses the order: \(g(f(2))=g(1)=2\). Diagnostic mapping: M015.
- **D:** Changes the subtraction in \(f(5)=10-3\) to addition, obtaining 13. Diagnostic mapping: M004.

**Assumed prerequisites:** FUN01.
**Direct concept weights:** {"FUN04": 1.0}
**Domain:** Real quantities unless otherwise stated.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH02-0002

**Chapter:** CH02 · **Primary concept:** FUN06 · **Author difficulty:** 3 · **Type:** graphical_interpretation

The graph of \(f(x)=(x-3)^2+5\) has vertex \((3,5)\). Define \(g(x)=-2f(x+1)+4\). What is the vertex of the graph of \(g\)?

- **A.** \((2,-2)\)
- **B.** \((2,-6)\)
- **C.** \((2,14)\)
- **D.** \((4,-6)\)

**Correct option:** B

**Worked solution**

\(f(x+1)=(x-2)^2+5\), so \(g(x)=-2(x-2)^2-6\). Its vertex is \((2,-6)\). Equivalently, the input shift moves the vertex left by 1 and the output becomes \(-2\cdot5+4=-6\).

**Option explanations**

- **A:** Doubles the outer translation too: \(-2\cdot5+2\cdot4=-2\). Diagnostic mapping: M018.
- **B:** Correct: apply the input and output transformations in their stated locations.
- **C:** Drops the negative sign on the vertical factor: \(2\cdot5+4=14\). Diagnostic mapping: M004.
- **D:** Reverses the horizontal shift, moving 3 to 4 instead of 2. Diagnostic mapping: M018.

**Assumed prerequisites:** FUN02.
**Direct concept weights:** {"FUN06": 1.0}
**Domain:** \(x\in\mathbb R\); both graphs are specified exactly by formulas, so no image is needed.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH03-0001

**Chapter:** CH03 · **Primary concept:** EXP02 · **Author difficulty:** 1 · **Type:** computational

Evaluate \(16^{-3/4}\) as a real number.

- **A.** \(8\)
- **B.** \(-\frac18\)
- **C.** \(\frac16\)
- **D.** \(\frac18\)

**Correct option:** D

**Worked solution**

\(16^{1/4}=2\), hence \(16^{3/4}=2^3=8\). The negative exponent takes the reciprocal, so \(16^{-3/4}=1/8\).

**Option explanations**

- **A:** Ignores the negative exponent and computes \(16^{3/4}\). Diagnostic mapping: M022.
- **B:** Treats the minus sign in the exponent as an external negative sign while also taking the reciprocal. Diagnostic mapping: M022.
- **C:** Treats cubing the fourth root as multiplying by 3: \(1/(3\cdot2)=1/6\). Diagnostic mapping: M023.
- **D:** Correct: take the fourth root, cube, then invert.

**Assumed prerequisites:** EXP01, ALG02.
**Direct concept weights:** {"EXP02": 1.0}
**Domain:** The base 16 is positive; use the positive real fourth root.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH04-0001

**Chapter:** CH04 · **Primary concept:** LOG02 · **Author difficulty:** 2 · **Type:** computational

Find \(\log_2 8+\log_2 4\).

- **A.** \(5\)
- **B.** \(1\)
- **C.** \(6\)
- **D.** \(\log_2 12\)

**Correct option:** A

**Worked solution**

\(\log_2 8=3\) and \(\log_2 4=2\), so the sum is \(5\). Also, the product law gives \(\log_2 32=5\).

**Option explanations**

- **A:** Correct: add the logarithm values or multiply the arguments.
- **B:** Uses a quotient rather than a product: \(\log_2(8/4)=1\). Diagnostic mapping: M025.
- **C:** Multiplies the log values \(3\cdot2\) instead of adding them. Diagnostic mapping: M025.
- **D:** Incorrectly adds arguments: \(\log_2 8+\log_2 4\ne\log_2(8+4)\). Diagnostic mapping: M025.

**Assumed prerequisites:** LOG01.
**Direct concept weights:** {"LOG02": 1.0}
**Domain:** Base 2 is positive and not 1; arguments 8 and 4 are positive.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH04-0002

**Chapter:** CH04 · **Primary concept:** LOG03 · **Author difficulty:** 3 · **Type:** computational

Solve \(\log_2(x-1)+\log_2(x-3)=3\) over the reals.

- **A.** \(x=-1\)
- **B.** \(x=5\)
- **C.** \(x\in\{-1,5\}\)
- **D.** \(x=6\)

**Correct option:** B

**Worked solution**

Both arguments must be positive, so \(x>3\). The product law gives \((x-1)(x-3)=2^3=8\), hence \(x^2-4x-5=(x-5)(x+1)=0\). The candidates are \(5,-1\), but only \(5\) is in the domain; it gives \(\log_2 4+\log_2 2=3\).

**Option explanations**

- **A:** Keeps only the extraneous algebraic root; logarithms of negative real arguments are not defined here. Diagnostic mapping: M012.
- **B:** Correct: 5 satisfies the equation and the domain restrictions.
- **C:** Finds the polynomial roots but fails to reject the invalid negative candidate. Diagnostic mapping: M012.
- **D:** Uses the false law \(\log_2[(x-1)+(x-3)]=3\), obtaining \(2x-4=8\) and \(x=6\). Diagnostic mapping: M025.

**Assumed prerequisites:** LOG02, ALG07, ALG11.
**Direct concept weights:** {"LOG03": 1.0}
**Domain:** \(x\in\mathbb R\); require \(x-1>0\) and \(x-3>0\).
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH05-0001

**Chapter:** CH05 · **Primary concept:** DIF04 · **Author difficulty:** 2 · **Type:** error_diagnosis

A student differentiates \(y=(3x^2+1)^4\) and writes \(dy/dx=4(3x^2+1)^3\), omitting a chain-rule factor. Which derivative correctly repairs this error?

- **A.** \(24x(3x^2+1)^4\)
- **B.** \(12x(3x^2+1)^3\)
- **C.** \(24x(3x^2+1)^3\)
- **D.** \(4(3x^2+1)^3\)

**Correct option:** C

**Worked solution**

The outer derivative is \(4(3x^2+1)^3\), and the inner derivative is \(6x\). Multiply to obtain \(24x(3x^2+1)^3\).

**Option explanations**

- **A:** Includes the inner derivative but fails to reduce the outer exponent from 4 to 3. Diagnostic mapping: M028.
- **B:** Uses \(3x\) rather than \(6x\) for the derivative of \(3x^2+1\). Diagnostic mapping: M028.
- **C:** Correct: the chain rule multiplies the two derivatives.
- **D:** Omits the inner derivative \(6x\). Diagnostic mapping: M029.

**Assumed prerequisites:** DIF03, FUN04.
**Direct concept weights:** {"DIF04": 1.0}
**Domain:** All real \(x\); options describe derivative functions, not isolated values.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH05-0002

**Chapter:** CH05 · **Primary concept:** DIF06 · **Author difficulty:** 3 · **Type:** computational

The curve \(x^2+xy+y^2=7\) passes through \((1,2)\). What is the equation of the normal at this point?

- **A.** \(y-2=\frac54(x-1)\)
- **B.** \(y-2=\frac45(x-1)\)
- **C.** \(y-2=-\frac45(x-1)\)
- **D.** \(y-2=-\frac54(x-1)\)

**Correct option:** A

**Worked solution**

Implicit differentiation gives \(2x+y+xy\prime+2yy\prime=0\), so \(y\prime=-(2x+y)/(x+2y)\). At \((1,2)\), the tangent gradient is \(-4/5\). The normal gradient is its negative reciprocal, \(5/4\), so \(y-2=(5/4)(x-1)\).

**Option explanations**

- **A:** Correct: the normal passes through the point and is perpendicular to the tangent.
- **B:** Negates the tangent gradient but omits the reciprocal. Diagnostic mapping: M040.
- **C:** Uses the tangent gradient instead of the normal gradient. Diagnostic mapping: M040.
- **D:** Takes a reciprocal without negating it. Diagnostic mapping: M040.

**Assumed prerequisites:** DIF04.
**Direct concept weights:** {"DIF06": 0.8, "GEO05": 0.2}
**Domain:** At \((x,y)=(1,2)\), the implicit derivative denominator is \(1+4=5\ne0\).
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH05-0003

**Chapter:** CH05 · **Primary concept:** DIF07 · **Author difficulty:** 5 · **Type:** mathematical_reasoning

For real \(a\), let \(f_a(x)=x^3-3ax\) on \([-1,1]\). Choose \(a\) to minimise \(\max_{-1\le x\le1}|f_a\prime(x)|\). What is the minimising value of \(a\)?

- **A.** \(0\)
- **B.** \(1\)
- **C.** \(\frac23\)
- **D.** \(\frac12\)
- **E.** \(\frac13\)

**Correct option:** D

**Worked solution**

\(f_a\prime(x)=3(x^2-a)\). Since \(x^2\) ranges over \([0,1]\), the maximum is \(3\max(|a|,|1-a|)\). The inequality \(1\le |a|+|1-a|\) implies this maximum is at least \(3/2\). Equality is attained uniquely when \(a=1/2\), which balances the two endpoint deviations.

**Option explanations**

- **A:** Cancels the derivative only at \(x=0\); the maximum is 3, not the minimum possible. Diagnostic mapping: M032.
- **B:** Cancels the derivative only at \(x=1\); the opposite extreme still gives maximum 3. Diagnostic mapping: M032.
- **C:** Replaces the true range of \(x^2\), \([0,1]\), by \([1/3,1]\), mistaking its uniform mean for its minimum; the midpoint of that wrong interval is \(2/3\). Diagnostic mapping: M032.
- **D:** Correct: balance the extremes \(x^2=0\) and \(x^2=1\).
- **E:** Optimises a squared-average deviation instead of the stated maximum; the mean of \(x^2\) under a uniform average is \(1/3\), but the maximum here is 2. Diagnostic mapping: M032.

**Assumed prerequisites:** DIF03, FUN08, ALG12.
**Direct concept weights:** {"DIF07": 1.0}
**Domain:** \(a\in\mathbb R\), \(x\in[-1,1]\).
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH06-0001

**Chapter:** CH06 · **Primary concept:** INT03 · **Author difficulty:** 3 · **Type:** computational

Evaluate \(\int_0^1 2x(1+x^2)^3\,dx\).

- **A.** \(\frac{15}{4}\)
- **B.** \(4\)
- **C.** \(\frac{15}{2}\)
- **D.** \(\frac{15}{8}\)

**Correct option:** A

**Worked solution**

Use \(u=1+x^2\), so \(du=2x\,dx\). The new bounds are 1 and 2. Thus the integral is \(\int_1^2u^3\,du=[u^4/4]_1^2=(16-1)/4=15/4\).

**Option explanations**

- **A:** Correct: transform both differential and bounds.
- **B:** Uses the new upper bound 2 but retains the old lower bound 0: \([u^4/4]_0^2=4\). Diagnostic mapping: M035.
- **C:** Adds an extra factor 2 after replacing \(2x\,dx\) by \(du\). Diagnostic mapping: M035.
- **D:** Inserts an unnecessary factor \(1/2\) even though the full \(2x\,dx\) already equals \(du\). Diagnostic mapping: M035.

**Assumed prerequisites:** INT02, DIF04.
**Direct concept weights:** {"INT03": 1.0}
**Domain:** The polynomial integrand is continuous on the closed interval [0,1].
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH06-0002

**Chapter:** CH06 · **Primary concept:** INT05 · **Author difficulty:** 4 · **Type:** computational

Evaluate \(\int_2^3 \frac{1}{x(x-1)}\,dx\).

- **A.** \(\ln3\)
- **B.** \(\ln\frac32\)
- **C.** \(\ln\frac34\)
- **D.** \(\ln\frac43\)

**Correct option:** D

**Worked solution**

Decompose \(1/[x(x-1)]=-1/x+1/(x-1)\). On \([2,3]\) both logarithm arguments are positive. Hence the integral is \([\ln(x-1)-\ln x]_2^3=\ln(2/3)-\ln(1/2)=\ln(4/3)\).

**Option explanations**

- **A:** Uses \(+1/x+1/(x-1)\), whose integral over the interval is \(\ln3\). Diagnostic mapping: M036.
- **B:** Drops the \(1/(x-1)\) term and integrates only \(1/x\), giving \(\ln(3/2)\). Diagnostic mapping: M036.
- **C:** Reverses upper and lower evaluations, giving the negative of the positive integral. Diagnostic mapping: M036.
- **D:** Correct: the decomposition has coefficients -1 and +1 and the upper value is reduced by the lower.

**Assumed prerequisites:** INT02, ALG11.
**Direct concept weights:** {"INT05": 1.0}
**Domain:** \(2\le x\le3\), so \(x\ne0,1\). All logs are natural logs.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH07-0001

**Chapter:** CH07 · **Primary concept:** GEO01 · **Author difficulty:** 1 · **Type:** computational

Two interior angles of a triangle are \(48^\circ\) and \(67^\circ\). What is the third interior angle?

- **A.** \(19^\circ\)
- **B.** \(115^\circ\)
- **C.** \(65^\circ\)
- **D.** \(245^\circ\)

**Correct option:** C

**Worked solution**

A triangle has interior-angle sum \(180^\circ\). The third angle is \(180^\circ-48^\circ-67^\circ=65^\circ\).

**Option explanations**

- **A:** Uses the difference of the two given angles, \(67-48=19\). Diagnostic mapping: M038.
- **B:** Adds the two given angles but does not subtract their sum from 180 degrees. Diagnostic mapping: M038.
- **C:** Correct: all three interior angles sum to 180 degrees.
- **D:** Uses the 360-degree full-turn sum instead of the triangle interior-angle sum. Diagnostic mapping: M038.

**Assumed prerequisites:** ALG01.
**Direct concept weights:** {"GEO01": 1.0}
**Domain:** A nondegenerate Euclidean triangle; angle units are degrees.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH07-0002

**Chapter:** CH07 · **Primary concept:** GEO06 · **Author difficulty:** 3 · **Type:** computational

For which real values of \(k\) is the line \(3x+4y=k\) tangent to the circle \((x-1)^2+(y+2)^2=25\)?

- **A.** \(k\in\{-130,120\}\)
- **B.** \(k\in\{-10,0\}\)
- **C.** \(k\in\{-30,20\}\)
- **D.** \(k\in\{-20,30\}\)

**Correct option:** C

**Worked solution**

The centre is \((1,-2)\) and the radius is 5. The perpendicular distance to the line is \(|3-8-k|/\sqrt{3^2+4^2}=|k+5|/5\). Set it equal to 5: \(|k+5|=25\), giving \(k=20\) or \(-30\).

**Option explanations**

- **A:** Uses 25 as the radius and solves \(|k+5|/5=25\). Diagnostic mapping: M041.
- **B:** Omits the normalisation denominator 5 and solves \(|k+5|=5\). Diagnostic mapping: M041.
- **C:** Correct: the centre-to-line distance equals the radius in each case.
- **D:** Mis-signs the centre contribution as +5 rather than -5 and solves \(|k-5|=25\). Diagnostic mapping: M004.

**Assumed prerequisites:** ALG08, ALG12.
**Direct concept weights:** {"GEO06": 0.7, "GEO05": 0.3}
**Domain:** \(k\in\mathbb R\); Euclidean perpendicular distance.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH08-0001

**Chapter:** CH08 · **Primary concept:** TRI05 · **Author difficulty:** 2 · **Type:** computational

Find the exact value of \(\cos^2(\pi/8)-\sin^2(\pi/8)\).

- **A.** \(\frac{2-\sqrt2}{2}\)
- **B.** \(1\)
- **C.** \(0\)
- **D.** \(\frac{\sqrt2}{2}\)

**Correct option:** D

**Worked solution**

The identity \(\cos^2\theta-\sin^2\theta=\cos(2\theta)\) gives \(\cos(\pi/4)=\sqrt2/2\).

**Option explanations**

- **A:** Uses \(2\sin^2\theta\) instead of \(1-2\sin^2\theta\), obtaining \(1-\cos(\pi/4)\). Diagnostic mapping: M044.
- **B:** Uses the sum-of-squares identity even though the expression has a difference. Diagnostic mapping: M044.
- **C:** Assumes the squared sine and squared cosine are equal at \(\pi/8\), which holds at \(\pi/4\), not here. Diagnostic mapping: M044.
- **D:** Correct: the difference of squares is the cosine of twice the angle.

**Assumed prerequisites:** TRI03, ALG04.
**Direct concept weights:** {"TRI05": 1.0}
**Domain:** Angles are in radians.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH08-0002

**Chapter:** CH08 · **Primary concept:** TRI06 · **Author difficulty:** 4 · **Type:** computational

Find the complete solution set of \(\sin(2x)=\cos x\) for \(0\le x<2\pi\).

- **A.** \(\{\pi/6,\pi/2,7\pi/6,3\pi/2\}\)
- **B.** \(\{\pi/2,3\pi/2\}\)
- **C.** \(\{\pi/6,\pi/2,5\pi/6,3\pi/2\}\)
- **D.** \(\{\pi/6,5\pi/6\}\)

**Correct option:** C

**Worked solution**

Use \(\sin(2x)=2\sin x\cos x\), giving \(\cos x(2\sin x-1)=0\). The first factor gives \(\pi/2,3\pi/2\), while \(\sin x=1/2\) gives \(\pi/6,5\pi/6\). All four lie in the specified half-open interval.

**Option explanations**

- **A:** Places the second \(\sin x=1/2\) root in quadrant III instead of quadrant II. Diagnostic mapping: M045.
- **B:** Solves only \(\cos x=0\), omitting the other factor. Diagnostic mapping: M045.
- **C:** Correct: solve both factors and retain every root in the interval.
- **D:** Divides by \(\cos x\), losing the two roots where that factor vanishes. Diagnostic mapping: M045.

**Assumed prerequisites:** TRI03, TRI05, ALG07.
**Direct concept weights:** {"TRI06": 1.0}
**Domain:** \(x\in[0,2\pi)\); radians.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH09-0001

**Chapter:** CH09 · **Primary concept:** VEC04 · **Author difficulty:** 3 · **Type:** computational

In a right-handed orthonormal basis, let \(\mathbf u=(1,2,0)\) and \(\mathbf v=(0,1,3)\). Find \(\mathbf u\times\mathbf v\).

- **A.** \((-6,3,-1)\)
- **B.** \((0,2,0)\)
- **C.** \((6,3,1)\)
- **D.** \((6,-3,1)\)

**Correct option:** D

**Worked solution**

Compute the components: \((2\cdot3-0\cdot1,\;0\cdot0-1\cdot3,\;1\cdot1-2\cdot0)=(6,-3,1)\). Its dot products with both input vectors are zero.

**Option explanations**

- **A:** Reverses the order and computes \(\mathbf v\times\mathbf u\). Diagnostic mapping: M049.
- **B:** Uses componentwise multiplication instead of a cross product. Diagnostic mapping: M048.
- **C:** Omits the negative sign on the middle cofactor in a determinant expansion. Diagnostic mapping: M049.
- **D:** Correct: use the ordered, right-handed cross product.

**Assumed prerequisites:** VEC02.
**Direct concept weights:** {"VEC04": 1.0}
**Domain:** Vectors are in three-dimensional Euclidean space with a right-handed orthonormal basis.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH09-0002

**Chapter:** CH09 · **Primary concept:** VEC07 · **Author difficulty:** 4 · **Type:** computational

Find the shortest distance from \(P=(1,1,0)\) to the line \(\mathbf r=t(1,0,1)\), \(t\in\mathbb R\).

- **A.** \(\frac{\sqrt6}{2}\)
- **B.** \(\sqrt3\)
- **C.** \(\sqrt2\)
- **D.** \(\frac{\sqrt2}{2}\)

**Correct option:** A

**Worked solution**

Take \(\mathbf d=(1,0,1)\) and \(\mathbf p=(1,1,0)\). Then \(\mathbf p\times\mathbf d=(1,-1,-1)\), so the distance is \(\|\mathbf p\times\mathbf d\|/\|\mathbf d\|=\sqrt3/\sqrt2=\sqrt6/2\). Equivalently, minimising \((1-t)^2+1+t^2\) at \(t=1/2\) gives squared distance \(3/2\).

**Option explanations**

- **A:** Correct: use the perpendicular component of the displacement.
- **B:** Uses the cross-product magnitude without dividing by the direction magnitude. Diagnostic mapping: M050.
- **C:** Uses distance from the point to the origin rather than the closest point on the line. Diagnostic mapping: M050.
- **D:** Uses the magnitude of the parallel projection \(|\mathbf p\cdot\mathbf d|/\|\mathbf d\|\) rather than the perpendicular distance. Diagnostic mapping: M050.

**Assumed prerequisites:** VEC03, VEC04, VEC05.
**Direct concept weights:** {"VEC07": 1.0}
**Domain:** The line is infinite and the basis is orthonormal.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH10-0001

**Chapter:** CH10 · **Primary concept:** PRO04 · **Author difficulty:** 3 · **Type:** computational

A condition occurs in 2% of a population. A test has \(P(+\mid D)=0.9\) and \(P(+\mid D^c)=0.1\). For a randomly selected person who tests positive, find \(P(D\mid+)\).

- **A.** \(0.018\)
- **B.** \(\frac9{59}\)
- **C.** \(\frac9{58}\)
- **D.** \(0.9\)

**Correct option:** C

**Worked solution**

The joint probability of the condition and a positive is \(0.02\cdot0.9=0.018\). The total positive probability is \(0.018+0.98\cdot0.1=0.116\). Bayes gives \(0.018/0.116=9/58\).

**Option explanations**

- **A:** Reports the joint probability \(P(D\cap+)\) without dividing by \(P(+)\). Diagnostic mapping: M053.
- **B:** Uses \(0.018+0.1\) as the denominator, failing to weight the false-positive likelihood by \(0.98\). Diagnostic mapping: M053.
- **C:** Correct: condition on all positive tests, including false positives.
- **D:** Reverses the conditional probability and reports sensitivity. Diagnostic mapping: M051.

**Assumed prerequisites:** PRO02.
**Direct concept weights:** {"PRO04": 1.0}
**Domain:** \(D\) is the condition event; \(+\) is a positive test. The given conditional rates apply to this sampled population.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH10-0002

**Chapter:** CH10 · **Primary concept:** PRO07 · **Author difficulty:** 2 · **Type:** computational

Let \(X\) count successes in four independent trials, each with success probability \(1/3\). Find \(P(X=2)\).

- **A.** \(\frac19\)
- **B.** \(\frac4{81}\)
- **C.** \(\frac23\)
- **D.** \(\frac8{27}\)

**Correct option:** D

**Worked solution**

\(X\sim\operatorname{Bin}(4,1/3)\). Thus \(P(X=2)=\binom42(1/3)^2(2/3)^2=6\cdot4/81=8/27\).

**Option explanations**

- **A:** Uses only the two-success factor \((1/3)^2\), omitting failures and arrangements. Diagnostic mapping: M054.
- **B:** Omits the six arrangements of two successes and two failures. Diagnostic mapping: M054.
- **C:** Uses \(\binom42(1/3)^2\), omitting the failure factor \((2/3)^2\). Diagnostic mapping: M054.
- **D:** Correct: include the combination, success and failure factors.

**Assumed prerequisites:** PRO03, PRO05, CNT03.
**Direct concept weights:** {"PRO07": 1.0}
**Domain:** Four fixed independent Bernoulli trials with identical success probability.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH11-0001

**Chapter:** CH11 · **Primary concept:** STA06 · **Author difficulty:** 4 · **Type:** computational

For independent observations from a normal population with known standard deviation, a two-sided 95% z interval based on \(n=100\) has margin of error \(E\). What is the smallest integer sample size giving a two-sided 99% z interval with margin at most \(E/2\)? Use critical values 1.96 and 2.576, treating these supplied values as exact.

- **A.** \(691\)
- **B.** \(690\)
- **C.** \(263\)
- **D.** \(400\)

**Correct option:** A

**Worked solution**

The original margin is \(E=1.96\sigma/10\). The new condition \(2.576\sigma/\sqrt n\le E/2\) is equivalent to \(n\ge100(2\cdot2.576/1.96)^2=33856/49\), about 690.939. The smallest integer is 691; 690 is insufficient.

**Option explanations**

- **A:** Correct: account for both the new critical value and square-root sample-size scaling, then round upward.
- **B:** Rounds the exact lower bound down, violating the required margin. Diagnostic mapping: M058.
- **C:** Uses \(n=100(2\cdot2.576/1.96)\), a linear rather than squared scaling, then rounds upward. Diagnostic mapping: M058.
- **D:** Correctly quadruples for halving the margin at fixed confidence but ignores the larger 99% critical value. Diagnostic mapping: M058.

**Assumed prerequisites:** ALG05, EXP02, STA03, PRO08.
**Direct concept weights:** {"STA06": 0.65, "STA05": 0.35}
**Domain:** Known \(\sigma>0\); independent normal observations; supplied z critical values are exact for this calculation.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH11-0002

**Chapter:** CH11 · **Primary concept:** STA06 · **Author difficulty:** 1 · **Type:** conceptual

Under its stated model assumptions, a frequentist procedure constructs 95% confidence intervals for a fixed population mean. What does the 95% confidence level describe?

- **A.** In repeated independent samples, about 95% of sample means equal the true population mean exactly.
- **B.** In repeated independent samples, about 95% of the intervals constructed by this procedure contain the true population mean.
- **C.** For each observed interval, about 95% of individual observations lie inside that particular interval.
- **D.** For each observed interval, the fixed population mean has a 95% probability of lying inside that particular interval.

**Correct option:** B

**Worked solution**

The population mean is a fixed parameter. Before sampling, the interval endpoints are random. A 95% confidence procedure has 95% coverage under its assumptions: over repeated samples, the proportion of intervals containing the parameter approaches 0.95. It does not specify a probability distribution for a fixed parameter conditional on the realised data, individual-observation coverage, or exact equality of sample means.

**Option explanations**

- **A:** Confuses interval coverage with exact equality of an estimator and its target. Diagnostic mapping: M057.
- **B:** Correct: confidence refers to coverage of the interval-generating procedure.
- **C:** Confuses an interval for a population mean with an interval covering individual observations. Diagnostic mapping: M057.
- **D:** Confuses a frequentist coverage statement with a data-conditioned probability for a fixed parameter. Diagnostic mapping: M057.

**Assumed prerequisites:** STA05.
**Direct concept weights:** {"STA06": 1.0}
**Domain:** Frequentist interpretation, fixed parameter, valid stated sampling model; no Bayesian prior is specified.
**Validation:** author_reviewed_math_not_automatically_verified; independent human review not performed.

## MATH-CH12-0001

**Chapter:** CH12 · **Primary concept:** PRF08 · **Author difficulty:** 5 · **Type:** mathematical_reasoning

A proof attempts to show that \(a^2+b^2=3ab\) has no solution in positive integers. Suppose a solution with least \(a+b\) exists. Which argument validly contradicts that minimality?

- **A.** The left side is even for all integers, so \(3ab\) is even and \(a,b\) are both even; divide by 2.
- **B.** Both are even; replacing \((a,b)\) by \((a-b,b)\) always gives a smaller positive solution of the same equation.
- **C.** Odd-odd pairs give an even left side and odd right side. Mixed-parity pairs give an odd left side and even right side. Hence both variables are even; dividing by 4 yields the smaller positive solution \((a/2,b/2)\).
- **D.** Testing \((a,b)=(1,1),(1,2),(2,1)\) gives no solution, so a least positive solution cannot exist.

**Correct option:** C

**Worked solution**

If both are odd, \(a^2+b^2\equiv2\pmod4\), whereas \(3ab\) is odd (1 or 3 modulo 4), so equality is impossible. If exactly one is odd, the left side is odd and the right side is even, also impossible. Therefore both are even. Dividing the equation by 4 shows \((a/2)^2+(b/2)^2=3(a/2)(b/2)\), a positive integer solution with smaller sum, contradicting minimality.

**Option explanations**

- **A:** The claim that the left side is always even is false, for example at (1,2); the inference that even product forces both factors even is also invalid. Diagnostic mapping: M063.
- **B:** The proposed replacement need not remain positive or satisfy the equation; substituting gives an additional term rather than the required invariant. Diagnostic mapping: M063.
- **C:** Correct: the parity cases force evenness of both variables, and division of the equation by 4 preserves it while strictly reducing the positive integer sum.
- **D:** Finitely many checks do not rule out all positive integer pairs. Diagnostic mapping: M063.

**Assumed prerequisites:** PRF04, PRF06, PRF07, ALG04.
**Direct concept weights:** {"PRF08": 1.0}
**Domain:** \(a,b\in\mathbb Z_{>0}\); minimality is with respect to the positive integer sum.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH13-0001

**Chapter:** CH13 · **Primary concept:** CNT04 · **Author difficulty:** 4 · **Type:** computational

How many distinct arrangements of the letters A, A, B, B, C have the two A letters nonadjacent?

- **A.** \(30\)
- **B.** \(18\)
- **C.** \(12\)
- **D.** \(36\)

**Correct option:** B

**Worked solution**

All distinct arrangements number \(5!/(2!2!)=30\). For adjacent A letters, regard AA as one object along with B,B,C: there are \(4!/2!=12\). The required complement is \(30-12=18\). As a second method, arrange B,B,C in 3 ways and choose two of their four gaps for the A letters: \(3\binom42=18\).

**Option explanations**

- **A:** Counts all multiset arrangements and ignores the nonadjacency restriction. Diagnostic mapping: M065.
- **B:** Correct: subtract the adjacent cases or use distinct gaps.
- **C:** Counts the excluded adjacent-AA arrangements instead of their complement. Diagnostic mapping: M065.
- **D:** Treats the B letters as distinct, giving \(3!\binom42=36\). Diagnostic mapping: M065.

**Assumed prerequisites:** CNT02, CNT03.
**Direct concept weights:** {"CNT04": 1.0}
**Domain:** Repeated letters are indistinguishable; arrangements are in a line, not around a circle.
**Validation:** auto_checked_pending_independent_review; independent human review not performed.

## MATH-CH14-0001

**Chapter:** CH14 · **Primary concept:** CPX06 · **Author difficulty:** 3 · **Type:** computational

What is the complete set of complex numbers satisfying \(z^3=8i\)?

- **A.** \(\{8e^{i\pi/6},8e^{i5\pi/6},8e^{i3\pi/2}\}\)
- **B.** \(\{2e^{i\pi/2},2e^{i7\pi/6},2e^{i11\pi/6}\}\)
- **C.** \(\{2e^{i\pi/6}\}\)
- **D.** \(\{2e^{i\pi/6},2e^{i5\pi/6},2e^{i3\pi/2}\}\)

**Correct option:** D

**Worked solution**

Write \(8i=8e^{i(\pi/2+2k\pi)}\). Every cube root has modulus \(8^{1/3}=2\) and argument \(\pi/6+2k\pi/3\). Taking \(k=0,1,2\) gives the three displayed roots; cubing each gives \(8i\).

**Option explanations**

- **A:** Divides the arguments by 3 but fails to take the cube root of the modulus. Diagnostic mapping: M068.
- **B:** Uses the arguments for cube roots of \(-8i\), not \(8i\). Diagnostic mapping: M067.
- **C:** Keeps just one root rather than the complete set of three. Diagnostic mapping: M068.
- **D:** Correct: root the modulus and include all three argument branches.

**Assumed prerequisites:** CPX05.
**Direct concept weights:** {"CPX06": 1.0}
**Domain:** \(z\in\mathbb C\); radians; \(e^{i\theta}=\cos\theta+i\sin\theta\).
**Validation:** auto_checked_pending_independent_review; independent human review not performed.
