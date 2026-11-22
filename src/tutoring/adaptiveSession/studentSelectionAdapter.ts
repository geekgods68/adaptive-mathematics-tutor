import type { Question } from "@/domain/questions/types";
import type { SelectionAdapter } from "@/research/experiment/types";

/**
 * A STUDENT-FACING-ONLY wrapper around a registered Phase 8
 * `SelectionAdapter` (condition C2's own `createAdaptiveSelectionAdapter`
 * output, built fresh per session in service.ts) that adds cross-session
 * "prefer unseen questions" preference WITHOUT modifying the protected
 * selection algorithm (src/tutoring/selection/adaptive/) or the
 * registered Phase 8 condition (src/research/experiment/conditions.ts)
 * in any way. Every concept/difficulty/prerequisite/family/
 * misconception-aware decision the protected algorithm makes is
 * untouched; this wrapper only narrows or widens the CANDIDATE POOL
 * (`availableQuestions`) the algorithm is allowed to choose from, for
 * each attempt, then defers entirely to the base adapter's own logic.
 *
 * This is a "preprocessing layer outside protected modules," exactly as
 * described for this requirement: the base adapter's `selectNext` is
 * called unmodified, 1 to N times with different candidate pools, and
 * whichever call first returns a non-null question is used as-is
 * (trace included, untouched).
 *
 * Two tiers, both fully deterministic given the same inputs:
 *  1. Prefer unseen: exclude every cross-session-seen question id from
 *     the pool. If the base adapter can still find an eligible question
 *     (which it almost always can, given the size of the full bank
 *     relative to any one concept's pool), that is returned.
 *  2. Controlled reuse: if tier 1 finds nothing (the unseen pool has no
 *     eligible candidate for whatever concept/difficulty the base
 *     adapter internally decided on), allow reuse starting from the
 *     LEAST recently seen question, expanding the allowed-reuse set one
 *     question at a time (oldest first) until a selection succeeds.
 *     This never second-guesses which concept/difficulty was chosen —
 *     it has no visibility into that decision at all — it only ever
 *     grows the pool the (unmodified) base adapter searches.
 */
export function createCrossSessionAwareSelectionAdapter(
  base: SelectionAdapter,
  availableQuestions: readonly Question[],
  seenQuestionIdsOldestFirst: readonly string[],
): SelectionAdapter {
  const seenSet = new Set(seenQuestionIdsOldestFirst);
  const unseenBank = availableQuestions.filter((q) => !seenSet.has(q.id));

  return {
    policyType: base.policyType,
    version: base.version,
    parameters: base.parameters,
    selectNext(input) {
      const tier1 = base.selectNext({ ...input, availableQuestions: unseenBank });
      if (tier1.result.questionId !== null) return tier1;

      for (let i = 0; i < seenQuestionIdsOldestFirst.length; i++) {
        const allowedReuseIds = new Set(seenQuestionIdsOldestFirst.slice(0, i + 1));
        const expandedBank = availableQuestions.filter((q) => !seenSet.has(q.id) || allowedReuseIds.has(q.id));
        const attempt = base.selectNext({ ...input, availableQuestions: expandedBank });
        if (attempt.result.questionId !== null) return attempt;
      }

      // Every previously-seen question has been tried and none helped (or there was never any
      // cross-session history to begin with) -- defer to the base adapter's own terminal
      // behavior against the complete, unmodified bank.
      return base.selectNext({ ...input, availableQuestions: [...availableQuestions] });
    },
  };
}
