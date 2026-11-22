import type { DatabaseSync } from "node:sqlite";
import { getResearchDb } from "@/research/storage/db";
import { deriveSessionEvents, withGeneratedIds } from "@/research/storage/eventDerivation";
import type { ResearchEvent, StorableSessionEnvelope, StoredSessionKind, StoredSessionRow } from "@/research/storage/types";

/**
 * A durable, SQLite-backed replacement for the Map-based session stores
 * (`src/tutoring/nonAdaptiveRiseSession/store.ts`,
 * `src/tutoring/adaptiveSession/store.ts`) -- see
 * docs/stage2-research-persistence-report.md "Session persistence."
 *
 * Exposes the SAME three-method interface (`get`/`save`/`delete`) those
 * Map-based stores already had, so the two service.ts files that call
 * them need no changes for Layer A persistence to take effect. `save`
 * additionally appends whatever research events the transition implies
 * (Layer B) in the SAME SQLite transaction as the session upsert -- a
 * single durable commit boundary covering both pieces of state (Part
 * 4.2: "for every important state transition, establish one clear
 * durability/commit boundary").
 *
 * Concurrency note (Part 4.3): every method here is synchronous, and
 * every caller in nonAdaptiveRiseSession/service.ts and
 * adaptiveSession/service.ts is itself a synchronous function with no
 * `await` between reading a session and writing its new state. Node's
 * single-threaded event loop therefore cannot interleave two calls into
 * this store from within one process -- the existing
 * `responses.length > sequenceIndex` duplicate-submission guard in both
 * service.ts files is already correct under this execution model. This
 * store does NOT provide cross-process concurrency control; see db.ts's
 * doc comment for why that is an accepted, documented limitation rather
 * than a silent gap.
 */
export interface DurableSessionStore<T extends StorableSessionEnvelope> {
  get(sessionId: string): T | undefined;
  save(session: T): void;
  delete(sessionId: string): void;
  listCompleted(filter?: { conditionId?: string; participantId?: string }): StoredSessionRow<T>[];
  listActive(): StoredSessionRow<T>[];
  getEvents(sessionId: string): ResearchEvent[];
}

function rowToEnvelope<T>(row: { data: string }): T {
  return JSON.parse(row.data) as T;
}

