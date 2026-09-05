import type { ActiveTutorSession } from "@/tutoring/session/types";
import { InMemoryResearchEventLogger } from "@/research/logging/logger";

/**
 * Server-process-lifetime in-memory storage. This is a deliberate Phase 3
 * prototype choice (see docs/research-logging.md, "Persistence"): it
 * survives page refreshes and normal navigation within one running
 * `next dev`/`next start` process, but is lost on server restart. A real
 * study deployment would replace this module's internals with a database
 * without changing the service functions that call it.
 */
class SessionStore {
  private sessions = new Map<string, ActiveTutorSession>();

  get(sessionId: string): ActiveTutorSession | undefined {
    return this.sessions.get(sessionId);
  }

  save(session: ActiveTutorSession): void {
    this.sessions.set(session.id, session);
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export const sessionStore = new SessionStore();

/**
 * One shared logger for the whole server process. Every `ResearchEvent`
 * carries its own `sessionId`, so a single log can be filtered per
 * session (see `exportSession` in service.ts) without needing one logger
 * instance per session.
 */
export const sessionResearchLogger = new InMemoryResearchEventLogger();
