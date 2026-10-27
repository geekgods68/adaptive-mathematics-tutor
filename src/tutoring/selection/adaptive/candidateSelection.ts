import type { DifficultyLevel, Question } from "@/domain/questions/types";
import type { AdaptiveSelectionConfig } from "@/tutoring/selection/adaptive/config";
import type { AdaptiveSelectionContext, CandidateScore, FallbackMode } from "@/tutoring/selection/adaptive/types";

export interface CandidateFilterCounts {
  totalAvailable: number;
  afterConceptFilter: number;
  afterExposureFilter: number;
  afterFamilyLimitFilter: number;
  afterDifficultyFilter: number;
}

export interface CandidateSelectionResult {
  selected: Question | null;
  filterCounts: CandidateFilterCounts;
  topCandidates: CandidateScore[];
  fallbackUsed: FallbackMode;
}

const TOP_CANDIDATES_LIMIT = 10;

function getQuestionFamilyCounts(presentedQuestionIds: string[], availableQuestions: Question[]): Record<string, number> {
  const byId = new Map(availableQuestions.map((q) => [q.id, q]));
  const counts: Record<string, number> = {};
  for (const id of presentedQuestionIds) {
    const family = byId.get(id)?.questionFamily;
    if (family) counts[family] = (counts[family] ?? 0) + 1;
  }
  return counts;
}

function compareQuestionId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Filters and ranks the question bank down to one choice for
 * `targetConceptId` at `targetDifficulty`, deterministically. Every
 * filtering step is a candidate-count snapshot recorded for the trace
 * (B8); ranking uses a fixed scoring rule with `questionId` as the final
 * tie-break (B6's "deterministic tie-breaking").
 *
 * Filter order: concept membership -> not already presented -> question
 * family repetition limit (a SOFT constraint — relaxed back to the
 * exposure-filtered pool if it would otherwise empty the candidates) ->
 * target difficulty (widened outward by |difficulty - target| if no
 * question exists at the exact target difficulty).
 */
export function selectCandidateQuestion(
  targetConceptId: string,
  targetDifficulty: DifficultyLevel,
  context: AdaptiveSelectionContext,
  config: AdaptiveSelectionConfig,
): CandidateSelectionResult {
  const { availableQuestions, presentedQuestionIds, misconceptionTallies } = context;
  const presented = new Set(presentedQuestionIds);
  const totalAvailable = availableQuestions.length;

  const conceptMatches = availableQuestions.filter((q) => q.conceptIds.includes(targetConceptId));
  const afterConceptFilter = conceptMatches.length;

  const unseen = conceptMatches.filter((q) => !presented.has(q.id));
  const afterExposureFilter = unseen.length;

  const familyCounts = getQuestionFamilyCounts(presentedQuestionIds, availableQuestions);
  const familyFiltered = unseen.filter(
    (q) => !q.questionFamily || (familyCounts[q.questionFamily] ?? 0) < config.questionFamilyRepetitionLimit,
  );
  const familyPool = familyFiltered.length > 0 ? familyFiltered : unseen;
  const afterFamilyLimitFilter = familyPool.length;

  let fallbackUsed: FallbackMode = "none";
  let pool = familyPool.filter((q) => q.difficulty === targetDifficulty);
  if (pool.length === 0 && familyPool.length > 0) {
    pool = [...familyPool].sort((a, b) => {
      const da = Math.abs(a.difficulty - targetDifficulty);
      const db = Math.abs(b.difficulty - targetDifficulty);
      return da !== db ? da - db : compareQuestionId(a.id, b.id);
    });
    fallbackUsed = "widened_difficulty";
  }
  const afterDifficultyFilter = pool.length;

  const filterCounts: CandidateFilterCounts = {
    totalAvailable,
    afterConceptFilter,
    afterExposureFilter,
    afterFamilyLimitFilter,
    afterDifficultyFilter,
  };

  if (pool.length === 0) {
    return { selected: null, filterCounts, topCandidates: [], fallbackUsed: "exhausted" };
  }

  const tally = misconceptionTallies[targetConceptId] ?? {};
  const scored: CandidateScore[] = pool.map((q) => {
    const misconceptionOverlap = q.options.filter(
      (o) => !o.isCorrect && o.misconceptionId !== undefined && (tally[o.misconceptionId] ?? 0) >= config.misconceptionEvidenceMinCount,
    ).length;
    const difficultyScore = q.difficulty === targetDifficulty ? 5 : -Math.abs(q.difficulty - targetDifficulty);
    return { questionId: q.id, score: misconceptionOverlap * 10 + difficultyScore, difficulty: q.difficulty, misconceptionOverlap };
  });

  scored.sort((a, b) => (b.score !== a.score ? b.score - a.score : compareQuestionId(a.questionId, b.questionId)));

  const selectedId = scored[0].questionId;
  const selected = pool.find((q) => q.id === selectedId) ?? null;

  return { selected, filterCounts, topCandidates: scored.slice(0, TOP_CANDIDATES_LIMIT), fallbackUsed };
}
