# Mathematics question bank: Stage A and Stage B

Release: **1.0.0-pilot** · Authored: **2026-10-20** · Encoding: **UTF-8** · Status: **awaiting pilot approval**.

**Exactly 25 questions have been generated.** The full-bank target is **1,840**, not a completed dataset. No full-scale chapter generation has started. There are no student-response records, empirical difficulty estimates, independent human reviews or claims of empirical validation.

## Package inventory

| File | Purpose |
|---|---|
| mathematics_question_bank_pilot.csv | All 25 pilot MCQs and all 32 fields; JSON-encoded nested cells |
| mathematics_question_bank_pilot.jsonl | The same 25 complete records, one JSON object per line |
| concept_taxonomy.csv | 109 concepts, chapter assignments, descriptions, direct prerequisites and curriculum levels |
| misconception_taxonomy.csv | 68 reusable, author-defined error hypotheses, examples and correct reasoning |
| question_bank_validation_pilot.csv | One audit row per pilot item; automatic checks separated from author inspection |
| question_bank_coverage_pilot.csv | Actual pilot counts, including zero-coverage concepts/categories; planned totals separately labelled |
| chapter_structure.csv | All 14 retained chapters and chapter-level scope corrections |
| curriculum_topic_crosswalk.csv | 143 requested topic lines mapped to concepts; taxonomy coverage is not generated-item coverage |
| prerequisite_edges.csv | 204 directed prerequisite-to-dependent edges |
| prerequisite_graph.json | Nodes, edges and a checked topological order |
| question_distribution_plan.csv | Primary-concept counts and author-difficulty quotas for the future full bank |
| question_type_distribution_plan.csv | Simultaneous chapter-level item-type quotas for future authoring |
| question_bank_schema.json | Strict JSON Schema, draft 2020-12, for question record version 1.0.0 |
| validation_evidence_pilot.json | Executed mathematical outputs, option semantics, rendering results and honest limitations |
| near_duplicate_audit_pilot.csv | All 300 question pairs, stem and number-masked similarity scores |
| pilot_question_review.md | Readable version of every pilot question, answer, solution and diagnostic explanation |
| validate_pilot.py | Reproducible data-QA assertions; not application code or a tutoring algorithm |
| stage_a_b_design_report.md | Curriculum architecture, evidence basis and staged research recommendations |
| manifest.json | File sizes, SHA-256 hashes, release scope and actual question counts |

The ZIP contains the complete package. Files named `_pilot` are intentionally not named as the final consolidated bank. Stage D will supply the seven exact final filenames requested only after approved chapter batches exist.

## Curriculum architecture

The 14 chapters are retained. They form a broad custom secondary-to-advanced-pre-university curriculum, **not a claim of complete alignment to any one examination board**. Singapore MOE's mathematics framework distinguishes technique, application, reasoning and proof; the bank deliberately uses those different demands rather than only routine computation. [MOE curriculum](https://www.moe.gov.sg/api/media/2155cce5-f6b4-4532-897c-c5a8fa1852c6/2020-G2-and-G3-Additional-Mathematics-Syllabuses.pdf)

Partial-fraction **decomposition** is an algebra skill, ALG11; integration using the decomposition is INT05. Limits/continuity are calculus foundations hosted in Chapter 5. A normal distribution is continuous, not a discrete random variable. Scalar product means dot product; vector product means the three-dimensional cross product. Proof is cross-cutting. Chapter numbers are display groupings and **must not be treated as a topological learning sequence**.

`curriculum_level` describes broad curricular placement: 1 foundation secondary, 2 upper secondary, 3 pre-university, 4 advanced pre-university. It is independent of item `difficulty`, which has five author-assigned levels. A routine item on an advanced concept can have low item difficulty relative to its instructional prerequisites.

## Prerequisite semantics

