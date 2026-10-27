import type { ActiveAdaptiveSession } from "@/tutoring/adaptiveSession/types";

/**
 * Server-process-lifetime in-memory storage — the same deliberate
 * prototype choice as `src/tutoring/session/store.ts` (see
 * docs/research-logging.md, "Persistence"), kept as a SEPARATE store
 * instance so the adaptive and non-adaptive conditions never share
 * session state even incidentally (see CLAUDE.md "Shared
 * infrastructure": the two conditions' session stores being distinct
 * objects is part of what keeps "which policy a session uses" the only
 * real difference between them, not an accident of a shared map).
 */
class AdaptiveSessionStore {
  private sessions = new Map<string, ActiveAdaptiveSession>();

  get(sessionId: string): ActiveAdaptiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  save(session: ActiveAdaptiveSession): void {
    this.sessions.set(session.id, session);
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export const adaptiveSessionStore = new AdaptiveSessionStore();
