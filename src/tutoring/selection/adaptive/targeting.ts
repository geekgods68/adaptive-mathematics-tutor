import type { Concept } from "@/domain/concepts/types";
import type { ConceptMasteryState } from "@/domain/learner-model/types";
import type { DifficultyLevel } from "@/domain/questions/types";
import type { AdaptiveSelectionConfig, MasteryDifficultyBand } from "@/tutoring/selection/adaptive/config";
import type {
  AdaptiveSelectionContext,
  ConsideredConceptTrace,
  DiagnosticCandidateInfo,
  TargetConceptDecision,
  TargetDifficultyDecision,
} from "@/tutoring/selection/adaptive/types";

/** A concept counts as "done" only once BOTH its mastery estimate and its evidence volume clear the configured thresholds — a high mastery estimate from one lucky guess is not enough (see CLAUDE.md principle 7's spirit: evidence, not proof). */
export function isConceptMastered(state: ConceptMasteryState | undefined, config: AdaptiveSelectionConfig): boolean {
  return !!state && state.mastery >= config.masteryProgressionThreshold && state.numObservations >= config.minEvidenceCount;
}

/** The first not-yet-mastered concept in curriculum order — "where the learner currently is." If every concept is mastered, returns the last concept in the order (there is always more practice available, not a terminal state) rather than null. Returns null only for an empty curriculum. */
export function findProgressionFrontier(
  curriculumOrder: string[],
  states: Record<string, ConceptMasteryState>,
  config: AdaptiveSelectionConfig,
): string | null {
  if (curriculumOrder.length === 0) return null;
  for (const conceptId of curriculumOrder) {
    if (!isConceptMastered(states[conceptId], config)) return conceptId;
  }
  return curriculumOrder[curriculumOrder.length - 1];
}

/**
 * Breadth-first search outward from `startConceptId` through DIRECT
 * `prerequisiteIds` edges, looking for the first prerequisite with
 * either insufficient evidence or mastery below the remediation
 * threshold. Bounded by `config.maxPrerequisiteBacktrackDepth` AND a
 * visited-set (defence in depth against a cyclic or malformed graph,
 * independent of the curriculum model's own acyclicity validation — see
 * B6's "do not allow infinite prerequisite-backtracking loops").
 *
 * Returns the found concept id plus the exact hop chain from
 * `startConceptId` to it (for trace reconstruction), or `null` if no
 * such prerequisite is found within the depth bound — callers should
 * then fall back to remediating `startConceptId` itself (e.g. an easier
 * question on the SAME concept) rather than assuming no prerequisite
 * issue exists at all.
 *
 * This only SELECTS a concept to investigate next — it never writes to
 * `states`, and finding a weak prerequisite here is not treated as proof
 * that prerequisite is unmastered; the subsequent question is what
 * actually gathers that evidence (see B3's "use prerequisite
 * relationships to determine what should be investigated next, not to
 * fabricate mastery observations").
 */
export function findRemediationTarget(
  startConceptId: string,
  states: Record<string, ConceptMasteryState>,
  concepts: Concept[],
  config: AdaptiveSelectionConfig,
): { conceptId: string; chain: string[] } | null {
  const conceptById = new Map(concepts.map((c) => [c.id, c]));
  const visited = new Set<string>([startConceptId]);
  const parent = new Map<string, string>();
  let frontier = [startConceptId];

  for (let depth = 0; depth < config.maxPrerequisiteBacktrackDepth && frontier.length > 0; depth++) {
    const nextFrontier: string[] = [];
    for (const conceptId of frontier) {
      const concept = conceptById.get(conceptId);
      if (!concept) continue;
      for (const prereqId of concept.prerequisiteIds) {
        if (visited.has(prereqId)) continue;
        visited.add(prereqId);
        parent.set(prereqId, conceptId);

        const state = states[prereqId];
        const observations = state?.numObservations ?? 0;
        const mastery = state?.mastery;
        const needsAttention = observations < config.minEvidenceCount || (mastery !== undefined && mastery < config.masteryRemediationThreshold);

        if (needsAttention) {
          const chain: string[] = [prereqId];
          let cursor = prereqId;
          while (parent.has(cursor)) {
            cursor = parent.get(cursor)!;
            chain.unshift(cursor);
          }
          return { conceptId: prereqId, chain };
        }
        nextFrontier.push(prereqId);
      }
    }
    frontier = nextFrontier;
  }
  return null;
}

