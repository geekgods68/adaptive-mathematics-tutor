# Stage A and B: Curriculum design and validated pilot

## Release scope

This release completes the curriculum/taxonomy design and a **25-item pilot**. The proposed full bank contains **1,840 questions**, but those questions have not been generated; full-scale authoring requires explicit pilot approval. All supplied counts of existing items come from the exported dataset and its executed audit, not from simulated learner data.

The package contains 14 retained chapters, 109 concepts, 204 prerequisite edges, 68 misconception categories, a strict 32-field question schema and both CSV and JSONL pilot exports. A 143-row crosswalk explicitly accounts for the requested topic lines. Every pilot item still requires independent mathematical and pedagogical review before student-facing research deployment.

## Evidence and design

The curriculum is a deliberately broader secondary-to-advanced-pre-university design rather than a claimed match to one qualification. Singapore MOE's assessment framework includes technique, problem solving, reasoning and communication, supporting a mixture beyond routine numerical substitution. [cite:46] The original question stems are not reproduced from those syllabus documents or from examination papers.

General MCQ-writing guidance favours plausible homogeneous options and review of distractor performance. [cite:50] That guidance informs the option format here; it does not establish that the particular mathematics distractors are common in students or diagnostically reliable. Every category is therefore labelled as an author-defined plausible error hypothesis.

Knowledge-tracing research distinguishes observed responses from a student's latent knowledge state. [cite:71] The pyBKT description identifies guess and slip as conditional observation probabilities, while its implementation supports item-specific variants. [cite:68][cite:66] Consequently, storing option count is useful metadata, but assuming a fitted BKT guess parameter must equal one divided by option count would be an additional, untested modelling assumption.

The confidence-interval interpretation pilot uses the frequentist long-run coverage meaning; the known-standard-deviation margin formula scales with the critical value and inverse square root of sample size. [cite:63][cite:62] This external check supports the intended statistical convention, not independent expert review of the authored options.

## Chapter and allocation plan

| Chapter | Concepts | Planned items |
|---|---:|---:|
| CH01 Algebra | 12 | 150 |
| CH02 Functions | 8 | 140 |
| CH03 Exponents | 5 | 100 |
| CH04 Logarithms | 5 | 100 |
| CH05 Differentiation | 10 | 150 |
| CH06 Integration | 8 | 140 |
| CH07 Geometry | 9 | 150 |
| CH08 Trigonometry | 8 | 150 |
| CH09 Vectors | 7 | 120 |
| CH10 Probability | 8 | 140 |
| CH11 Statistics | 8 | 140 |
| CH12 Mathematical Proofs and Logic | 8 | 130 |
| CH13 Permutations and Combinations | 6 | 100 |
| CH14 Complex Numbers | 7 | 130 |
| Total | 109 | 1,840 |

Concept-level plans range from 10 to 20 primary items. Chapter totals vary with breadth rather than being mechanically identical. Five-concept Exponents and Logarithms receive 20 items per concept; broader chapters distribute their totals across finer nodes.

Difficulty quotas apply the requested 15/25/30/20/10 proportions within concepts with largest-remainder rounding. The resulting full-bank plan is 283/448/548/373/188 across Levels 1–5, approximately 15.4%/24.3%/29.8%/20.3%/10.2%. The labels describe author-assigned demand, not measured student difficulty.

The planned leading item-type counts are 819 computational, 380 conceptual, 161 graphical interpretation, 195 error diagnosis and 285 mathematical reasoning. These are simultaneous constraints on future generation, not present-bank coverage. Each item should also vary representations, mathematical structures, domain cases and solution strategies within its chapter.

## Classification corrections

