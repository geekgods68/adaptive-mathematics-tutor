import { describe, expect, it } from "vitest";
import { buildSampleArtifact } from "./fixtures";
import { buildManifestFromArtifacts, MANIFEST_SCHEMA_VERSION } from "@/research/artifact/manifest";

describe("buildManifestFromArtifacts", () => {
  it("builds a manifest describing a batch of runs sharing the same dataset", () => {
    const a = buildSampleArtifact({ runId: "run-a" }).artifact;
    const b = buildSampleArtifact({ runId: "run-b" }).artifact;
    const manifest = buildManifestFromArtifacts("batch-1", "protocol-v1", [a, b], () => true);
    expect(manifest.manifestSchemaVersion).toBe(MANIFEST_SCHEMA_VERSION);
    expect(manifest.runs).toHaveLength(2);
    expect(manifest.runs.map((r) => r.runId)).toEqual(["run-a", "run-b"]);
  });

  it("never labels a run 'verified' unless verifyFn actually returned true for THAT artifact", () => {
    const a = buildSampleArtifact({ runId: "run-c" }).artifact;
    const b = buildSampleArtifact({ runId: "run-d" }).artifact;
    const manifest = buildManifestFromArtifacts("batch-2", "protocol-v1", [a, b], (artifact) => artifact.runId === "run-c");
    expect(manifest.runs.find((r) => r.runId === "run-c")?.verified).toBe(true);
    expect(manifest.runs.find((r) => r.runId === "run-d")?.verified).toBe(false);
  });

  it("preserves each run's actual termination status rather than assuming completion", () => {
    const a = buildSampleArtifact({ runId: "run-e" }).artifact;
    const manifest = buildManifestFromArtifacts("batch-3", "protocol-v1", [a], () => true);
    expect(manifest.runs[0].terminationStatus).toBe(a.provenance.finalStatus);
    expect(manifest.runs[0].terminationReason).toBe(a.provenance.terminationReason);
  });

  it("rejects a batch mixing different question-bank versions", () => {
    const a = buildSampleArtifact({ runId: "run-f" }).artifact;
    const differentBank = { ...a, runId: "run-g", provenance: { ...a.provenance, questionBankVersion: { questionCount: 999, contentHash: "deadbeef" } } };
    expect(() => buildManifestFromArtifacts("batch-4", "protocol-v1", [a, differentBank], () => true)).toThrow(/question-bank/);
  });

  it("rejects a batch mixing different curriculum versions", () => {
    const a = buildSampleArtifact({ runId: "run-h" }).artifact;
    const differentCurriculum = { ...a, runId: "run-i", provenance: { ...a.provenance, curriculumVersion: { ...a.provenance.curriculumVersion, contentHash: "deadbeef" } } };
    expect(() => buildManifestFromArtifacts("batch-5", "protocol-v1", [a, differentCurriculum], () => true)).toThrow(/curriculum/);
  });

  it("rejects an empty batch", () => {
    expect(() => buildManifestFromArtifacts("batch-6", "protocol-v1", [], () => true)).toThrow();
  });

  it("lists every distinct condition id present in the batch", () => {
    const a = buildSampleArtifact({ runId: "run-j" }).artifact;
    const manifest = buildManifestFromArtifacts("batch-7", "protocol-v1", [a], () => true);
    expect(manifest.conditions).toEqual(["C1"]);
  });

  it("regenerating a manifest from the same artifacts produces an identical result (no incidental timestamp field)", () => {
    const a = buildSampleArtifact({ runId: "run-k" }).artifact;
    const b = buildSampleArtifact({ runId: "run-l" }).artifact;
    const first = buildManifestFromArtifacts("batch-8", "protocol-v1", [a, b], () => true);
    const second = buildManifestFromArtifacts("batch-8", "protocol-v1", [a, b], () => true);
    expect(first).toEqual(second);
  });

  it("orders runs deterministically by runId regardless of input order", () => {
    const a = buildSampleArtifact({ runId: "run-z" }).artifact;
    const b = buildSampleArtifact({ runId: "run-a" }).artifact;
    const manifest = buildManifestFromArtifacts("batch-9", "protocol-v1", [a, b], () => true);
    expect(manifest.runs.map((r) => r.runId)).toEqual(["run-a", "run-z"]);
  });
});
