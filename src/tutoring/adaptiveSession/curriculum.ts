/**
 * Re-exported from the shared, condition-agnostic home
 * (`src/domain/rise/curriculum.ts`) as of Stage 1's experimental-validity
 * work (docs/research-decisions.md RD-0010) — the non-adaptive-on-RISE
 * condition (`src/tutoring/nonAdaptiveRiseSession/`) needs the exact same
 * chapter list and curriculum ordering this module always provided, and
 * importing it from a module literally named "adaptiveSession" would
 * have been confusing. Kept as a re-export, not removed, so no existing
 * import of this path needed to change.
 */
export { CHAPTER_TITLES, listAvailableChapters, buildAdaptiveCurriculumOrder, type ChapterOption } from "@/domain/rise/curriculum";