An edge points **prerequisite → dependent**. All 109 concept IDs are defined, all 204 edges are internal to the taxonomy, and every edge follows the supplied topological order; the graph is acyclic. Edges are **author-assigned curricular foundations**, not empirically established causal necessities or learned probabilities.

Concept prerequisites describe foundations for the entire concept scope. A question's `prerequisite_concept_ids` instead lists the explicit, item-specific skills assumed, excluding directly assessed concepts. The list is **not a transitive closure** and may include an additional contextual skill not necessary for every item on the concept. For example, the minimax derivative item explicitly assumes absolute-value reasoning. Foundational literacy and basic reading are outside the mathematical graph.

All listed concept foundations are conjunctive in this release: no OR-groups or alternative prerequisite pathways are represented. ALG06 is a deliberately broad simultaneous-equations node; items may separately assume quadratic skills when relevant. GEO09 includes formal direct proof; elementary geometry items do not universally require PRF05. Trigonometric/exponential/logarithmic derivatives have their own DIF05 node so elementary power differentiation does not falsely require all transcendental functions.

`concept_ids` and `concept_weights` identify direct assessment. Weights are positive and sum to 1; they are author-specified attribution weights, **not fitted discrimination parameters, probabilities of mastery, or evidence that a single response identifies mastery of each component**. `primary_concept_id` is the chapter-owning primary skill and is included in `concept_ids`.

## Distribution plan

The proposed full release contains 1,840 items, 100–150 per chapter. Concept targets range from 10 to 20 primary items. The levels are apportioned within each concept using largest-remainder rounding against 15%, 25%, 30%, 20%, 10%. Aggregate quotas are 283, 448, 548, 373 and 188; rounding intentionally makes them approximate, not exact percentages.

Future authoring targets at least 922 distinct families overall and **at most two closely related parameter variants per family**. A family means the same mathematical structure and solving strategy; cosmetic wording or new coefficients do not create a new family. Number-only variants must retain the same family. Families shared across chapters must use the same global ID; family IDs are not split-specific. The 25 pilot items currently have 25 different families.

Question-type quotas classify each item by its leading demand: computational 819, conceptual 380, graphical interpretation 161, error diagnosis 195, mathematical reasoning 285. These are authoring targets, not claims that the 25-item pilot has this balance. The pilot has 20 computational, 1 conceptual, 1 graphical-interpretation, 1 error-diagnosis and 2 mathematical-reasoning items; Chapter 12–14 examples also require conceptual reasoning. The pilot prioritises exercising all chapters, difficult answer types, and auditable calculations; it is not a representative psychometric sample.

## Question field dictionary

| Field | Type | Meaning |
|---|---|---|
| question_id | string | Immutable globally unique ID: MATH-CH01-0001, etc. |
| chapter_id | string | CH01–CH14; owns the primary concept |
| primary_concept_id | string | Primary directly assessed concept |
| concept_ids | string[] | Only directly assessed concepts |
| concept_weights | object<string, number> | Exactly the concept-ID keys above; positive weights summing to 1 |
| prerequisite_concept_ids | string[] | Item-specific assumptions, separate from direct assessment |
| question_family_id | string | Immutable structure/strategy grouping for leakage-aware splitting |
| difficulty | integer 1–5 | Author category, not calibrated item difficulty |
| question_text | string | Complete stem with literal LaTeX delimiters where appropriate |
| options | object[] | Each object has `option_id` and `text`; 4–8 objects |
| correct_option_id | string | Exactly one of the supplied A–H IDs |
| correct_answer | string | Exact text of the keyed option, duplicated for audit convenience |
| worked_solution | string | Complete reasoning to the keyed result, including domain rejection where needed |
| option_explanations | object<string, string> | One explanation for every option, including the correct option |
| misconception_ids_by_option | object<string, string[]> | Existing reusable error categories; correct option has an empty list |
| option_count | integer 4–8 | Actual number of options; never infer it from padding |
| validation_status | enum string | Overall status defined below |
| schema_version | string | 1.0.0 for this record schema |
| item_version | string | 1.0.0 initially; bump on content/metadata changes and retain ID |
| release_stage | string | pilot in this package |
| question_type | enum string | computational, conceptual, graphical_interpretation, error_diagnosis, mathematical_reasoning |
| domain_restrictions | string | Explicit real/complex domain, parameter/interval conditions, units and assumptions |
| requires_external_visual_asset | boolean | False for all pilot items |
| visual_asset_requirements | object or null | Null when unnecessary; otherwise exact description, supplied/required status and actual path or null |
| difficulty_basis | string | author_assigned_not_empirically_calibrated |
| difficulty_rationale | string | Auditable explanation of cognitive demand |
| misconception_evidence_caution | string | Wrong option does not conclusively establish a misconception |
| local_error_mechanisms_by_option | object<string, object[]> | Additional local errors, each with local_error_id and mechanism; empty here because taxonomy mappings suffice |
| independent_human_review_status | string | not_performed for all pilot items |
| empirical_validation_status | string | not_performed for all pilot items |
| authoring_method | string | Original LLM authorship with executable mathematical QA |
| source_provenance | string | Original questions; no copied exam/textbook questions |

