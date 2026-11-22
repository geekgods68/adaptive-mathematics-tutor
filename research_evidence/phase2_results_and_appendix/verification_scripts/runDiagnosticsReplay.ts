/**
 * DETERMINISTIC REPLAY -- NOT a new experiment. Re-runs Track-B sessions
 * for ALL FOUR conditions (C0, C1, C2, C3) across all 6 families x 5
 * worlds x 3 slices x 50 learners, using the existing `onRunComplete`
 * hook (already present, additive, non-invasive -- see
 * src/research/phase8/trackB/runTrackB.ts's RunTrackBSessionOptions
 * doc-comment) to recover the per-session diagnostic fields
 * (divertedShare, countsByReason, backtrackPrecision -- already returned
 * by runTrackBSession itself) PLUS presented-question-id sequences and
 * per-step correctness (via finalState, only reachable through the hook)
 * needed for difficulty-allocation and target-coverage analysis.
 *
 * Aggregates on the fly; does not persist 18,000 raw session dumps.
 * Does not modify any pilot report. C0/C2/C3 sessions here are BYTE-
 * IDENTICAL reruns of already-executed cells (same seeds); only C1 is a
 * cell that did not exist in either stored pilot (see
 * runC1Retrospective.ts's artifact for C1's own K(T)/QTM numbers --
 * this script's C1 kT/itemsToCriterion values, computed independently
 * here, serve as an internal cross-check on that artifact).
 *
 * Run with: npx tsx research_evidence/phase2_results_and_appendix/verification_scripts/runDiagnosticsReplay.ts
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import { selectConceptSubgraphSlices } from "@/research/phase8/slices/selectSlices";
import { effectiveConceptWeights } from "@/research/phase8/slices/selectSlices";
import { loadPhase8Config } from "@/research/phase8/config/load";
import { runTrackBSession, type TrackBConditionId } from "@/research/phase8/trackB/runTrackB";
import type { SimFamily, S4Setup } from "@/research/phase8/simulator/dispatch";

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}
function gitHeadSafe(): string {
  try { return execSync("git rev-parse HEAD").toString().trim(); } catch { return "UNKNOWN"; }
}

const cfg = loadPhase8Config();
const plan = cfg.plan.value;
const pilotWorlds = plan.pilot.worlds;
const trackBLearners = plan.pilot.trackBLearners;
const budget = plan.trackB.budget;
const sliceResult = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS);
const slices = sliceResult.primarySlices;
const trackBFamilyConfigs = plan.trackB.configs as string[];
const CONDITIONS: TrackBConditionId[] = ["C0", "C1", "C2", "C3"];

const questionById = new Map(RISE_QUESTIONS.map((q) => [q.id, q]));

interface SessionAgg {
  kT: number;
  itemsToCriterion: number | null;
  censored: boolean;
  divertedShare: number;
  backtrackPrecision: number | null;
  countsByReason: Record<string, number>;
  distinctItems: number;
  maxReuse: number;
  distinctTargetConceptsTouched: number;
  totalTargetConcepts: number;
  difficultyCounts: Record<number, number>; // level -> count, this session
  postCorrectDeltaSum: number;
  postCorrectDeltaN: number;
  postIncorrectDeltaSum: number;
  postIncorrectDeltaN: number;
}

const perFamilyCondition: Record<string, Record<TrackBConditionId, SessionAgg[]>> = {};

let totalRuns = 0;
let failureCount = 0;
const t0All = Date.now();

for (const familyConfigLabel of trackBFamilyConfigs) {
  const isS4 = familyConfigLabel.startsWith("S4-");
  const family: SimFamily = isS4 ? "S4" : (familyConfigLabel as SimFamily);
  const cellName = isS4 ? familyConfigLabel : undefined;
  perFamilyCondition[familyConfigLabel] = { C0: [], C1: [], C2: [], C3: [] };

  for (let world = 1; world <= pilotWorlds; world++) {
    for (const slice of slices) {
      const s4Setup: S4Setup | undefined = isS4
        ? {
            concepts: RISE_CONCEPTS.map((c) => ({ id: c.id, curriculumLevel: c.curriculumLevel ?? 0, prerequisiteIds: c.prerequisiteIds })),
            lambda: cfg.simulator.value.S4.cells[cellName!].lambda,
            phi: cfg.simulator.value.S4.cells[cellName!].phi,
            isTargetConcept: (conceptId: string) => slice.targetConceptIds.includes(conceptId),
          }
        : undefined;
      const targetSet = new Set(slice.targetConceptIds);

      for (let l = 0; l < trackBLearners; l++) {
        const learnerId = `pilot-${String(l).padStart(3, "0")}`;
        for (const conditionId of CONDITIONS) {
          totalRuns++;
          try {
            let presentedIds: string[] = [];
            let responses: { questionId: string; isCorrect: boolean; sequenceIndex: number }[] = [];
            let traces: unknown[] = [];
            const result = runTrackBSession({
              conditionId,
              identity: { masterSeed: plan.masterSeed, world, sliceId: slice.chapterId, learnerId },
              family, slice, concepts: RISE_CONCEPTS, allQuestions: RISE_QUESTIONS,
              simulatorConfig: cfg.simulator.value, budget, s4Setup,
              onRunComplete: (_config, _scenario, finalState) => {
                presentedIds = [...finalState.presentedQuestionIds];
                responses = finalState.responses.map((r) => ({ questionId: r.questionId, isCorrect: r.isCorrect, sequenceIndex: r.sequenceIndex }));
                traces = [...(finalState.selectionTraces ?? [])];
              },
            });

            // Target-concept coverage: distinct concepts (from presented questions' weights) that lie in the target set.
            const touched = new Set<string>();
            const difficultyCounts: Record<number, number> = {};
            for (const qid of presentedIds) {
              const q = questionById.get(qid);
              if (!q) continue;
              difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] ?? 0) + 1;
              for (const conceptId of Object.keys(effectiveConceptWeights(q))) {
                if (targetSet.has(conceptId)) touched.add(conceptId);
              }
            }

            // Post-correct / post-incorrect difficulty change: consecutive presented items, ordered by sequenceIndex.
            responses.sort((a, b) => a.sequenceIndex - b.sequenceIndex);
            let postCorrectDeltaSum = 0, postCorrectDeltaN = 0, postIncorrectDeltaSum = 0, postIncorrectDeltaN = 0;
            for (let i = 0; i < responses.length - 1; i++) {
              const qCur = questionById.get(responses[i].questionId);
              const qNext = questionById.get(responses[i + 1].questionId);
              if (!qCur || !qNext) continue;
              const delta = qNext.difficulty - qCur.difficulty;
              if (responses[i].isCorrect) { postCorrectDeltaSum += delta; postCorrectDeltaN++; }
              else { postIncorrectDeltaSum += delta; postIncorrectDeltaN++; }
            }

            void traces; // traces captured for potential future use; not further decomposed here (time-boxed scope)

            perFamilyCondition[familyConfigLabel][conditionId].push({
              kT: result.kT,
              itemsToCriterion: result.itemsToCriterion,
              censored: result.itemsToCriterionCensored,
              divertedShare: result.divertedShare,
              backtrackPrecision: result.backtrackPrecision,
              countsByReason: result.countsByReason,
              distinctItems: result.distinctItems,
              maxReuse: result.maxReuse,
              distinctTargetConceptsTouched: touched.size,
              totalTargetConcepts: slice.targetConceptIds.length,
              difficultyCounts,
              postCorrectDeltaSum, postCorrectDeltaN, postIncorrectDeltaSum, postIncorrectDeltaN,
            });
          } catch (e) {
            failureCount++;
            console.error(`diagnostics replay FAILURE: ${conditionId} family=${familyConfigLabel} world=${world} slice=${slice.chapterId} learner=${learnerId}:`, e);
          }
        }
      }
    }
  }
  console.error(`done: ${familyConfigLabel}`);
}

const wallClockMs = Date.now() - t0All;

// ---- Aggregation into a compact summary (raw per-session arrays kept only for this summary's own computations, not written out in full) ----
function summarize(rows: SessionAgg[]) {
  const n = rows.length;
  const meanDivertedShare = mean(rows.map((r) => r.divertedShare));
  const backtrackRows = rows.filter((r) => r.backtrackPrecision !== null);
  const meanBacktrackPrecision = backtrackRows.length ? mean(backtrackRows.map((r) => r.backtrackPrecision as number)) : null;
  const reasonTotals: Record<string, number> = {};
  for (const r of rows) for (const [reason, c] of Object.entries(r.countsByReason)) reasonTotals[reason] = (reasonTotals[reason] ?? 0) + c;
  const meanCoverageFraction = mean(rows.map((r) => (r.totalTargetConcepts > 0 ? r.distinctTargetConceptsTouched / r.totalTargetConcepts : 0)));
  const neverFullyCoveredCount = rows.filter((r) => r.distinctTargetConceptsTouched < r.totalTargetConcepts).length;
  const difficultyTotals: Record<number, number> = {};
  for (const r of rows) for (const [lvl, c] of Object.entries(r.difficultyCounts)) difficultyTotals[Number(lvl)] = (difficultyTotals[Number(lvl)] ?? 0) + c;
  const totalPostCorrectDeltaSum = rows.reduce((s, r) => s + r.postCorrectDeltaSum, 0);
  const totalPostCorrectDeltaN = rows.reduce((s, r) => s + r.postCorrectDeltaN, 0);
  const totalPostIncorrectDeltaSum = rows.reduce((s, r) => s + r.postIncorrectDeltaSum, 0);
  const totalPostIncorrectDeltaN = rows.reduce((s, r) => s + r.postIncorrectDeltaN, 0);
  const attained = rows.filter((r) => !r.censored);
  const censored = rows.filter((r) => r.censored);
  return {
    n,
    meanDivertedShare,
    meanBacktrackPrecision,
    reasonTotals,
    meanCoverageFraction,
    neverFullyCoveredCount,
    difficultyTotals,
    meanDifficultyChangeAfterCorrect: totalPostCorrectDeltaN ? totalPostCorrectDeltaSum / totalPostCorrectDeltaN : null,
    meanDifficultyChangeAfterIncorrect: totalPostIncorrectDeltaN ? totalPostIncorrectDeltaSum / totalPostIncorrectDeltaN : null,
    attainedCount: attained.length,
    censoredCount: censored.length,
    meanDivertedShare_attained: attained.length ? mean(attained.map((r) => r.divertedShare)) : null,
    meanDivertedShare_censored: censored.length ? mean(censored.map((r) => r.divertedShare)) : null,
    meanCoverageFraction_attained: attained.length ? mean(attained.map((r) => (r.totalTargetConcepts > 0 ? r.distinctTargetConceptsTouched / r.totalTargetConcepts : 0))) : null,
    meanCoverageFraction_censored: censored.length ? mean(censored.map((r) => (r.totalTargetConcepts > 0 ? r.distinctTargetConceptsTouched / r.totalTargetConcepts : 0))) : null,
    meanKT_attained: attained.length ? mean(attained.map((r) => r.kT)) : null,
    meanKT_censored: censored.length ? mean(censored.map((r) => r.kT)) : null,
  };
}

const summary: Record<string, Record<TrackBConditionId, ReturnType<typeof summarize>>> = {};
for (const family of Object.keys(perFamilyCondition)) {
  summary[family] = {} as Record<TrackBConditionId, ReturnType<typeof summarize>>;
  for (const cond of CONDITIONS) {
    summary[family][cond] = summarize(perFamilyCondition[family][cond]);
  }
}

const report = {
  LABEL: "DETERMINISTIC REPLAY -- per-session selection/coverage/difficulty diagnostics recovered via the pre-existing onRunComplete hook; aggregated here, not a new experiment.",
  generatedAt: new Date().toISOString(),
  sourceCommit: gitHeadSafe(),
  pilotWorlds,
  slicesUsed: slices.map((s) => s.chapterId),
  trackBLearnersPerSlice: trackBLearners,
  budget,
  masterSeed: plan.masterSeed,
  summary,
  totalRuns,
  failureCount,
  wallClockMs,
};

const outDir = join(process.cwd(), "research_evidence/phase2_results_and_appendix/retrospective_artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `diagnostics_replay_${report.generatedAt.replace(/[:.]/g, "-")}.json`);
const json = JSON.stringify(report, null, 2);
writeFileSync(outPath, json);
const sha256 = createHash("sha256").update(json).digest("hex");
writeFileSync(outPath + ".sha256.txt", `${sha256}  ${outPath}\n`);
console.log(JSON.stringify({ outPath, sha256, totalRuns, failureCount, wallClockMs }, null, 2));
