/**
 * A node in the (future) quadratics concept graph. `prerequisiteIds` lets
 * later phases reason about curriculum ordering; Phase 0 does not use it
 * for anything beyond referential-integrity validation.
 */
export type Concept = {
  id: string;
  name: string;
  description: string;
  prerequisiteIds: string[];
};