Option IDs always start at A and continue consecutively to the actual option count, up to H. No phantom E–H options are added to a four-option item. Correct-option position counts are in coverage, but are not balanced in this diagnostic pilot. The one five-option item has four documented, distinct incorrect approaches; no filler options were added. All other items use four options.

The schema validates shape, enumerations and required fields. Additional QA checks enforce ID uniqueness; primary/chapter consistency; matching option-map keys; correct-answer text equality; exact weight sum within numerical tolerance; valid concept and misconception references; no assessed/assumed overlap; semantic answer uniqueness; and DAG integrity. JSON Schema alone does not establish mathematical truth or enforce every cross-field relationship.

## CSV and JSONL conventions

All text files are UTF-8 without a BOM. CSV uses standard quoted cells and a single header row. Nested arrays/objects, booleans and null use valid JSON **inside** each CSV cell. Read CSV with a compliant CSV parser first; never split rows with `split(',')`. Decode each nested cell once with a JSON parser.

JSONL has one self-contained JSON object per line. `concept_weights`, `options`, `option_explanations`, `misconception_ids_by_option` and `local_error_mechanisms_by_option` are native objects/arrays. No multiline JSON records or trailing commas are used. The exported CSV was read back with type-aware JSON decoding and compared against every complete JSONL record; **all fields were equal**, not only the question IDs.

Mathematical strings contain literal `\(` and `\)` (and, if needed, `\[` and `\]`) after parsing. A JSON file represents a literal backslash as `\\`. This is JSON escaping, not additional LaTeX escaping: do not double-escape the parsed value or strip the backslashes. No dollar-sign delimiters, HTML images, base64 images or invented visual paths are used. Principal complex arguments in the taxonomy use \((-\pi,\pi]\) unless a question explicitly specifies otherwise; trigonometric angles are radians unless degrees are explicit.

## Next.js / TypeScript handoff

1. Keep the source bundle under a versioned **server-only or offline data directory**, not `public/`. The source includes correct answers and worked solutions; do not expose the complete files through a public static route before students respond.
2. Treat JSONL as the authoritative import format. Read UTF-8, parse one nonempty line at a time, and validate each record against `question_bank_schema.json` with a draft-2020-12-capable validator. Use the field dictionary for TypeScript types; no application implementation is included here.
3. Run the additional cross-record constraints described above and preserve question, concept, family and option IDs exactly. Numbers remain numbers; nested structures remain objects rather than stringified JSON after JSONL parsing.
4. Give the learner-facing renderer only the stem, option IDs/text and necessary domain/visual metadata before submission. Explanations and keys belong in the controlled feedback/research layer. Do not inject untrusted markup with raw HTML.
5. Split text around the declared math delimiters and use the project's MathJax or KaTeX configuration. All **360 pilot math segments** passed KaTeX 0.16.22 with `throwOnError`, strict error mode and `trust:false`; this tests the syntax, not layout/accessibility in your application. No external visual asset is required for these items, including the formula-described graph item.
6. Grade by `correct_option_id`, never string equality of rendered mathematics. If a later experiment permutes display order, retain the immutable option IDs and log the displayed order and item version.
7. Store learner events separately: pseudonymous learner/session, chronological attempt index/time, question and family IDs, item version, selected option ID, option count and display order, correctness, feedback exposure and response time when collected. No simulated or real learner events are supplied in this package.

