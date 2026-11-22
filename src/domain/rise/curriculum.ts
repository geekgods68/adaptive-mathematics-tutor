import { RISE_CONCEPTS } from "@/domain/rise";

/**
 * Shared RISE curriculum/chapter access — the canonical home for this
 * logic (Stage 1 experimental-validity work, see
 * docs/research-decisions.md RD-0010). Originally lived only in
 * `src/tutoring/adaptiveSession/curriculum.ts`; moved here, unchanged,
 * so the non-adaptive-on-RISE condition (Stage 1) can use the exact same
 * chapter list and curriculum ordering as the adaptive condition without
 * importing from a module named for the other condition.
 * `src/tutoring/adaptiveSession/curriculum.ts` re-exports everything
 * below for backward compatibility — no existing caller needed to
 * change.
 */

/** CH01-CH14, in order — the only hardcoded ordering here; titles below are cosmetic labels, not curriculum logic. */
export const CHAPTER_TITLES: Record<string, string> = {
  CH01: "Algebra Foundations",
  CH02: "Functions",
  CH03: "Exponents",
  CH04: "Logarithms",
  CH05: "Differentiation",
  CH06: "Integration",
  CH07: "Geometry",
  CH08: "Trigonometry",
  CH09: "Vectors",
  CH10: "Probability",
  CH11: "Statistics",
  CH12: "Proofs and Logic",
  CH13: "Permutations and Combinations",
  CH14: "Complex Numbers",
};

export interface ChapterOption {
  chapterId: string;
  title: string;
}

/** Every chapter actually present in the loaded curriculum, in CH01..CH14 order — derived from the real data, not hardcoded as a count. */
export function listAvailableChapters(): ChapterOption[] {
  const present = new Set(RISE_CONCEPTS.map((c) => c.chapterId).filter((id): id is string => Boolean(id)));
  return Object.keys(CHAPTER_TITLES)
    .filter((id) => present.has(id))
    .map((chapterId) => ({ chapterId, title: CHAPTER_TITLES[chapterId] }));
}

/**
 * A deterministic curriculum order shared by BOTH the adaptive session
 * engine (see `AdaptiveSelectionContext.curriculumOrder` and
 * `findProgressionFrontier`) and, as of Stage 1, the non-adaptive-on-RISE
 * sequence builder (`src/tutoring/selection/nonAdaptive/riseSequence.ts`):
 * the chosen chapter's own concepts, sorted by `curriculumLevel` then
 * `id`. Concepts outside the chosen chapter are NOT included here, but
 * remain reachable through the adaptive condition's prerequisite
 * backtracking/diagnostic probing (see `AdaptiveSelectionContext.concepts`,
 * which the service always populates with the FULL concept graph) — this
 * mirrors exactly the "off-path prerequisite" design the Phase 4
 * diagnostic-backtracking refinement documented in
 * docs/research-decisions.md RD-0005. The non-adaptive condition has no
 * such backtracking (by design — it must not react to performance), so
 * for it this is simply "the eligible curriculum scope," matching Stage
 * 1's fair-exposure requirement that both conditions share the same
 * eligible content boundary for a given chapter selection.
 *
 * Omitting `chapterId` walks every chapter in curriculum order.
 */
export function buildAdaptiveCurriculumOrder(chapterId?: string): string[] {
  const concepts = chapterId ? RISE_CONCEPTS.filter((c) => c.chapterId === chapterId) : RISE_CONCEPTS;
  return [...concepts]
    .sort((a, b) => (a.curriculumLevel ?? 0) - (b.curriculumLevel ?? 0) || a.id.localeCompare(b.id))
    .map((c) => c.id);
}