export interface DiagnosticBacktrackResult {
  conceptId: string | null;
  chain: string[];
  prerequisitesConsidered: DiagnosticCandidateInfo[];
}

/**
 * The stronger counterpart to `findRemediationTarget`, for SUSTAINED
 * downstream difficulty (see docs/research-decisions.md RD-0005's
 * diagnostic-backtracking refinement). Unlike `findRemediationTarget`,
 * this considers EVERY direct prerequisite as a candidate — including
 * ones that have already crossed `masteryProgressionThreshold` and been
 * advanced past — because a frozen historical mastery estimate on a
 * concept that hasn't been asked about in a long time is exactly the
 * situation ordinary remediation can never revisit (a concept at or
 * above the progression threshold can never also be below the much
 * lower remediation threshold, so `findRemediationTarget` structurally
 * cannot select it — see RD-0005's originally-documented limitation).
 *
 * A prerequisite is ELIGIBLE for diagnostic probing only if it is
 * "stale": no evidence at all, or its last recorded observation is more
 * than `config.diagnosticStalenessThreshold` sequence steps behind
 * `currentSequenceIndex` — regardless of how high its mastery was. This
 * is deliberately NOT a mastery check: the point is to re-confirm an
 * old estimate, not to assume it was wrong. It is also the mechanism
 * that naturally RETURNS control to the original concept — once a
 * prerequisite is probed, its `lastSequenceIndex` updates, making it
 * ineligible again immediately, so the search moves on to (or runs out
 * of) other prerequisites rather than re-selecting the same one every
 * round.
 *
 * Same bounded, closest-first, visited-guarded traversal as
 * `findRemediationTarget` (defence against cycles/runaway depth).
 * Eligible candidates at the first qualifying depth are ranked: never-
 * observed first, then lowest mastery, then largest staleness gap, then
 * `conceptId` ascending — "prefer prerequisites with lower mastery or
 * insufficient recent evidence," deterministically.
 *
 * Read-only: never writes to `states`. Finding a stale prerequisite is
 * not treated as evidence it is unmastered — the diagnostic QUESTION
 * that gets asked next is what gathers real evidence; this function
 * only selects what to ask about.
 */
export function findDiagnosticBacktrackTarget(
  startConceptId: string,
  states: Record<string, ConceptMasteryState>,
  concepts: Concept[],
  config: AdaptiveSelectionConfig,
  currentSequenceIndex: number,
): DiagnosticBacktrackResult {
  const conceptById = new Map(concepts.map((c) => [c.id, c]));
  const visited = new Set<string>([startConceptId]);
  const parent = new Map<string, string>();
  let frontier = [startConceptId];
  const prerequisitesConsidered: DiagnosticCandidateInfo[] = [];

  for (let depth = 0; depth < config.maxPrerequisiteBacktrackDepth && frontier.length > 0; depth++) {
    const nextFrontier: string[] = [];
    const levelInfos: DiagnosticCandidateInfo[] = [];

    for (const conceptId of frontier) {
      const concept = conceptById.get(conceptId);
      if (!concept) continue;
      for (const prereqId of concept.prerequisiteIds) {
        if (visited.has(prereqId)) continue;
        visited.add(prereqId);
        parent.set(prereqId, conceptId);
        nextFrontier.push(prereqId);

        const state = states[prereqId];
        const sequenceGap = currentSequenceIndex - (state?.lastSequenceIndex ?? -1);
        const eligible = !state || state.numObservations === 0 || sequenceGap >= config.diagnosticStalenessThreshold;
        const info: DiagnosticCandidateInfo = {
          conceptId: prereqId,
          mastery: state?.mastery,
          numObservations: state?.numObservations ?? 0,
          sequenceGap,
          eligible,
        };
        levelInfos.push(info);
        prerequisitesConsidered.push(info);
      }
    }

    const eligibleAtThisLevel = levelInfos.filter((info) => info.eligible);
    if (eligibleAtThisLevel.length > 0) {
      eligibleAtThisLevel.sort((a, b) => {
        if ((a.numObservations === 0) !== (b.numObservations === 0)) return a.numObservations === 0 ? -1 : 1;
        const aMastery = a.mastery ?? 0;
        const bMastery = b.mastery ?? 0;
        if (aMastery !== bMastery) return aMastery - bMastery;
        if (a.sequenceGap !== b.sequenceGap) return b.sequenceGap - a.sequenceGap;
        return a.conceptId < b.conceptId ? -1 : a.conceptId > b.conceptId ? 1 : 0;
      });
      const chosenId = eligibleAtThisLevel[0].conceptId;
      const chain: string[] = [chosenId];
      let cursor = chosenId;
      while (parent.has(cursor)) {
        cursor = parent.get(cursor)!;
        chain.unshift(cursor);
      }
      return { conceptId: chosenId, chain, prerequisitesConsidered };
    }

    frontier = nextFrontier;
  }

  return { conceptId: null, chain: [], prerequisitesConsidered };
}