## Generation methodology

The chapter list and requested topic coverage were mapped to 109 auditable concepts, with foundations scoped to avoid broad circular dependencies. A 68-category taxonomy distinguishes reusable mathematical errors; it is **author-defined, not an empirically established list of student prevalences**. General MCQ guidance supports plausible homogeneous options and analysis of distractor functioning, but the sources do not independently confirm the particular error frequencies or diagnostic accuracy in these original mathematics items. [NBME guidance](https://info.nbme.org/rs/552-QHC-046/images/NBME_Item-Writing-Guide.pdf?version)

The 25 pilot questions were authored individually rather than generated by a numerical template loop. Options then received a one-time reproducible permutation (seed 20261020) to remove the draft’s patterned key sequence; all keys, explanation maps, misconception maps and mathematical checks were remapped and rerun. This is an authoring step, not a tutoring algorithm or a promise of uniformly balanced key positions. Every wrong option has an explicit mechanism in its explanation and at least one existing misconception category; local-error maps are present but empty. During drafting, misleading distractor derivations and an overly specific modular-residue assertion were revised before export. Mathematical QA recomputed results from the stated mathematical inputs and compared all options. This is distinct from simply asking the authoring model whether it agrees with itself, but it does **not** make the input mapping or explanation prose independently verified.

## Executed validation

- **25/25** records passed strict schema validation, cross-reference checks, matching option-map keys, weight checks and full CSV/JSONL equality.
- **24/25** items have executed mathematical checks: exact arithmetic, symbolic solution sets, differentiation, definite integration, geometry constraints, vector operations, exact probability, sample-size inequalities, integer congruence exhaustion, a Diophantine solver, permutation enumeration and complex roots. Each mathematical option was represented semantically and compared to the derived result; pairwise mathematical distinction was checked.
- **1/25**, `MATH-CH11-0002`, is a confidence-level interpretation item. It has author semantic inspection against the coverage definition, **not automatic mathematical verification**. It is explicitly assigned the lower validation status.
- **72** named-error transformations/counterexample witnesses were executed. These support stated mechanisms but do not establish that real students commonly make the errors.
- **360** LaTeX segments passed strict KaTeX syntax checks with zero errors. Rendering was performed against the text content used for export; it is not a browser or accessibility test.
- **300** question pairs were screened using normalised text similarity and number-masked similarity. Thresholds were 0.80 and 0.85 respectively. No exact duplicates or heuristic flags were found. This is not a semantic-duplication proof; the highest number-masked similarity was about 0.812 between two genuinely different integration techniques.
- **0** independent human reviews and **0** student administrations have occurred. Every item has `review_required=true` in its validation record.

### Status definitions

`auto_checked_pending_independent_review` means the recorded executable core mathematical checks passed. The semantic transcription of each displayed option, domain interpretation and prose were still authored/inspected by the generating assistant; no claim of independent expert verification is made.

`author_reviewed_math_not_automatically_verified` means only the author's semantic inspection supports mathematical/interpretive correctness. Structural checks still passed. The confidence-interpretation item has this status. Its intended convention is the long-run coverage definition described in [OpenStax confidence intervals](https://openstax.org/books/introductory-statistics-2e/pages/8-chapter-review).

`needs_revision` is reserved for unresolved failed/uncertain records. None remain in the exported pilot, but the absence of this status does not waive the required independent review.

The full worked-solution prose is not mechanically proof-checked line by line. Executable checks cover the core mathematical transformations and final results documented in `validation_evidence_pilot.json`. Graph dependencies, item difficulty, distractor plausibility and concept weights remain author judgements. Domain-specific textbook/statistical conventions must be checked by the human reviewer. No claim of calibrated difficulty, diagnostic sensitivity, discrimination, fairness or learning effectiveness is justified yet.

### Reproducing core QA

Use Python 3.12 with `sympy==1.14.0` and `jsonschema==4.23.0`, then run `python validate_pilot.py` from the extracted package. It checks the mathematical assertions, schema, graph order, core metadata and complete CSV/JSONL equality and prints its actual pass result. It does **not** implement a tutor or any learner model.

The exported evidence records the strict KaTeX 0.16.22 rendering checks. That optional JavaScript renderer used during generation is not required by the Python QA script. An integrating agent should separately rerun rendering with its pinned front-end renderer and run a UI accessibility check.

## Controlled-experiment safeguards

BKT distinguishes latent skill knowledge from observed correct answers using guess/slip assumptions; its fitted parameters are not determined simply by the number of options. [BKT analysis](https://jedm.educationaldatamining.org/index.php/JEDM/article/view/35) The pyBKT project supports item-specific guess/slip variants; choosing such a variant is an experimental-design decision, not a property of this question bank. [pyBKT](https://github.com/CAHLR/pyBKT)

For a transparent initial comparison, pre-register a **single-direct-concept subset** for ordinary skill-wise BKT, or explicitly pre-register the same multi-skill attribution procedure for every compared model. Do not silently duplicate one binary response into independent observations for all weighted concepts, and never credit prerequisite mastery merely because a dependent item was answered correctly. Use the complete weighted subset as a separately reported analysis if attribution differs.

Pre-register at least two distinct evaluation questions: generalisation to new learners (learner-disjoint split, chronological within-learner updates), and transfer to new item families (family-disjoint split). These cannot always be optimised by the same split; report them separately rather than implying that a single random response split answers both questions. Freeze concept definitions, family definitions, allowed features and item versions before the held-out evaluation. Fit any response-based calibration only on training data.

If simulated learners are used later, label the data synthetic and test more than one simulator mechanism, including ones that do not mirror the proposed deterministic prerequisite rule. Simulated latent mastery is ground truth **only inside the chosen simulator**, not evidence of real-student validity. No learner simulation is part of this release.

Distinguish held-out response prediction (e.g. log loss, Brier score, discrimination) from mastery calibration and sequencing utility. Without independent mastery measurements, accuracy of predicted responses is not proof that latent mastery is correct. For actual sequencing utility, use a prospectively specified learning/transfer outcome, exposure budget and study design. MCQs about proofs test recognition and critique, not the ability to construct an unaided proof.

## Approval gate and continuation

Review the taxonomy granularity, curricular edge semantics, five difficulty rationales, multi-concept attribution and every pilot question. Independent mathematical/pedagogical review should occur before research deployment. Full generation remains blocked until explicit approval.

After approval, a chapter batch must preserve these pilot IDs, content and family IDs unless a versioned correction is agreed. The chapter targets **include** the pilot: e.g. CH01 targets 150 total, including its two pilot items, rather than 150 additional questions. Batches should be non-overlapping, or explicitly mark repeated pilot records for deduplication by immutable ID. Cumulative coverage must count distinct question IDs and respect per-concept quotas.

At Stage D, combine approved batches, resolve any repeated IDs only if complete records are identical, recheck family leakage and semantic duplicates, repeat all checks, and create the exact seven requested final deliverables. Do not rename this pilot as the completed 1,840-question bank.
