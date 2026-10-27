/** Base class so callers can catch "any adaptive session error" with `instanceof AdaptiveSessionError` — mirrors src/tutoring/session/errors.ts's pattern exactly for the non-adaptive condition. */
export class AdaptiveSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class AdaptiveSessionNotFoundError extends AdaptiveSessionError {
  constructor(sessionId: string) {
    super(`No adaptive session found with id "${sessionId}". It may have expired (server restarted) or never existed.`);
  }
}

export class AdaptiveSessionAlreadyCompletedError extends AdaptiveSessionError {
  constructor(sessionId: string) {
    super(`Adaptive session "${sessionId}" has already completed — it cannot accept further answers or advance further.`);
  }
}

export class AdaptiveAnswerAlreadySubmittedError extends AdaptiveSessionError {
  constructor(sessionId: string, questionId: string) {
    super(`Adaptive session "${sessionId}" already recorded an answer for question "${questionId}" — an answer can only be submitted once per question.`);
  }
}

export class AdaptiveNoAnswerSubmittedError extends AdaptiveSessionError {
  constructor(sessionId: string, questionId: string) {
    super(`Adaptive session "${sessionId}" cannot advance past question "${questionId}" — no answer has been submitted for it yet.`);
  }
}

export class AdaptiveInvalidOptionIdError extends AdaptiveSessionError {
  constructor(questionId: string, selectedOptionId: string) {
    super(`"${selectedOptionId}" is not a valid option id for question "${questionId}".`);
  }
}

/** The adaptive selection policy had no eligible question to offer — a candidate-pool-exhausted or no-eligible-concept outcome (see AdaptiveSelectionTrace.fallbackUsed), not a bug to retry past. */
export class AdaptiveNoQuestionAvailableError extends AdaptiveSessionError {
  constructor(sessionId: string) {
    super(`Adaptive session "${sessionId}" has no question available to present right now.`);
  }
}