/**
 * Decides which concept the next question should target. Pure and
 * deterministic: identical `context`/`config` always produce an
 * identical decision. See docs/research-decisions.md RD-0005 for the
 * full rule set.
 */
export function chooseTargetConcept(context: AdaptiveSelectionContext, config: AdaptiveSelectionConfig): TargetConceptDecision {
  const { curriculumOrder, conceptMasteryStates: states, concepts } = context;

  const consideredConcepts: ConsideredConceptTrace[] = curriculumOrder.map((conceptId) => {
    const state = states[conceptId];
    const mastered = isConceptMastered(state, config);
    return {
      conceptId,
      mastery: state?.mastery,
      numObservations: state?.numObservations ?? 0,
      eligible: !mastered,
      ineligibleReason: mastered ? "mastery and evidence both meet the progression threshold" : undefined,
    };
  });

  const frontierConceptId = findProgressionFrontier(curriculumOrder, states, config);
  if (frontierConceptId === null) {
    return { conceptId: null, reason: "no_eligible_concept", consideredConcepts };
  }

  const frontierState = states[frontierConceptId];
  if (!frontierState || frontierState.numObservations < config.minEvidenceCount) {
    return { conceptId: frontierConceptId, reason: "insufficient_evidence", consideredConcepts };
  }

  // The prerequisite-UNAWARE ablation (Phase 5 condition C3, RD-0006)
  // skips both backtracking mechanisms entirely — every struggle is
  // remediated on the SAME concept, never a prerequisite. Difficulty
  // adaptation below is unaffected by this flag.
  if (config.prerequisiteAware) {
    // Checked BEFORE ordinary remediation, at a strictly higher threshold:
    // crossing it implies ordinary remediation (below) has already had a
    // chance to run on prior calls and the learner is STILL struggling —
    // see docs/research-decisions.md RD-0005's diagnostic-backtracking
    // refinement. This is the only path that can select a
    // previously-progressed prerequisite.
    if (frontierState.consecutiveIncorrect >= config.diagnosticBacktrackConsecutiveIncorrectThreshold) {
      const diagnostic = findDiagnosticBacktrackTarget(frontierConceptId, states, concepts, config, context.sequenceIndex);
      if (diagnostic.conceptId !== null) {
        return {
          conceptId: diagnostic.conceptId,
          reason: "diagnostic_probe",
          consideredConcepts,
          prerequisiteChain: diagnostic.chain,
          diagnosticDetails: {
            originalConceptId: frontierConceptId,
            triggerConsecutiveIncorrect: frontierState.consecutiveIncorrect,
            isTemporaryProbe: true,
            prerequisitesConsidered: diagnostic.prerequisitesConsidered,
            returnCondition:
              `Will resume targeting "${frontierConceptId}" once every direct prerequisite has evidence from ` +
              `within the last ${config.diagnosticStalenessThreshold} sequence steps (no prerequisite remains ` +
              `eligible for diagnostic probing), or sooner if "${frontierConceptId}" itself is answered correctly ` +
              `and its consecutive-incorrect streak resets.`,
          },
        };
      }
      // No prerequisite is currently eligible for diagnostic probing
      // (e.g. all were recently probed, or there are none) — fall through
      // to ordinary remediation below rather than getting stuck.
    }

    if (frontierState.consecutiveIncorrect >= config.consecutiveIncorrectRemediationThreshold) {
      const remediation = findRemediationTarget(frontierConceptId, states, concepts, config);
      if (remediation) {
        return {
          conceptId: remediation.conceptId,
          reason: "prerequisite_backtrack",
          consideredConcepts,
          prerequisiteChain: remediation.chain,
        };
      }
      return { conceptId: frontierConceptId, reason: "remediation", consideredConcepts };
    }

    return { conceptId: frontierConceptId, reason: "progression", consideredConcepts };
  }

  // prerequisiteAware === false: no backtracking of any kind. A
  // struggling concept is always remediated on itself; anything short of
  // that threshold is ordinary progression.
  if (frontierState.consecutiveIncorrect >= config.consecutiveIncorrectRemediationThreshold) {
    return { conceptId: frontierConceptId, reason: "remediation", consideredConcepts };
  }
  return { conceptId: frontierConceptId, reason: "progression", consideredConcepts };
}

