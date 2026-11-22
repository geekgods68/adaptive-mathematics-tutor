/**
 * Stage 1 (experimental-validity remediation, docs/research-decisions.md
 * RD-0010): a deterministic, concept-balanced, performance-independent
 * predetermined-sequence BUILDER for the RISE question bank — feeding
 * the existing, completely unmodified `NonAdaptiveSelectionPolicy`
 * (`nonAdaptiveSelectionPolicy.ts`) via its existing
 * `NonAdaptiveSelectionContext.predeterminedSequence` field.
 *
 * This module does NOT change what "non-adaptive" means: it only
 * computes, once, before a session starts, which fixed sequence that
 * session will walk. Nothing here is consulted again after a session
 * begins, and nothing here ever reads correctness, mastery, or any other
 * performance signal — it operates only on the question bank, the
 * curriculum, an optional chapter scope, a deterministic seed string,
 * and (optionally) a list of previously-seen question ids to prefer
 * avoiding for cross-session continuity. All of these are explicitly
 * permitted non-performance inputs for a non-adaptive control condition.
 *
 * Mirrors the shape of the existing hand-authored
 * `NON_ADAPTIVE_STUDY_SEQUENCE` (strand/concept-balanced, difficulty
 * varied-but-controlled) but computed programmatically, because the
 * 1,840-question/109-concept RISE bank cannot reasonably be hand-curated
 * the way the original 161-question bank was — see Part 4.3 of the
 * Stage 1 brief ("if the protocol already defines the policy, implement
 * that one; otherwise choose and document a defensible one"). No
 * existing protocol document defines a RISE-scale non-adaptive policy,
 * so this is a new, explicitly documented design decision (RD-0010).
 */

import type { Question } from "@/domain/questions/types";
import { RISE_QUESTIONS } from "@/domain/rise";
import { buildAdaptiveCurriculumOrder } from "@/domain/rise/curriculum";
import { seededShuffle } from "@/tutoring/session/optionOrder";

function effectiveConceptWeights(question: Question): Record<string, number> {
  return question.conceptWeights ?? { [question.primaryConceptId]: 1 };
}

export interface RiseNonAdaptiveSequenceOptions {
  /** Undefined walks every chapter, exactly like the adaptive condition's own "Across All Topics." */
  chapterId?: string;
  /** Session length budget — the fixed number of questions this sequence will contain (fewer only if the eligible pool is exhausted). */
  maxQuestions: number;
  /** Deterministic seed — same seed, same chapter, same exclusions, same maxQuestions always produces the same sequence. Must NOT be derived from performance; a participant/session id or a fixed study-design constant are both appropriate. */
  seed: string;
  /** Question ids to prefer not reusing (e.g. already seen in a prior session by this same participant) — permitted under Part 4.1 ("previously presented question IDs for repetition prevention"). Falls back to allowing reuse only if the eligible pool would otherwise be exhausted. */
  excludeQuestionIds?: readonly string[];
}

/**
 * Builds a fixed, concept-balanced sequence of RISE question ids in
 * curriculum order: each concept in `buildAdaptiveCurriculumOrder`
 * (the SAME curriculum ordering the adaptive condition uses for the same
 * chapter scope — see Part 4.2's "shared eligible question pool"
 * requirement) gets an equal share of the question budget (remainder
 * distributed to the earliest concepts), cycling difficulty levels
 * 1→5 within each concept's block for a controlled, varied-but-
 * documented difficulty distribution (matching the original bank's own
 * NON_ADAPTIVE_STUDY_SEQUENCE design note: "rising... while varying
 * naturally," not sorted into flat blocks). Candidate choice within a
 * (concept, difficulty) pool is by a deterministic seeded shuffle
 * (`seededShuffle`, already used elsewhere in this codebase for option
 * display order) — never by `Math.random()`, and never influenced by
 * which option a student selects.
 */
