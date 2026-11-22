/** Mirrors src/tutoring/adaptiveSession/errors.ts's pattern exactly, for the Stage 1 non-adaptive-on-RISE condition — kept as its own error hierarchy (not reused from the adaptive or legacy-non-adaptive modules) so error messages correctly name this condition rather than borrowing another condition's wording. */
export class NonAdaptiveRiseSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NonAdaptiveRiseSessionNotFoundError extends NonAdaptiveRiseSessionError {
  constructor(sessionId: string) {
    super(`No non-adaptive session found with id "${sessionId}". It may have expired (server restarted) or never existed.`);
  }
}

export class NonAdaptiveRiseSessionAlreadyCompletedError extends NonAdaptiveRiseSessionError {
  constructor(sessionId: string) {
    super(`Non-adaptive session "${sessionId}" has already completed — it cannot accept further answers or advance further.`);
  }
}

export class NonAdaptiveRiseAnswerAlreadySubmittedError extends NonAdaptiveRiseSessionError {
  constructor(sessionId: string, questionId: string) {
    super(`Non-adaptive session "${sessionId}" already recorded an answer for question "${questionId}" — an answer can only be submitted once per question.`);
  }
}

export class NonAdaptiveRiseNoAnswerSubmittedError extends NonAdaptiveRiseSessionError {
  constructor(sessionId: string, questionId: string) {
    super(`Non-adaptive session "${sessionId}" cannot advance past question "${questionId}" — no answer has been submitted for it yet.`);
  }
}

export class NonAdaptiveRiseInvalidOptionIdError extends NonAdaptiveRiseSessionError {
  constructor(questionId: string, selectedOptionId: string) {
    super(`"${selectedOptionId}" is not a valid option id for question "${questionId}".`);
  }
}

export class NonAdaptiveRiseNoQuestionAvailableError extends NonAdaptiveRiseSessionError {
  constructor(sessionId: string) {
    super(`Non-adaptive session "${sessionId}" has no question available to present right now.`);
  }
}