/** First band (in ascending maxMastery order) whose maxMastery is >= mastery; falls back to the last configured band (or difficulty 3) if the table is misconfigured/empty, rather than throwing — difficulty selection should degrade gracefully, not crash a session. */
export function resolveDifficultyBand(mastery: number, bands: readonly MasteryDifficultyBand[]): DifficultyLevel {
  for (const band of bands) {
    if (mastery <= band.maxMastery) return band.difficulty;
  }
  return bands.length > 0 ? bands[bands.length - 1].difficulty : 3;
}

function getRecentDifficulties(context: AdaptiveSelectionContext, n: number): DifficultyLevel[] {
  if (n <= 0) return [];
  const byId = new Map(context.availableQuestions.map((q) => [q.id, q]));
  return context.presentedQuestionIds
    .slice(-n)
    .map((id) => byId.get(id)?.difficulty)
    .filter((d): d is DifficultyLevel => d !== undefined);
}

/**
 * Decides which difficulty level to target for `targetConceptId`, given
 * how much evidence exists for it and (secondarily) recent presentation
 * history, so the engine doesn't hammer one difficulty indefinitely. The
 * Phase 3 mastery formula itself is never touched by this function —
 * this only reads `ConceptMasteryState.mastery`/`numObservations`.
 */
export function chooseTargetDifficulty(
  targetConceptId: string | null,
  context: AdaptiveSelectionContext,
  config: AdaptiveSelectionConfig,
): TargetDifficultyDecision {
  if (targetConceptId === null) {
    return { difficulty: null, reason: "no target concept to assign a difficulty to", masteryUsed: undefined, evidenceCount: 0 };
  }

  const state = context.conceptMasteryStates[targetConceptId];
  const evidenceCount = state?.numObservations ?? 0;

  let difficulty: DifficultyLevel;
  let reason: string;
  if (!state || evidenceCount < config.minEvidenceCount) {
    difficulty = config.diagnosticDifficultyForLowEvidence;
    reason = `insufficient evidence for "${targetConceptId}" (${evidenceCount} < ${config.minEvidenceCount} observations) — using the configured diagnostic difficulty`;
  } else {
    difficulty = resolveDifficultyBand(state.mastery, config.difficultyByMastery);
    reason = `mastery ${state.mastery.toFixed(4)} for "${targetConceptId}" maps to difficulty ${difficulty} via the configured mastery-difficulty bands`;
  }

  const recent = getRecentDifficulties(context, config.maxConsecutiveSameDifficulty);
  if (recent.length === config.maxConsecutiveSameDifficulty && recent.every((d) => d === difficulty)) {
    const adjusted = (difficulty < 5 ? difficulty + 1 : difficulty - 1) as DifficultyLevel;
    reason += `; nudged from ${difficulty} to ${adjusted} to avoid presenting the same difficulty ${config.maxConsecutiveSameDifficulty}+ times in a row`;
    difficulty = adjusted;
  }

  return { difficulty, reason, masteryUsed: state?.mastery, evidenceCount };
}