- Partial-fraction decomposition belongs to ALG11; integration using it belongs to INT05.
- Introductory limits and continuity are calculus foundations hosted in Chapter 5, not differentiation operations themselves.
- Normal-distribution probability is explicitly continuous and separate from discrete random variables.
- Scalar product means dot product; vector product means the three-dimensional cross product.
- Elementary differentiation is separated from transcendental derivatives to avoid unnecessary trigonometric/logarithmic prerequisites for power rules.
- Proof is a cross-cutting chapter; chapter number is not prescribed learning order.
- General exponential equations requiring logarithms are mapped to LOG05 as well as the Exponents chapter's topic crosswalk.
- Euler representation and vector products are intentionally included as advanced extensions, without implying universal coverage by every high-school syllabus.

## Prerequisite graph

The graph has 109 defined nodes and 204 directed edges. All edge endpoints exist, and every edge respects the supplied topological order; an explicit depth-first construction rejected cycles. Chapter order is only an organisational convention, since counting in Chapter 13 legitimately precedes parts of probability in Chapter 10.

Representative checked edges are ALG04→ALG07, FUN01→FUN04, EXP04→LOG01, TRI03→DIF05, DIF03→DIF07, ALG11→INT05 and CNT01→PRO05. These connect concrete foundations rather than tying entire chapters together. The graph file supplies all nodes, edges, scope descriptions and a topological order in machine-readable form.

Edges mean conjunctive curricular foundations for the concept **as scoped**, not universal cognitive necessities or an empirically measured causal graph. Some broad nodes combine related techniques; item-level prerequisite assumptions can be more selective than the full node definition. The schema intentionally separates direct-assessment concepts and weights from assumed prerequisite concepts; their sets do not overlap within any pilot item.

For example, the implicit-normal item directly assesses DIF06 and GEO05 with weights 0.8 and 0.2. Its chain/product-rule foundation is assumed rather than independently credited as assessed mastery. The minimax derivative item explicitly assumes absolute-value reasoning because its unfamiliar optimisation form needs that additional foundation.

## Misconception taxonomy

The 68 categories cover arithmetic and algebra, functions, exponent/log rules, calculus, geometry/trigonometry, vectors, probability/statistics, logic/proof, counting and complex numbers. Each supplies an ID, mathematical description, relevant concept IDs, example, corrective reasoning and an evidence caution. The pilot exercises 33 categories; all unused categories remain visible with zero coverage rather than being omitted.

Every incorrect option has an explanation and at least one defined category. Correct options have empty misconception lists. Local error maps are also present in the schema, but empty for this pilot because the taxonomy suffices; later genuinely item-specific errors must be documented there rather than forcing a misleading existing category.

A selected distractor is evidence **consistent with** an error mechanism. Reading mistakes, guessing, partial knowledge and alternative reasoning remain possible. Category use should therefore not become a deterministic assertion that a learner definitely holds the named misconception.

## Pilot design

The 25 questions span every chapter, 24 primary concepts and 26 directly assessed concepts. Their difficulty counts are 4/6/8/5/2 across Levels 1–5, closely approximating the requested pilot proportions. There are 25 distinct structural families, 24 four-option items and one five-option minimax item. A reproducible one-time option permutation removed the draft’s patterned answer positions; all option maps and checks were remapped before final export.

The examples intentionally exercise exact numbers, solution sets, symbolic functions, graph transformations, vector components, probability calculations, proof critique and complex root sets. The graphical item describes the graph by an exact function and vertex, so an external image is unnecessary. All items have complete worked solutions and explanation maps, and none require an unresolved visual asset.

The pilot is **not** balanced across item types: 20 are primarily computational and five primarily represent conceptual, graphical, diagnosis or reasoning demands. That limitation is disclosed rather than relabelling routine calculations as conceptual questions. Full-generation type quotas and family constraints address future breadth; they have not yet been fulfilled.

## Executed mathematical checks

| Audit | Executed result | What it does not establish |
|---|---|---|
| Strict schema and cross-field checks | 25 pass | Mathematical or psychometric validity |
| Complete CSV/JSONL equality | 25 identical complete records | Correctness of the original authoring |
| Executable mathematical checks | 24 items | Independent expert verification of all prose |
| Semantic-only item | 1, confidence interpretation | Automatic verification of its interpretation |
| Error-transform/counterexample checks | 72 witnesses | Prevalence or diagnostic sensitivity in students |
| Strict KaTeX syntax | 360 segments; zero errors | UI layout or accessibility in Next.js |
| Pairwise duplication screen | 300 pairs; zero flags | Proof of no semantic near-duplicates |
| Independent human review | 0 | No such review is claimed |
| Student administrations | 0 | No empirical validation is claimed |

