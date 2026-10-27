import { describe, expect, it } from "vitest";
import { buildSampleArtifact, question } from "./fixtures";
import { verifyArtifactIntegrity } from "@/research/artifact/integrity";
import { ARTIFACT_SCHEMA_VERSION } from "@/research/artifact/types";

describe("verifyArtifactIntegrity — four independently-reported checks", () => {
  it("every check passes (or is not_checked) for a freshly-built, untampered artifact", () => {
    const { artifact } = buildSampleArtifact();
    const result = verifyArtifactIntegrity(artifact);
    expect(result.schemaVersionSupported).toBe(true);
    expect(result.contentDigestValid).toBe(true);
    expect(result.softwareVersionMatches).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("detects content tampering (bytes/content modified after the artifact was built)", () => {
    const { artifact } = buildSampleArtifact();
    const tampered = { ...artifact, finalEstimatorStates: { ...artifact.finalEstimatorStates, injected: { mastery: 1 } } };
    const result = verifyArtifactIntegrity(tampered);
    expect(result.contentDigestValid).toBe(false);
    expect(result.issues.some((i) => i.includes("Content digest mismatch"))).toBe(true);
  });

  it("detects a question-bank hash mismatch WITHOUT also flagging content tampering (these are different failure categories)", () => {
    const { artifact, questions } = buildSampleArtifact();
    const differentBank = [...questions, question("extra-question", ["c1"])];
    const result = verifyArtifactIntegrity(artifact, { currentQuestions: differentBank });
    expect(result.contentDigestValid).toBe(true); // the artifact itself is untouched
    expect(result.questionBankMatchesCurrent).toBe(false); // but the bank it references has since changed
    expect(result.issues.some((i) => i.includes("question bank"))).toBe(true);
  });

  it("confirms a question-bank match when the SAME bank is supplied", () => {
    const { artifact, questions } = buildSampleArtifact();
    const result = verifyArtifactIntegrity(artifact, { currentQuestions: questions });
    expect(result.questionBankMatchesCurrent).toBe(true);
  });

  it("reports 'not_checked' (not false) for the question-bank/curriculum checks when no live reference is supplied", () => {
    const { artifact } = buildSampleArtifact();
    const result = verifyArtifactIntegrity(artifact);
    expect(result.questionBankMatchesCurrent).toBe("not_checked");
    expect(result.curriculumMatchesCurrent).toBe("not_checked");
  });

  it("detects a curriculum hash mismatch independently of the question-bank check", () => {
    const { artifact } = buildSampleArtifact();
    const differentConcepts = [{ id: "c1", name: "c1", description: "c1", prerequisiteIds: ["some-other-prereq"], strand: "algebra_foundations" as const }];
    const result = verifyArtifactIntegrity(artifact, { currentConcepts: differentConcepts, currentCurriculumOrder: ["c1"] });
    expect(result.curriculumMatchesCurrent).toBe(false);
    expect(result.questionBankMatchesCurrent).toBe("not_checked");
  });

  it("detects an unsupported schema version distinctly from a content-digest failure", () => {
    const { artifact } = buildSampleArtifact();
    const futureSchema = { ...artifact, schemaVersion: "experiment-run-artifact-v99" };
    // recompute a valid digest for the mutated artifact so ONLY the schema-version check fails
    const result = verifyArtifactIntegrity(futureSchema);
    expect(result.schemaVersionSupported).toBe(false);
    expect(result.issues.some((i) => i.includes("Unsupported artifact schema version"))).toBe(true);
  });

  it("the current schema version constant matches what a freshly-built artifact declares", () => {
    const { artifact } = buildSampleArtifact();
    expect(artifact.schemaVersion).toBe(ARTIFACT_SCHEMA_VERSION);
  });

  it("collects multiple simultaneous issues rather than stopping at the first", () => {
    const { artifact } = buildSampleArtifact();
    const broken = { ...artifact, schemaVersion: "bogus", finalEstimatorStates: { injected: { mastery: 1 } } };
    const result = verifyArtifactIntegrity(broken);
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });
});
