import type { Concept } from "@/domain/concepts/types";
import type { Question } from "@/domain/questions/types";
import { hashCurriculum, hashQuestionBank } from "@/research/experiment/provenance";
import { verifyArtifactContentDigest, getCurrentSoftwareVersion } from "@/research/artifact/buildArtifact";
import { ARTIFACT_SCHEMA_VERSION } from "@/research/artifact/types";
import type { ExperimentRunArtifact } from "@/research/artifact/types";

export interface IntegrityCheckOptions {
  /** The LIVE question bank to compare the artifact's recorded hash against. Omit to skip this check (reported as "not_checked", not "passed"). */
  currentQuestions?: Question[];
  /** The LIVE curriculum to compare against — both must be supplied together. */
  currentConcepts?: Concept[];
  currentCurriculumOrder?: string[];
}

/**
 * `boolean` once actually checked; the literal `"not_checked"` when the
 * caller didn't supply what's needed to check it. Keeping this distinct
 * from `false` matters — requirement 5 explicitly asks for FOUR
 * distinguishable outcomes, and conflating "we didn't check" with
 * "we checked and it failed" would hide exactly the kind of false
 * confidence that requirement is about preventing.
 */
export type TriStateCheck = boolean | "not_checked";

export interface IntegrityCheckResult {
  schemaVersionSupported: boolean;
  contentDigestValid: boolean;
  questionBankMatchesCurrent: TriStateCheck;
  curriculumMatchesCurrent: TriStateCheck;
  softwareVersionMatches: TriStateCheck;
  /** Human-readable issues, one per failed/mismatched check — empty only if every check that WAS performed passed. */
  issues: string[];
}

/**
 * Checks four INDEPENDENT things about a stored artifact, each reported
 * separately rather than collapsed into one pass/fail (requirement 5):
 * (1) the artifact's own bytes/content weren't modified after it was
 * built (`contentDigestValid`), (2) its referenced question bank matches
 * what's currently loaded (`questionBankMatchesCurrent`), (3) its
 * referenced curriculum matches what's currently loaded
 * (`curriculumMatchesCurrent`), (4) it was produced by the same software
 * version now running (`softwareVersionMatches`). A caller can fail (2)
 * while (1) passes — e.g. "this run is unmodified, but the question bank
 * has since changed" — and that is a MEANINGFULLY different situation
 * from (1) failing ("this run's own file was tampered with"), which is
 * why they are never merged into a single boolean.
 */
export function verifyArtifactIntegrity(artifact: ExperimentRunArtifact, options: IntegrityCheckOptions = {}): IntegrityCheckResult {
  const issues: string[] = [];

  const schemaVersionSupported = artifact.schemaVersion === ARTIFACT_SCHEMA_VERSION;
  if (!schemaVersionSupported) {
    issues.push(`Unsupported artifact schema version "${artifact.schemaVersion}" (this build supports "${ARTIFACT_SCHEMA_VERSION}").`);
  }

  const contentDigestValid = verifyArtifactContentDigest(artifact);
  if (!contentDigestValid) {
    issues.push("Content digest mismatch — this artifact's stored content was modified after it was built.");
  }

  let questionBankMatchesCurrent: TriStateCheck = "not_checked";
  if (options.currentQuestions) {
    const recomputed = hashQuestionBank(options.currentQuestions);
    questionBankMatchesCurrent = recomputed === artifact.provenance.questionBankVersion.contentHash;
    if (!questionBankMatchesCurrent) {
      issues.push("This run's referenced question bank does not match the currently loaded bank — the dataset has changed since this run.");
    }
  }

  let curriculumMatchesCurrent: TriStateCheck = "not_checked";
  if (options.currentConcepts && options.currentCurriculumOrder) {
    const recomputed = hashCurriculum(options.currentConcepts, options.currentCurriculumOrder);
    curriculumMatchesCurrent = recomputed === artifact.provenance.curriculumVersion.contentHash;
    if (!curriculumMatchesCurrent) {
      issues.push("This run's referenced curriculum/prerequisite graph does not match the currently loaded curriculum.");
    }
  }

  const current = getCurrentSoftwareVersion();
  const softwareVersionMatches: TriStateCheck = current.packageVersion ? current.packageVersion === artifact.softwareVersion.packageVersion : "not_checked";
  if (softwareVersionMatches === false) {
    issues.push(`Software version differs: this artifact was produced by "${artifact.softwareVersion.packageVersion}", the current build is "${current.packageVersion}".`);
  }

  return { schemaVersionSupported, contentDigestValid, questionBankMatchesCurrent, curriculumMatchesCurrent, softwareVersionMatches, issues };
}
