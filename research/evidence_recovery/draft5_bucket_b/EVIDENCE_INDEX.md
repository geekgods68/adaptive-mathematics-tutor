# Evidence Index — Draft 5 Bucket B

**"Draft 5" itself was NOT found as a distinct file in this repository.** Searched for the exact title ("Mastery Estimation, Question Sequencing, and the Definition of Mastery: An Exploratory Simulation Study of a Transparent Adaptive Mathematics Tutor"), the string "Draft 5", and distinguishing structural markers (Section 3.4/3.7, Figures 1-4, Tables 1-4) across all `.md`/`.tex`/`.docx`/`.pdf` files in the repository — zero matches. No `.docx`/`.pdf` file exists anywhere in the tree. The manuscript is evidently authored and reviewed outside this repository (consistent with this project's established workflow of drafting externally and pasting audit-relevant excerpts in). The closest existing equivalents, used as the "claims under audit" proxy for this report per the coordinator's own fallback instruction, are:

- `docs/COMPLETE_RESEARCH_PAPER_EVIDENCE_DOSSIER.md` (41 sections, ~87KB)
- `research/manuscript-evidence-dossier/OJSS_COMPLETE_RESEARCH_DOSSIER.md` (17-file consolidated dossier, ~84KB)
- `research/manuscript-evidence-dossier/15_MANUSCRIPT_SOURCE_BRIEF.md` (explicitly a "verified, non-fabricated input for an academic manuscript planner," i.e. upstream of any actual draft)

All numbers the coordinator asked to be cross-checked (Brier/RMSE by family, S4-GF K(T)/QTM figures and p-values, design parameters) were located verbatim inside these dossiers and **independently re-derived from the raw artifact JSON in this pass** (not merely re-cited) — see `STATISTICAL_AUDIT.md` and `RESULTS_RECOVERY.md`. Every number quoted by the coordinator matched to the precision given; see Part I of `DRAFT5_BUCKET_B_REPORT.md` for the full cross-check table.

## What this pass reused vs. newly computed

| Category | Source | New in this pass? |
|---|---|---|
| S1-S4 equations, S4 λ/φ table, K(T) definition, run-accounting arithmetic, C1 retrospective run, det-B replay, diagnostics replay, 70 p-values | `research_evidence/phase2_results_and_appendix/{01_RESULTS_AND_ANALYSIS.md,02_EVIDENCE_AND_REPRODUCIBILITY.md}` and their `retrospective_artifacts/`/`appendix_tables/` | Reused, cited by file/section below |
| C0 sequencing mechanics (B01), full adaptive selector internals incl. exact thresholds (B02), candidate filtering/scoring (B03 downstream check), multi-concept weight semantics (B04), G-vs-G\* Jaccard per cell/slice/world (B06), live question-bank audit run (B18), client-leakage source check (B19) | Direct source reads this pass | **New this pass** |
| Reproduction of the manuscript's own quoted K(T)/QTM p-values from raw per-world data | This pass, closed-form df=4 t-test (same method as the Phase 2 pass, applied to a new contrast) | **New this pass** |

## Evidence-status vocabulary used throughout (exactly as specified)

`VERIFIED-SOURCE` (read and traced in actual code, this pass or the cited prior pass) · `VERIFIED-ARTIFACT` (read from a stored JSON/CSV artifact) · `RECOMPUTED-EXISTING` (recomputed from stored raw data, matched or not) · `PARTIALLY-VERIFIED` · `UNAVAILABLE` · `CONTRADICTED` · `REQUIRES-NEW-RUN`. No item is marked VERIFIED merely for appearing in a dossier or in the coordinator's own prompt.

## File-by-file index of this deliverable

| File | Content |
|---|---|
| `DRAFT5_BUCKET_B_REPORT.md` | **Primary deliverable** — self-contained, all 10 parts |
| `EVIDENCE_INDEX.md` | This file |
| `METHODS_VERIFICATION.md` | B01-B09 full mechanism specs (pseudocode/equations) |
| `RESULTS_RECOVERY.md` | B10-B17 numeric tables |
| `STATISTICAL_AUDIT.md` | B16 p-value reproduction + general stats audit |
| `FIGURE_TABLE_AUDIT.md` | B20-B21 |
| `REPRODUCIBILITY_AUDIT.md` | B22, reproducibility matrix |
| `UNRESOLVED_ITEMS.md` | Everything genuinely blocked, and why |
| `data/*.csv` | `track_a_recovered.csv`, `track_b_recovered.csv`, `world_level_results.csv`, `ablation_results.csv`, `run_accounting.csv`, `evidence_registry.csv`, `b06_graph_comparison.csv` |
| `scripts/*` | `computeB06Jaccard.ts`, `build_csvs.py`, `build_run_accounting.py` — the only code written this pass; all read-only against existing artifacts/config, zero new simulation batches |
