import type { ResearchEvent } from "@/research/events/types";

/**
 * ARCHITECTURE ONLY for Phase 0. No database exists yet; this interface is
 * what a future persistent implementation (e.g. writing to a research DB
 * or an append-only log file) will satisfy. The in-memory implementation
 * below is sufficient to prove the architecture and to back tests/dev use.
 */
export interface ResearchEventLogger {
  log(event: ResearchEvent): void;
  getEvents(): ResearchEvent[];
}

export class InMemoryResearchEventLogger implements ResearchEventLogger {
  private events: ResearchEvent[] = [];

  log(event: ResearchEvent): void {
    this.events.push(event);
  }

  getEvents(): ResearchEvent[] {
    return [...this.events];
  }
}
