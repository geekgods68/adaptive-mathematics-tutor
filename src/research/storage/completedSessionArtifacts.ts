import * as path from "node:path";
import { buildExperimentRunArtifact } from "@/research/artifact/buildArtifact";
import { saveExperimentRunArtifact, DEFAULT_RESEARCH_OUTPUT_DIR } from "@/research/artifact/persistence";
import type { ExperimentConfig, ExperimentScenario, ExperimentSessionState } from "@/research/experiment/types";
import type { StoredSessionKind } from "@/research/storage/types";

/**
 * Stage 2 Layer C integration (docs/stage2-research-persistence-report.md
 * "Phase 6 integration"): turns a just-completed modern tutoring session
 * (C0 or C2) into an immutable `ExperimentRunArtifact`, reusing Phase 6's
 * existing canonical-artifact/content-digest/atomic-write machinery
 * VERBATIM (`buildExperimentRunArtifact`/`saveExperimentRunArtifact`) --
 * the same functions Phase 8's pilot already builds artifacts with.
 * Nothing about artifact construction is reimplemented here.
 *
 * Stored under `research-output/sessions/<kind>/`, a sibling of (not
 * mixed into) Phase 8's `research-output/phase8/...` and the
 * CLI/inspect-facing `research-output/runs/` default (Part 13: student
 * tutoring sessions and synthetic Phase 8 runs must remain in clearly
 * distinguishable locations, never merged into one undifferentiated
 * dataset).
 *
 * Called from the two service.ts files' `advance*Session` functions at
 * the exact moment `state.status` becomes `"terminated"` -- never
 * speculatively, and never for an in-progress session (Part 8.3:
 * completed research artifacts are immutable; this function is simply
 * never invoked for a non-terminated state in the first place, so there
 * is no "finalize an artifact early" path to guard against here).
 */
export function sessionArtifactsDir(kind: StoredSessionKind): string {
  const root = process.env.RESEARCH_SESSION_ARTIFACTS_ROOT ?? path.join(DEFAULT_RESEARCH_OUTPUT_DIR, "..", "sessions");
  return path.join(root, kind);
}

export interface PersistCompletedSessionArtifactResult {
  /** `undefined` only if `state.status` was not `"terminated"` (should never be called in that case; returning undefined rather than throwing keeps this a safe no-op for a defensive caller). */
  filePath?: string;
  /** True if an artifact for this runId already existed (idempotent re-entry, e.g. a resumed-then-immediately-completed session whose completion path ran more than once across a restart) -- the existing artifact is left untouched, never overwritten (Part 8.3). */
  alreadyExisted: boolean;
}

export function persistCompletedSessionArtifact(
  kind: StoredSessionKind,
  config: ExperimentConfig,
  scenario: ExperimentScenario,
  state: ExperimentSessionState,
): PersistCompletedSessionArtifactResult {
  if (state.status !== "terminated") return { alreadyExisted: false };

  const artifact = buildExperimentRunArtifact(config, scenario, state, { experimentId: `modern-${kind}-sessions` });
  const dir = sessionArtifactsDir(kind);

  try {
    const filePath = saveExperimentRunArtifact(artifact, { dir });
    return { filePath, alreadyExisted: false };
  } catch (error) {
    // saveExperimentRunArtifact refuses to overwrite an existing runId -- that is the
    // expected, safe outcome if this function is ever invoked twice for the same
    // completed session (Part 12: "do not report a completed answer as durably saved
    // before its required transaction commits" cuts both ways -- a duplicate call must
    // not silently corrupt or replace the original record either).
    if (error instanceof Error && error.message.includes("already exists")) {
      return { alreadyExisted: true };
    }
    throw error;
  }
}