export function buildRiseNonAdaptiveSequence(options: RiseNonAdaptiveSequenceOptions): string[] {
  const { chapterId, maxQuestions, seed, excludeQuestionIds = [] } = options;
  if (maxQuestions <= 0) return [];

  const curriculumOrder = buildAdaptiveCurriculumOrder(chapterId);
  if (curriculumOrder.length === 0) return [];

  const excludeSet = new Set(excludeQuestionIds);
  const eligibleQuestions = chapterId ? RISE_QUESTIONS.filter((q) => curriculumOrder.some((c) => c in effectiveConceptWeights(q))) : RISE_QUESTIONS;

  // Pool of candidate ids per (concept, difficulty), unseen-preferred: built once, then drawn from
  // without replacement as the sequence is assembled, so no id is ever picked twice within one
  // sequence regardless of how many questions are requested.
  function buildPool(preferUnseen: boolean): Map<string, Map<number, string[]>> {
    const poolByConceptLevel = new Map<string, Map<number, string[]>>();
    for (const conceptId of curriculumOrder) {
      const byLevel = new Map<number, string[]>();
      for (const q of eligibleQuestions) {
        if (!(conceptId in effectiveConceptWeights(q))) continue;
        if (preferUnseen && excludeSet.has(q.id)) continue;
        const list = byLevel.get(q.difficulty) ?? [];
        list.push(q.id);
        byLevel.set(q.difficulty, list);
      }
      for (const list of byLevel.values()) list.sort(); // deterministic order before seeded shuffling
      poolByConceptLevel.set(conceptId, byLevel);
    }
    return poolByConceptLevel;
  }

  // Tier 1: build entirely from unseen questions. If that leaves any concept with zero candidates
  // at every level (small chapter + long exclusion list), fall back to allowing reuse everywhere —
  // never partially exclude, which could silently unbalance concept coverage.
  const unseenPool = buildPool(true);
  const everyConceptHasAnyCandidate = curriculumOrder.every((c) => [...(unseenPool.get(c)?.values() ?? [])].some((items) => items.length > 0));
  const poolByConceptLevel = everyConceptHasAnyCandidate ? unseenPool : buildPool(false);

  const conceptCount = curriculumOrder.length;
  const perConcept = Math.floor(maxQuestions / conceptCount);
  const remainder = maxQuestions - perConcept * conceptCount;

  const sequence: string[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < conceptCount; i++) {
    const conceptId = curriculumOrder[i];
    const blockLength = perConcept + (i < remainder ? 1 : 0);
    const byLevel = poolByConceptLevel.get(conceptId)!;
    for (let j = 0; j < blockLength; j++) {
      const level = (j % 5) + 1;
      const picked = pickFromLevel(byLevel, level, conceptId, seed, usedIds) ?? pickFromAnyLevel(byLevel, conceptId, seed, usedIds);
      if (picked) {
        sequence.push(picked);
        usedIds.add(picked);
      }
      // If genuinely nothing is left for this concept anywhere (bank exhausted for this scope),
      // that slot is simply skipped — a shorter-than-requested sequence is always preferable to a
      // duplicate or a fabricated id, and mirrors the adaptive condition's own "fewer than
      // maxQuestions when eligible content runs out" behavior.
    }
  }

  return sequence;
}

function pickFromLevel(byLevel: Map<number, string[]>, level: number, conceptId: string, seed: string, usedIds: Set<string>): string | undefined {
  const candidates = (byLevel.get(level) ?? []).filter((id) => !usedIds.has(id));
  if (candidates.length === 0) return undefined;
  const shuffled = seededShuffle(candidates, `${seed}::${conceptId}::${level}`);
  return shuffled[0];
}

function pickFromAnyLevel(byLevel: Map<number, string[]>, conceptId: string, seed: string, usedIds: Set<string>): string | undefined {
  for (const [level, ids] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
    const picked = pickFromLevel(new Map([[level, ids]]), level, conceptId, seed, usedIds);
    if (picked) return picked;
  }
  return undefined;
}