export function createDurableSessionStore<T extends StorableSessionEnvelope>(kind: StoredSessionKind, dbFactory: () => DatabaseSync = getResearchDb): DurableSessionStore<T> {
  function db(): DatabaseSync {
    return dbFactory();
  }

  return {
    get(sessionId: string): T | undefined {
      const row = db().prepare("SELECT data FROM sessions WHERE session_id = ? AND kind = ?").get(sessionId, kind) as { data: string } | undefined;
      return row ? rowToEnvelope<T>(row) : undefined;
    },

    save(session: T): void {
      const conn = db();
      const existingRow = conn.prepare("SELECT data, revision FROM sessions WHERE session_id = ? AND kind = ?").get(session.id, kind) as { data: string; revision: number } | undefined;
      const prev = existingRow ? rowToEnvelope<T>(existingRow) : undefined;
      const nextRevision = (existingRow?.revision ?? 0) + 1;

      const lastEventSeqRow = conn.prepare("SELECT MAX(event_seq) AS maxSeq FROM research_events WHERE session_id = ? AND kind = ?").get(session.id, kind) as { maxSeq: number | null };
      const startingSeq = (lastEventSeqRow?.maxSeq ?? 0) + 1;

      const derivedEvents = deriveSessionEvents(prev, session, kind, startingSeq);
      const timestamp = new Date().toISOString();
      const events = withGeneratedIds(derivedEvents, timestamp);

      conn.exec("BEGIN IMMEDIATE");
      try {
        const now = timestamp;
        const createdAt = prev ? conn.prepare("SELECT created_at FROM sessions WHERE session_id = ? AND kind = ?").get(session.id, kind) as { created_at: string } | undefined : undefined;
        conn
          .prepare(
            `INSERT INTO sessions (session_id, kind, condition_id, participant_id, status, started_at, completed_at, revision, data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(session_id, kind) DO UPDATE SET
               condition_id = excluded.condition_id,
               status = excluded.status,
               completed_at = excluded.completed_at,
               revision = excluded.revision,
               data = excluded.data,
               updated_at = excluded.updated_at`,
          )
          .run(
            session.id,
            kind,
            session.experimentState.conditionId,
            session.participantId,
            session.experimentState.status,
            session.startedAt,
            session.completedAt ?? null,
            nextRevision,
            JSON.stringify(session),
            createdAt?.created_at ?? now,
            now,
          );

        const insertEvent = conn.prepare(
          `INSERT INTO research_events (event_id, schema_version, session_id, kind, condition_id, event_seq, event_type, question_id, payload, provenance_ref, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        for (const event of events) {
          insertEvent.run(
            event.eventId,
            event.schemaVersion,
            event.sessionId,
            event.kind,
            event.conditionId,
            event.eventSeq,
            event.eventType,
            event.questionId ?? null,
            JSON.stringify(event.payload),
            event.provenanceRef,
            event.createdAt,
          );
        }
        conn.exec("COMMIT");
      } catch (error) {
        conn.exec("ROLLBACK");
        throw error;
      }
    },

    delete(sessionId: string): void {
      const conn = db();
      conn.exec("BEGIN IMMEDIATE");
      try {
        conn.prepare("DELETE FROM sessions WHERE session_id = ? AND kind = ?").run(sessionId, kind);
        conn.prepare("DELETE FROM research_events WHERE session_id = ? AND kind = ?").run(sessionId, kind);
        conn.exec("COMMIT");
      } catch (error) {
        conn.exec("ROLLBACK");
        throw error;
      }
    },

    listCompleted(filter: { conditionId?: string; participantId?: string } = {}): StoredSessionRow<T>[] {
      const conditions = ["kind = ?", "status = 'terminated'"];
      const params: unknown[] = [kind];
      if (filter.conditionId) {
        conditions.push("condition_id = ?");
        params.push(filter.conditionId);
      }
      if (filter.participantId) {
        conditions.push("participant_id = ?");
        params.push(filter.participantId);
      }
      const rows = db()
        .prepare(`SELECT * FROM sessions WHERE ${conditions.join(" AND ")} ORDER BY completed_at ASC`)
        .all(...(params as never[])) as Array<{
        session_id: string;
        kind: StoredSessionKind;
        condition_id: string;
        participant_id: string;
        status: "active" | "terminated";
        started_at: string;
        completed_at: string | null;
        revision: number;
        data: string;
        created_at: string;
        updated_at: string;
      }>;
      return rows.map((r) => ({
        sessionId: r.session_id,
        kind: r.kind,
        conditionId: r.condition_id,
        participantId: r.participant_id,
        status: r.status,
        startedAt: r.started_at,
        completedAt: r.completed_at ?? undefined,
        revision: r.revision,
        data: JSON.parse(r.data) as T,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    },

    listActive(): StoredSessionRow<T>[] {
      const rows = db()
        .prepare("SELECT * FROM sessions WHERE kind = ? AND status = 'active' ORDER BY started_at ASC")
        .all(kind) as Array<{
        session_id: string;
        kind: StoredSessionKind;
        condition_id: string;
        participant_id: string;
        status: "active" | "terminated";
        started_at: string;
        completed_at: string | null;
        revision: number;
        data: string;
        created_at: string;
        updated_at: string;
      }>;
      return rows.map((r) => ({
        sessionId: r.session_id,
        kind: r.kind,
        conditionId: r.condition_id,
        participantId: r.participant_id,
        status: r.status,
        startedAt: r.started_at,
        completedAt: r.completed_at ?? undefined,
        revision: r.revision,
        data: JSON.parse(r.data) as T,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    },

    getEvents(sessionId: string): ResearchEvent[] {
      const rows = db()
        .prepare("SELECT * FROM research_events WHERE session_id = ? AND kind = ? ORDER BY event_seq ASC")
        .all(sessionId, kind) as Array<{
        event_id: string;
        schema_version: number;
        session_id: string;
        kind: StoredSessionKind;
        condition_id: string;
        event_seq: number;
        event_type: ResearchEvent["eventType"];
        question_id: string | null;
        payload: string;
        provenance_ref: string;
        created_at: string;
      }>;
      return rows.map((r) => ({
        eventId: r.event_id,
        schemaVersion: r.schema_version,
        sessionId: r.session_id,
        kind: r.kind,
        conditionId: r.condition_id,
        eventSeq: r.event_seq,
        eventType: r.event_type,
        questionId: r.question_id ?? undefined,
        payload: JSON.parse(r.payload) as Record<string, unknown>,
        provenanceRef: r.provenance_ref,
        createdAt: r.created_at,
      }));
    },
  };
}
