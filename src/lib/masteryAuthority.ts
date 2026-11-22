/**
 * Stage 3 Priority 2 (mastery-state duplication fix). The ONE function
 * every student-facing surface (Dashboard, Progress, Practice's
 * cross-session seeding) calls to find out "what is this student's
 * current estimated mastery" — replacing the previous architecture where
 * Dashboard/Progress independently re-derived a "current mastery" view
 * from `studentHistory.ts`'s session-completion snapshots, while Practice
 * separately seeded new sessions from `studentMasteryState.ts`'s own,
 * independently-written copy of nearly the same information.
 *
 * Resolution rule (deliberately simple and structural, not timestamp-
 * based — see docs/stage3-ui-integration-report.md Priority 2): if the
 * server has a durably completed adaptive session for this participant
 * id, THAT ALWAYS WINS, unconditionally — never compared against or
 * blended with the local snapshot. The local snapshot
 * (`studentMasteryState.ts`, Phase G's original mechanism) is consulted
 * ONLY when the server has nothing yet for this participant id — which
 * covers exactly one real case: a browser that already has local mastery
 * data from BEFORE this participant-id mechanism existed. Once the first
 * session completes under the new architecture, the durable record exists
 * for this participant id forever after, so the local snapshot can never
 * again override it, however stale or however recently it was written.
 */

import { getCurrentMasteryStateAction } from "@/app/adaptive-tutor/actions";
import { getOrCreateParticipantId } from "@/lib/studentIdentity";
import { readMasteryState } from "@/lib/studentMasteryState";
import type { PersistableConceptMasteryState } from "@/tutoring/adaptiveSession/masteryStateTransfer";

export type MasteryAuthoritySource = "durable" | "local-fallback" | "none";

export interface ResolvedMasteryAuthority {
  source: MasteryAuthoritySource;
  modelVersion?: string;
  states: Record<string, PersistableConceptMasteryState>;
  /** The durable session this snapshot came from — only present when source === "durable". */
  fromSessionId?: string;
  /** When this snapshot was last updated — the durable session's completion time, or the local snapshot's own write time. Absent only when source === "none". */
  fromUpdatedAt?: string;
}

export async function resolveAuthoritativeMastery(): Promise<ResolvedMasteryAuthority> {
  const participantId = getOrCreateParticipantId();
  const result = await getCurrentMasteryStateAction(participantId);

  if (result.ok && result.data.hasRecord) {
    return {
      source: "durable",
      modelVersion: result.data.modelVersion,
      states: result.data.persistableStates,
      fromSessionId: result.data.fromSessionId,
      fromUpdatedAt: result.data.fromCompletedAt,
    };
  }

  // No durable record yet for this participant id (brand-new id, or a participant who has only
  // ever done non-adaptive practice) — fall back to the local snapshot, if any, as a one-time
  // migration path. Never reached again for this participant id once a durable record exists.
  const local = readMasteryState();
  if (local && Object.keys(local.states).length > 0) {
    return { source: "local-fallback", modelVersion: local.modelVersion, states: local.states, fromUpdatedAt: local.updatedAt };
  }

  return { source: "none", states: {} };
}
