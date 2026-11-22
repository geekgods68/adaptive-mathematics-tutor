import { createDurableSessionStore } from "@/research/storage/durableSessionStore";
import type { ActiveNonAdaptiveRiseSession } from "@/tutoring/nonAdaptiveRiseSession/types";

/**
 * Stage 2 (docs/stage2-research-persistence-report.md): durable,
 * SQLite-backed storage for condition C0 sessions -- replaces the
 * previous server-process-lifetime in-memory Map. Kept as its OWN
 * `kind: "c0"` partition (not sharing rows with `"c2"`) so this
 * condition's session state never mixes with either the adaptive
 * condition or the legacy non-adaptive condition even incidentally --
 * the same isolation property the old in-memory store documented, now
 * enforced by a `kind` column instead of a separate Map instance.
 */
export const nonAdaptiveRiseSessionStore = createDurableSessionStore<ActiveNonAdaptiveRiseSession>("c0");
