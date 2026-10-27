/**
 * The imported RISE question bank (1,840 questions, 109 concepts, 68
 * misconceptions, 14 chapters) — see data/question-bank/README.md for
 * provenance and docs/research-decisions.md for the integration decision.
 *
 * Deliberately kept as SEPARATE exports from the original 161-question
 * bank (`src/domain/questions`) and its 9-strand concept/misconception
 * taxonomy (`src/domain/concepts`, `src/domain/misconceptions`), rather
 * than merged into those same arrays — several existing tests assert
 * tight size ranges calibrated to the original small, hand-curated
 * quadratics-only bank (e.g. `MISCONCEPTIONS.length` between 20 and 40),
 * and merging would force weakening those checks, which this project's
 * conventions explicitly forbid. The Phase 3 non-adaptive study sequence
 * (`NON_ADAPTIVE_STUDY_SEQUENCE`) also continues to reference the original
 * bank only, by design — it is a fixed, already-validated 35-question
 * sequence that should not change shape because an unrelated dataset grew.
 *
 * `ALL_QUESTIONS` is provided as a convenience for future (Phase 3+) code
 * that genuinely wants the union; nothing existing uses it.
 */
import { QUESTIONS } from "@/domain/questions";
import { loadRiseQuestions } from "@/domain/rise/loadQuestions";
import { loadRiseConcepts, loadRiseMisconceptions } from "@/domain/rise/loadCurriculum";

export const RISE_QUESTIONS = loadRiseQuestions();
export const RISE_CONCEPTS = loadRiseConcepts();
export const RISE_MISCONCEPTIONS = loadRiseMisconceptions();

export const ALL_QUESTIONS = [...QUESTIONS, ...RISE_QUESTIONS];