The mathematical checks use exact or symbolic representations of the displayed options. These include real and complex solution sets, symbolic derivative equivalence, exact definite integrals, circle tangency via both distance and discriminant, vector computations, exhaustive multiset enumeration and integer congruence exhaustion. The Diophantine proof item additionally uses a symbolic integer solver; its residue cases and homogeneous halving step are checked explicitly.

The confidence sample-size item computes the exact lower bound \(33856/49\), then verifies that 691 satisfies the margin requirement while 690 fails. The trigonometric equation is solved on its stated half-open interval rather than tested only at proposed roots. The logarithmic equation checks positivity before accepting a polynomial root, and the complex-root item checks a complete three-element solution set.

The derivative minimax item uses a range reformulation and a sharp triangle-inequality bound, not a scan of numerical sample points. Its scalar candidate values are compared with the analytic optimum; the proof-to-stem interpretation remains author reviewed. Likewise, symbolic derivative options are judged as functions, so occasional equality at a particular input does not make an incorrect derivative formula a second correct answer.

## Validation boundaries

Twenty-four records carry `auto_checked_pending_independent_review`; one carries `author_reviewed_math_not_automatically_verified`. The latter is `MATH-CH11-0002`, for which correctness rests on semantic inspection against the formal confidence-coverage convention. It is not falsely counted as automatically checked.

The executable checks are stronger than a same-model assertion of correctness, but semantic transcription of stems/options into symbolic objects is still authored by the same assistant. Worked-solution prose is not verified line by line by a theorem prover. Every item remains flagged for independent expert review, and empirical difficulty, discrimination, fairness and misconception diagnosis are uncalibrated.

The duplicate audit uses normalised stem strings and number-masked similarities with declared thresholds of 0.80 and 0.85. Its highest number-masked score is about 0.812 between substitution and partial-fraction integration items; these belong to different mathematical families. Future consolidation should add expert semantic review rather than treating this lexical screen as exhaustive.

## Research controls

The bank should support, not predetermine, the learner-model comparison. Freeze concept/family definitions and item versions before held-out evaluation; keep correct answers, explanations and future feedback inaccessible to the prediction pipeline until their specified availability. Keep learner events separate from item metadata.

For an initial ordinary BKT baseline, a pre-registered single-direct-concept subset avoids silently treating one response as independent observations on multiple skills. A multi-skill analysis is possible, but the response-attribution rule must be explicit and consistent across compared methods; concept weights alone do not solve credit assignment. Prerequisite assumptions must not automatically receive direct-assessment credit.

Evaluate new-learner generalisation and new-family transfer as distinct questions, with corresponding learner-disjoint and family-disjoint splits and chronological within-learner processing. A random response split should not be presented as answering both. At least 922 future families are planned, with no more than two close parameter variants in a family; cosmetic changes do not justify new family IDs.

Response prediction, mastery calibration and adaptive sequencing utility require separate outcomes. Without independent mastery evidence, better response prediction does not prove more accurate latent mastery. Later simulator experiments must explicitly label synthetic data and include mechanisms not designed to mirror the proposed prerequisite rule; this release includes no synthetic or real responses.

## Approval gate

The next decision concerns taxonomy granularity, graph-edge semantics, difficulty judgements, distractor quality and direct-concept attribution, together with review of the 25 complete pilot items. No Stage C generation has begun. After explicit approval, non-overlapping chapter batches can fill the planned quotas, including—not adding on top of—the existing pilot IDs.

Stage D must reconcile approved batches, preserve stable IDs/families, deduplicate mathematically, repeat cross-file checks and issue the seven final consolidated filenames. This pilot package is not that final dataset.
