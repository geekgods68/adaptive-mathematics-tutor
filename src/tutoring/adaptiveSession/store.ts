import { createDurableSessionStore } from "@/research/storage/durableSessionStore";
import type { ActiveAdaptiveSession } from "@/tutoring/adaptiveSession/types";

/**
 * Stage 2 (docs/stage2-research-persistence-report.md): durable,
 * SQLite-backed storage for condition C2 sessions -- replaces the
 * previous server-process-lifetime in-memory Map. Kept as its OWN
 * `kind: "c2"` partition (not sharing rows with `"c0"`) so the adaptive
 * and non-adaptive conditions never share session state even
 * incidentally (see CLAUDE.md "Shared infrastructure") -- the same
 * isolation property the old in-memory store documented, now enforced
 * by a `kind` column instead of a separate Map instance.
 */
export const adaptiveSessionStore = createDurableSessionStore<ActiveAdaptiveSession>("c2");
