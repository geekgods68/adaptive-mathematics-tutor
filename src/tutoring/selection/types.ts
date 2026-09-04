import type { ExperimentalCondition } from "@/domain/sessions/types";

export type QuestionSelectionResult = {
  /** null means the sequence/policy has nothing left to offer — end the session. */
  questionId: string | null;
  /** Research/debug transparency only — never shown to the student. */
  rationale?: string;
};

/**
 * The abstraction that separates "what question comes next" from the rest
 * of the tutor. `TContext` is intentionally a type parameter rather than a
 * single shared shape: see nonAdaptive/types.ts and adaptive/types.ts for
 * why the two conditions get structurally different context types.
 */
export interface QuestionSelectionPolicy<TContext> {
  readonly condition: ExperimentalCondition;
  selectNextQuestion(context: TContext): QuestionSelectionResult;
}
