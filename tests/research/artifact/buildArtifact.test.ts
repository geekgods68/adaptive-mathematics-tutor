import { describe, expect, it } from "vitest";
import { buildSampleArtifact } from "./fixtures";
import { verifyArtifactContentDigest, getCurrentSoftwareVersion } from "@/research/artifact/buildArtifact";
import { ARTIFACT_SCHEMA_VERSION } from "@/research/artifact/types";

describe("buildExperimentRunArtifact", () => {
  it("stamps the current artifact schema version", () => {
    const { artifact } = buildSampleArtifact();
    expect(artifact.schemaVersion).toBe(ARTIFACT_SCHEMA_VERSION);
  });

  it("carries identifying fields through from the real run", () => {
    const { artifact } = buildSampleArtifact({ runId: "run-xyz", scenarioId: "scenario-xyz" });
    expect(artifact.runId).toBe("run-xyz");
    expect(artifact.scenarioId).toBe("scenario-xyz");
    expect(artifact.conditionId).toBe("C1");
  });

  it("preserves full-precision mastery values via the reused Phase 5 provenance, not rounded", () => {
    const { artifact } = buildSampleArtifact();
    const masteryValues = Object.values(artifact.finalEstimatorStates).map((s) => (s as { mastery: number }).mastery);
    expect(masteryValues.length).toBeGreaterThan(0);
    // At least one value should have more than 2 decimal digits of precision (a "display-rounded" value would not).
    expect(masteryValues.some((m) => m.toString().replace(/^0\./, "").length > 3)).toBe(true);
  });

  it("has a content digest that verifies against its own content", () => {
    const { artifact } = buildSampleArtifact();
    expect(verifyArtifactContentDigest(artifact)).toBe(true);
  });

  it("the content digest changes if any research-relevant field is altered", () => {
    const { artifact } = buildSampleArtifact();
    const tampered = { ...artifact, finalEstimatorStates: { ...artifact.finalEstimatorStates, extra: { mastery: 0.999 } } };
    expect(verifyArtifactContentDigest(tampered)).toBe(false);
  });

  it("records a software version with a non-empty packageVersion", () => {
    const { artifact } = buildSampleArtifact();
    expect(artifact.softwareVersion.packageVersion).toBeTruthy();
    expect(artifact.softwareVersion).toEqual(getCurrentSoftwareVersion());
  });

  it("records the initial estimator states separately from the final ones", () => {
    const { artifact } = buildSampleArtifact();
    expect(artifact.initialEstimatorStates).toEqual({});
    expect(Object.keys(artifact.finalEstimatorStates).length).toBeGreaterThan(0);
  });

  it("reuses Phase 5's provenance verbatim rather than re-deriving it", () => {
    const { artifact } = buildSampleArtifact();
    expect(artifact.provenance.conditionId).toBe(artifact.conditionId);
    expect(artifact.provenance.runId).toBe(artifact.runId);
    expect(artifact.provenance.responseSequence.length).toBeGreaterThan(0);
    expect(artifact.provenance.estimatorTraces.length).toBeGreaterThan(0);
  });

  it("building the artifact twice from the identical run produces an identical digest", () => {
    const first = buildSampleArtifact({ runId: "same-run" });
    const second = buildSampleArtifact({ runId: "same-run" });
    expect(first.artifact.contentDigest).toBe(second.artifact.contentDigest);
  });
});
