# 11. Limitations and Threats to Validity

## Internal validity

| Issue | Evidence | Severity |
|---|---|---|
| C0 confounds "no estimator" with "non-adaptive sequencing" (file 05) | `conditions.ts` source | High — affects any paper claim framed as a pure "adaptive vs non-adaptive" contrast using C0 vs C2 |
| S4-GF reversal built on 2/750 and 13/750 attainment events (file 10 §10.6) | Pilot JSON | High — numerically fragile regardless of correct arithmetic |
| Three-metric pilot reuses the same, already-examined 5 worlds as the original pilot (file 10 §10.6) | Both JSON files' identical world/slice structure | High — disqualifies this data from ever being a blind confirmatory sample |
| No multiplicity correction across a large comparison grid | `threeMetrics.ts` (no Holm/Bonferroni call found anywhere) | Medium — expect some nominal p<0.05 by chance alone |

## External validity

| Issue | Evidence | Severity |
|---|---|---|
| All learners are synthetic; zero real-student data anywhere in the repository (confirmed: no student-response import/ingestion code found in files opened this session) | Absence | Critical for any real-world efficacy claim |
| S4's prerequisite-gating rule is self-labeled "[Researcher-defined]" by its own author comment | `s4.ts` docstring | High |
| Question bank has no independent human/pedagogical review (file 03) | `data/question-bank/README.md` self-disclosure | High |

## Construct validity

| Issue | Evidence | Severity |
|---|---|---|
| The deterministic mastery estimator is an uncalibrated heuristic score, not a fitted probability (file 04) — using it as a Brier-Score input is an interpretive choice | `updateMastery.ts` (no likelihood/fitting code) | Medium-High, directly affects Brier Score interpretation for Det-A/Det-B |
| K(T) (averaged, partial-credit) and QTM (conjunctive, all-or-nothing) measure genuinely different constructs of "learning efficiency" — neither is more "correct," but conflating them in prose would misrepresent the system | File 10 | High (central to this audit's main finding) |

## Statistical conclusion validity

| Issue | Evidence | Severity |
|---|---|---|
| n=5 worlds for every reported test; protocol's own required-world table calls for 20-92 | `requiredWNote` field in pilot JSON | Critical for confirmatory claims; non-issue for exploratory framing if labeled correctly |
| Statistical unit is the world (correctly), but this means the oft-cited "750 trials" denominators in QTM tables are descriptive, not inferential, n | `threeMetrics.ts` header comment | Medium — risk of a reader mis-reading pooled-n as statistical power |
| No confirmatory run exists under any metric | `protocol/APPROVAL.md` absent; `research-output/phase8/confirmatory/` empty | Critical |

## Reproducibility

See file 14 for the full distinction between replay/re-execution/reimplementation guarantees. Headline gap: a prior stage's own report (Stage 4) contained at least one unsupported historical claim about metric provenance (file 10 §10.4) that was accepted into a scientific document without independent verification before this audit — a process risk (documentation can drift from git truth) worth noting for any future stage of this project.

## Engineering limitations

| Issue | Evidence | Severity |
|---|---|---|
| Raw per-response/per-step series not retained — two of eight requested figures (calibration-over-time, individual trajectories) could not be rendered | Prior stage's own report + absence of such fields in the JSON artifacts (checked) | Medium |
| No independently-executed confirmatory-scale run exists to validate wall-clock/memory behavior beyond the 13,560-run pilot scale | Absence | Low-Medium |

## Claims that must NOT be made from this evidence (cross-reference file 12)

"Adaptive tutoring improves learning," "prerequisite-aware sequencing is more efficient," "this system generalizes to real students," "the question bank is pedagogically validated" — none are supported by anything found in this audit.
