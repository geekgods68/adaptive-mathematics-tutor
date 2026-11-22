/**
 * Stage 2 Part 15 acceptance demonstration (docs/stage2-research-persistence-report.md
 * section 9) — a real, end-to-end smoke test of durable persistence, NOT a confirmatory
 * research run. Every piece of storage this script touches lives under a fresh temp
 * directory (printed below) and is torn down by the OS's normal temp-file lifecycle;
 * it NEVER reads or writes the real `research-output/` tree, so it cannot disturb the
 * frozen 13,560-run Phase 8 pilot or any genuine student session data.
 *
 * Run with: npx tsx scripts/stage2-acceptance-demo.ts
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stage2-acceptance-demo-"));
process.env.RESEARCH_DB_PATH = path.join(scratchRoot, "db.sqlite3");
process.env.RESEARCH_SESSION_ARTIFACTS_ROOT = path.join(scratchRoot, "sessions");
process.env.PHASE8_RUNS_ROOT = path.join(scratchRoot, "phase8-runs");

async function main() {
  const { RISE_QUESTIONS, RISE_CONCEPTS } = await import("@/domain/rise");
  const nonAdaptiveService = await import("@/tutoring/nonAdaptiveRiseSession/service");
  const adaptiveService = await import("@/tutoring/adaptiveSession/service");
  const { closeResearchDb } = await import("@/research/storage/db");
  const { sessionArtifactsDir } = await import("@/research/storage/completedSessionArtifacts");
  const { loadExperimentRunArtifact, listRunMetadata } = await import("@/research/artifact/persistence");
  const { verifyArtifactContentDigest } = await import("@/research/artifact/buildArtifact");
  const { verifyArtifactIntegrity } = await import("@/research/artifact/integrity");
  const { replayFromArtifact } = await import("@/research/artifact/replayArtifact");
  const { EXPERIMENT_CONDITIONS } = await import("@/research/experiment/conditions");
  const { buildAdaptiveCurriculumOrder } = await import("@/domain/rise/curriculum");
  const { adaptiveSessionStore } = await import("@/tutoring/adaptiveSession/store");
  const { nonAdaptiveRiseSessionStore } = await import("@/tutoring/nonAdaptiveRiseSession/store");
  const { loadPhase8Config } = await import("@/research/phase8/config/load");
  const { selectConceptSubgraphSlices } = await import("@/research/phase8/slices/selectSlices");
  const { runTrackA } = await import("@/research/phase8/trackA/runTrackA");
  const { runTrackBSession } = await import("@/research/phase8/trackB/runTrackB");
  const { saveTrackARunRecord, saveTrackBRunArtifact, trackBRunsDir, createBatchManifest, recordBatchRunOutcome, loadBatchManifest } = await import("@/research/phase8/persistence");

  const report: Record<string, unknown> = { scratchRoot };
  let eventCount = 0;
  let sessionCount = 0;

  console.log(`\n=== Stage 2 Acceptance Demo === (scratch: ${scratchRoot})\n`);

  // ---------------- Scenario A: modern non-adaptive (C0) ----------------
  console.log("--- Scenario A: C0 non-adaptive session ---");
  const lengthA = 6;
  let sessA = nonAdaptiveService.startNonAdaptiveRiseSession("CH01", "demo-c0-participant", lengthA);
  sessionCount++;
  const presentedBeforeRestart: string[] = [];
  for (let i = 0; i < 3; i++) {
    const q = RISE_QUESTIONS.find((x) => x.id === sessA.experimentState.currentQuestionId)!;
    presentedBeforeRestart.push(q.id);
    const { session: s1 } = nonAdaptiveService.submitNonAdaptiveRiseAnswer(sessA.id, q.correctOptionId);
    const { session: s2 } = nonAdaptiveService.advanceNonAdaptiveRiseSession(s1.id);
    sessA = s2;
  }
  console.log(`Interrupting process after ${presentedBeforeRestart.length} questions...`);
  closeResearchDb(); // simulate restart
  const restoredA = nonAdaptiveService.getSession(sessA.id);
  console.log(`Restored session ${restoredA.id}: sequenceIndex=${restoredA.experimentState.sequenceIndex}, responses=${restoredA.experimentState.responses.length}`);
  while (restoredA.experimentState.status !== "terminated") {
    const q = RISE_QUESTIONS.find((x) => x.id === restoredA.experimentState.currentQuestionId)!;
    const { session: s1 } = nonAdaptiveService.submitNonAdaptiveRiseAnswer(restoredA.id, q.correctOptionId);
    const { session: s2 } = nonAdaptiveService.advanceNonAdaptiveRiseSession(s1.id);
    Object.assign(restoredA, s2);
  }
  const finalA = nonAdaptiveService.getSession(sessA.id);
  const artifactA = loadExperimentRunArtifact(finalA.id, sessionArtifactsDir("c0"));
  const digestOkA = verifyArtifactContentDigest(artifactA);
  const integrityA = verifyArtifactIntegrity(artifactA);
  const eventsA = nonAdaptiveRiseSessionStore.getEvents(finalA.id);
  eventCount += eventsA.length;

  // Performance independence re-check with an opposite response pattern, same seed.
  let sessA2 = nonAdaptiveService.startNonAdaptiveRiseSession("CH01", "demo-c0-participant", lengthA);
  sessionCount++;
  const presentedA2: string[] = [];
  while (sessA2.experimentState.status !== "terminated") {
    presentedA2.push(sessA2.experimentState.currentQuestionId!);
    const q = RISE_QUESTIONS.find((x) => x.id === sessA2.experimentState.currentQuestionId)!;
    const wrong = q.options.find((o) => !o.isCorrect)!;
    const { session: s1 } = nonAdaptiveService.submitNonAdaptiveRiseAnswer(sessA2.id, wrong.id);
    const { session: s2 } = nonAdaptiveService.advanceNonAdaptiveRiseSession(s1.id);
    sessA2 = s2;
  }
  const independenceHolds = JSON.stringify(finalA.experimentState.presentedQuestionIds) === JSON.stringify(presentedA2);

  report.scenarioA = {
    sessionId: finalA.id,
    totalQuestions: finalA.experimentState.presentedQuestionIds.length,
    restartTested: true,
    contentDigestValid: digestOkA,
    schemaVersionSupported: integrityA.schemaVersionSupported,
    eventCount: eventsA.length,
    performanceIndependenceHolds: independenceHolds,
  };
  console.log(`Scenario A result: digestValid=${digestOkA}, events=${eventsA.length}, performanceIndependenceHolds=${independenceHolds}`);

  // ---------------- Scenario B: modern adaptive (C2) ----------------
  console.log("\n--- Scenario B: C2 adaptive session ---");
  let sessB = adaptiveService.startAdaptiveSession("CH01", "demo-c2-participant");
  sessionCount++;
  for (let i = 0; i < 5 && sessB.experimentState.status !== "terminated"; i++) {
    const q = RISE_QUESTIONS.find((x) => x.id === sessB.experimentState.currentQuestionId)!;
    const { session: s1 } = adaptiveService.submitAdaptiveAnswer(sessB.id, q.correctOptionId);
    const { session: s2 } = adaptiveService.advanceAdaptiveSession(s1.id);
    sessB = s2;
  }
  const masteryBeforeRestart = adaptiveService.getPersistableMasteryStates(sessB.id);
  console.log(`Interrupting process after ${sessB.experimentState.sequenceIndex} questions...`);
  closeResearchDb();
  const restoredB = adaptiveService.getSession(sessB.id);
  const masteryAfterRestart = adaptiveService.getPersistableMasteryStates(restoredB.id);
  const continuityExact = JSON.stringify(masteryBeforeRestart) === JSON.stringify(masteryAfterRestart);
  console.log(`Restored session ${restoredB.id}: sequenceIndex=${restoredB.experimentState.sequenceIndex}, mastery continuity exact=${continuityExact}`);

  let currentB = restoredB;
  for (let i = 0; i < 20 && currentB.experimentState.status !== "terminated"; i++) {
    const qid = currentB.experimentState.currentQuestionId;
    if (!qid) break;
    const q = RISE_QUESTIONS.find((x) => x.id === qid)!;
    const { session: s1 } = adaptiveService.submitAdaptiveAnswer(currentB.id, q.correctOptionId);
    const { session: s2 } = adaptiveService.advanceAdaptiveSession(s1.id);
    currentB = s2;
  }
  const finalB = adaptiveService.getSession(sessB.id);
  const artifactB = loadExperimentRunArtifact(finalB.id, sessionArtifactsDir("c2"));
  const digestOkB = verifyArtifactContentDigest(artifactB);

  const scenarioForReplayB = {
    learnerId: finalB.participantId,
    availableQuestions: RISE_QUESTIONS,
    concepts: RISE_CONCEPTS,
    curriculumOrder: buildAdaptiveCurriculumOrder(finalB.chapterId),
    maxQuestions: 20,
    completionCheck: undefined,
    startTimestamp: finalB.startedAt,
  };
  const replayVerificationB = replayFromArtifact(artifactB, scenarioForReplayB, {
    resolveConfig: () => EXPERIMENT_CONDITIONS.C2.build(),
  });
  const eventsB = adaptiveSessionStore.getEvents(finalB.id);
  eventCount += eventsB.length;

  report.scenarioB = {
    sessionId: finalB.id,
    totalQuestions: finalB.experimentState.presentedQuestionIds.length,
    masteryContinuityExactAcrossRestart: continuityExact,
    contentDigestValid: digestOkB,
    replayKind: replayVerificationB.kind,
    replayMatches: replayVerificationB.kind === "computational_replay" ? replayVerificationB.replay.matches : null,
    eventCount: eventsB.length,
  };
  console.log(`Scenario B result: digestValid=${digestOkB}, replayKind=${replayVerificationB.kind}, eventCount=${eventsB.length}`);

  // ---------------- Scenario C: Phase 8 diagnostic batch (Track A + Track B) ----------------
  console.log("\n--- Scenario C: Phase 8 diagnostic batch ---");
  const cfg = loadPhase8Config();
  const slice = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS).primarySlices[0];
  const batchId = "acceptance-demo-batch";

  const trackAOptions = { familyConfig: "S1" as const, world: 1, masterSeed: cfg.plan.value.masterSeed, calLearners: 2, testLearners: 2, sliceChapterId: slice.chapterId };
  const trackAResult = runTrackA({
    familyConfig: trackAOptions.familyConfig,
    world: trackAOptions.world,
    slice,
    concepts: RISE_CONCEPTS,
    simulatorConfig: cfg.simulator.value,
    estimatorConfig: cfg.estimator.value,
    masterSeed: trackAOptions.masterSeed,
    calLearners: trackAOptions.calLearners,
    testLearners: trackAOptions.testLearners,
    phase1PerX: cfg.plan.value.trackA.phase1PerX,
    phase2PerT: cfg.plan.value.trackA.phase2PerT,
    reviewEvery: cfg.plan.value.trackA.reviewEvery,
  });
  const trackARunPath = saveTrackARunRecord(trackAOptions, trackAResult, batchId);

  const plannedTrackBRuns = ["C0", "C2"].map((c) => `trackB-${c}-demo-001`);
  createBatchManifest(batchId, "B", plannedTrackBRuns);
  let trackBSavedCount = 0;
  for (const conditionId of ["C0", "C2"] as const) {
    const runId = `trackB-${conditionId}-demo-001`;
    try {
      runTrackBSession({
        conditionId,
        identity: { masterSeed: cfg.plan.value.masterSeed, world: 1, sliceId: slice.chapterId, learnerId: "demo-001" },
        family: "S2",
        slice,
        concepts: RISE_CONCEPTS,
        allQuestions: RISE_QUESTIONS,
        simulatorConfig: cfg.simulator.value,
        budget: 10,
        onRunComplete: (config, scenario, finalState) => {
          saveTrackBRunArtifact(config, scenario, finalState, batchId);
          trackBSavedCount++;
        },
      });
      recordBatchRunOutcome(batchId, runId, "completed");
    } catch {
      recordBatchRunOutcome(batchId, runId, "failed");
    }
  }
  const batchManifest = loadBatchManifest(batchId)!;
  const trackBMetas = listRunMetadata(trackBRunsDir(batchId));

  // Independently recompute mean Brier score for det-a from the SAVED Track A predictions
  // (never re-deriving the formula -- just reading the already-recorded correct/pLinkD fields).
  const savedTrackA = JSON.parse(fs.readFileSync(trackARunPath, "utf8")) as { predictions: { estimator: string; correct: boolean; pLinkD: number | null }[] };
  const detARows = savedTrackA.predictions.filter((p) => p.estimator === "det-a" && p.pLinkD !== null);
  const recomputedBrier = detARows.reduce((sum, r) => sum + (r.pLinkD! - (r.correct ? 1 : 0)) ** 2, 0) / detARows.length;

  report.scenarioC = {
    batchId,
    trackARunSaved: trackARunPath,
    trackARunCount: 1,
    trackBRunCount: trackBSavedCount,
    batchManifestCompleted: batchManifest.completedRunIds,
    batchManifestFailed: batchManifest.failedRunIds,
    trackBArtifactsListed: trackBMetas.length,
    recomputedMeanBrierDetA: recomputedBrier,
  };
  console.log(`Scenario C result: trackB runs saved=${trackBSavedCount}, batch completed=${JSON.stringify(batchManifest.completedRunIds)}, recomputed mean Brier (det-a)=${recomputedBrier.toFixed(4)}`);

  report.totals = { sessionsCreated: sessionCount, totalResearchEvents: eventCount };

  console.log("\n=== Full report ===");
  console.log(JSON.stringify(report, null, 2));

  closeResearchDb();
}

main().catch((error) => {
  console.error("Acceptance demo failed:", error);
  process.exitCode = 1;
});
