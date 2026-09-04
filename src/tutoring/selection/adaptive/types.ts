import type { Question } from "@/domain/questions/types";
import type { StudentModel } from "@/domain/student/types";

/**
 * Unlike NonAdaptiveSelectionContext, this type carries exactly the
 * performance information an adaptive policy is allowed to use. It is
 * defined here for architectural completeness; nothing in this repository
 * implements the adaptive condition yet (see AdaptiveSelectionPolicy).
 */
export type AdaptiveSelectionContext = {
  participantId: string;
  availableQuestions: Question[];
  studentModel: StudentModel;
  answeredQuestionIds: string[];
};
