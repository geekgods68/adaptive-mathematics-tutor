/** Base class so callers can catch "any session error" with `instanceof TutorSessionError`. */
export class TutorSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class SessionNotFoundError extends TutorSessionError {
  constructor(sessionId: string) {
    super(`No session found with id "${sessionId}". It may have expired (server restarted) or never existed.`);
  }
}

export class SessionAlreadyCompletedError extends TutorSessionError {
  constructor(sessionId: string) {
    super(`Session "${sessionId}" has already completed — it cannot accept further answers or advance further.`);
  }
}

export class AnswerAlreadySubmittedError extends TutorSessionError {
  constructor(sessionId: string, questionId: string) {
    super(`Session "${sessionId}" already recorded an answer for question "${questionId}" — an answer can only be submitted once per question.`);
  }
}

export class NoAnswerSubmittedError extends TutorSessionError {
  constructor(sessionId: string, questionId: string) {
    super(`Session "${sessionId}" cannot advance past question "${questionId}" — no answer has been submitted for it yet.`);
  }
}

export class InvalidOptionIdError extends TutorSessionError {
  constructor(questionId: string, selectedOptionId: string) {
    super(`"${selectedOptionId}" is not a valid option id for question "${questionId}".`);
  }
}

export class SequencePositionOutOfRangeError extends TutorSessionError {
  constructor(sessionId: string, position: number, sequenceLength: number) {
    super(`Session "${sessionId}" is at position ${position}, outside its sequence of length ${sequenceLength}.`);
  }
}
