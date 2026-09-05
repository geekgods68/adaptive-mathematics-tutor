import type { Concept } from "@/domain/concepts/types";
import type { DifficultyLevel, Question } from "@/domain/questions/types";
import type { ActiveTutorSession, TutorResponse } from "@/tutoring/session/types";

/** Concise, student-facing summary — never shows internal/diagnostic detail (see docs/tutor-flow.md). */
export type StudentFacingSummary = {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number; // 0..1
};

/** Richer, research/development summary. Computed from responses already recorded — never influences sequencing. */
export type ResearchSessionSummary = {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number; // 0..1
  averageResponseTimeMs: number;
  performanceByConcept: Record<string, { attempts: number; correct: number }>;
  performanceByDifficulty: Record<DifficultyLevel, { attempts: number; correct: number }>;
  misconceptionEvidenceCounts: Record<string, number>;
};

export function computeStudentFacingSummary(session: ActiveTutorSession): StudentFacingSummary {
  const total = session.responses.length;
  const correct = session.responses.filter((r) => r.isCorrect).length;
  return {
    totalQuestions: total,
    correctAnswers: correct,
    accuracy: total === 0 ? 0 : correct / total,
  };
}

export function computeResearchSessionSummary(
  session: ActiveTutorSession,
  questions: Question[],
): ResearchSessionSummary {
  const questionById = new Map(questions.map((q) => [q.id, q]));

  const performanceByConcept: Record<string, { attempts: number; correct: number }> = {};
  const performanceByDifficulty: Record<number, { attempts: number; correct: number }> = {
    1: { attempts: 0, correct: 0 },
    2: { attempts: 0, correct: 0 },
    3: { attempts: 0, correct: 0 },
    4: { attempts: 0, correct: 0 },
    5: { attempts: 0, correct: 0 },
  };
  const misconceptionEvidenceCounts: Record<string, number> = {};

  let totalResponseTimeMs = 0;
  let correctCount = 0;

  for (const response of session.responses) {
    const question = questionById.get(response.questionId);
    if (response.isCorrect) correctCount += 1;
    totalResponseTimeMs += response.responseTimeMs;

    if (question) {
      const conceptEntry = performanceByConcept[question.primaryConceptId] ?? { attempts: 0, correct: 0 };
      conceptEntry.attempts += 1;
      if (response.isCorrect) conceptEntry.correct += 1;
      performanceByConcept[question.primaryConceptId] = conceptEntry;

      const difficultyEntry = performanceByDifficulty[question.difficulty];
      difficultyEntry.attempts += 1;
      if (response.isCorrect) difficultyEntry.correct += 1;
    }

    if (response.misconceptionId) {
      misconceptionEvidenceCounts[response.misconceptionId] = (misconceptionEvidenceCounts[response.misconceptionId] ?? 0) + 1;
    }
  }

  const total = session.responses.length;

  return {
    totalQuestions: total,
    correctAnswers: correctCount,
    incorrectAnswers: total - correctCount,
    accuracy: total === 0 ? 0 : correctCount / total,
    averageResponseTimeMs: total === 0 ? 0 : totalResponseTimeMs / total,
    performanceByConcept,
    performanceByDifficulty: performanceByDifficulty as Record<DifficultyLevel, { attempts: number; correct: number }>,
    misconceptionEvidenceCounts,
  };
}

/** Concept name lookup helper for presenting performanceByConcept — kept separate since it needs CONCEPTS, not just Questions. */
export function conceptName(conceptId: string, concepts: Concept[]): string {
  return concepts.find((c) => c.id === conceptId)?.name ?? conceptId;
}

export type { TutorResponse };
