import { describe, expect, it } from "vitest";
import { buildSampleArtifact } from "./fixtures";
import { replayFromArtifact, resolveConfigFromRegistry } from "@/research/artifact/replayArtifact";
import { computeContentDigest } from "@/research/artifact/canonicalize";
import type { ExperimentRunArtifact } from "@/research/artifact/types";

/** Applies `overrides` and recomputes a VALID digest for the result, so a test can isolate exactly one property's effect without it being masked by an (expected, correct) digest-mismatch finding instead. */
function withValidDigest(artifact: ExperimentRunArtifact, overrides: Partial<ExperimentRunArtifact>): ExperimentRunArtifact {
  const merged: ExperimentRunArtifact = { ...artifact, ...overrides };
  const withoutDigest: Record<string, unknown> = { ...merged };
  delete withoutDigest.contentDigest;
  return { ...merged, contentDigest: computeContentDigest(withoutDigest) };
}

describe("resolveConfigFromRegistry", () => {
  it("resolves a known C0-C3 condition id to a runnable config", () => {
    const config = resolveConfigFromRegistry({ conditionId: "C1" } as never);
    expect(config?.conditionId).toBe("C1");
  });

  it("returns null for an unrecognized condition id (e.g. a custom C4 condition)", () => {
    expect(resolveConfigFromRegistry({ conditionId: "my-custom-condition" } as never)).toBeNull();
  });
});

describe("replayFromArtifact", () => {
  it("performs a full computational replay for a valid, terminated, resolvable artifact and confirms it matches", () => {
    const { artifact, scenario } = buildSampleArtifact();
    const result = replayFromArtifact(artifact, scenario);
    expect(result.kind).toBe("computational_replay");
    if (result.kind === "computational_replay") {
      expect(result.replay.matches).toBe(true);
      expect(result.replay.firstDivergence).toBeNull();
    }
  });

  it("reports integrity_only (not computational_replay) when the content digest is invalid", () => {
    const { artifact, scenario } = buildSampleArtifact();
    const tampered = { ...artifact, finalEstimatorStates: { ...artifact.finalEstimatorStates, injected: { mastery: 1 } } };
    const result = replayFromArtifact(tampered, scenario);
    expect(result.kind).toBe("integrity_only");
    if (result.kind === "integrity_only") {
      expect(result.integrity.contentDigestValid).toBe(false);
      expect(result.reason).toMatch(/digest/i);
    }
  });

  it("reports integrity_only when the schema version is unsupported, distinctly from a digest failure", () => {
    const { artifact, scenario } = buildSampleArtifact();
    const futureVersion = { ...artifact, schemaVersion: "experiment-run-artifact-v99" };
    const result = replayFromArtifact(futureVersion, scenario);
    expect(result.kind).toBe("integrity_only");
    if (result.kind === "integrity_only") {
      expect(result.integrity.schemaVersionSupported).toBe(false);
      expect(result.reason).toMatch(/schema/i);
    }
  });

  it("reports integrity_only when the condition cannot be resolved (software implementation unavailable), even though integrity otherwise passes", () => {
    const { artifact, scenario } = buildSampleArtifact();
    const customCondition = withValidDigest(artifact, { conditionId: "C4-custom-bkt" });
    const result = replayFromArtifact(customCondition, scenario);
    expect(result.kind).toBe("integrity_only");
    if (result.kind === "integrity_only") {
      expect(result.integrity.contentDigestValid).toBe(true);
      expect(result.reason).toMatch(/could not be resolved/);
    }
  });

  it("accepts a caller-supplied resolveConfig, used in place of the default registry lookup", () => {
    const { artifact, scenario } = buildSampleArtifact({ runId: "custom-run" });
    let resolverCalled = false;
    const result = replayFromArtifact(artifact, scenario, {
      resolveConfig: (a) => {
        resolverCalled = true;
        return resolveConfigFromRegistry(a);
      },
    });
    expect(resolverCalled).toBe(true);
    expect(result.kind).toBe("computational_replay");
  });

  it("reports integrity_only for a non-terminated (partial) run rather than guessing its cursor", () => {
    const { artifact, scenario } = buildSampleArtifact();
    const partial = withValidDigest(artifact, {
      provenance: { ...artifact.provenance, finalStatus: "active" as const, terminationReason: undefined },
    });
    const result = replayFromArtifact(partial, scenario);
    expect(result.kind).toBe("integrity_only");
    if (result.kind === "integrity_only") {
      expect(result.reason).toMatch(/non-terminated/);
    }
  });

  it("detects a divergence when the supplied scenario's session limits differ from what the run actually used", () => {
    const { artifact, scenario } = buildSampleArtifact();
    // A smaller maxQuestions terminates the replay earlier than the
    // original run — a clean, non-cascading divergence (no question/
    // option identity is disturbed, so grading never hits a stale id).
    const alteredScenario = { ...scenario, maxQuestions: 1 };
    const result = replayFromArtifact(artifact, alteredScenario);
    expect(result.kind).toBe("computational_replay");
    if (result.kind === "computational_replay") {
      expect(result.replay.matches).toBe(false);
      expect(result.replay.firstDivergence).not.toBeNull();
    }
  });
});
