import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { buildSampleArtifact } from "./fixtures";
import {
  assertSafeArtifactId,
  extractRunMetadata,
  listRunMetadata,
  loadExperimentRunArtifact,
  runExists,
  saveExperimentRunArtifact,
  ArtifactCorruptError,
  ArtifactNotFoundError,
} from "@/research/artifact/persistence";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-persistence-test-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("saveExperimentRunArtifact / loadExperimentRunArtifact", () => {
  it("saves and reloads a full artifact with no data loss", () => {
    const { artifact } = buildSampleArtifact({ runId: "run-a" });
    saveExperimentRunArtifact(artifact, { dir: tempDir });
    const reloaded = loadExperimentRunArtifact("run-a", tempDir);
    expect(reloaded).toEqual(artifact);
  });

  it("writes both the full artifact and a lightweight metadata sidecar", () => {
    const { artifact } = buildSampleArtifact({ runId: "run-b" });
    saveExperimentRunArtifact(artifact, { dir: tempDir });
    expect(fs.existsSync(path.join(tempDir, "run-b.json"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "run-b.meta.json"))).toBe(true);
  });

  it("refuses to overwrite an existing run by default", () => {
    const { artifact } = buildSampleArtifact({ runId: "run-c" });
    saveExperimentRunArtifact(artifact, { dir: tempDir });
    expect(() => saveExperimentRunArtifact(artifact, { dir: tempDir })).toThrow(/already exists/);
  });

  it("allows an explicit overwrite when requested", () => {
    const { artifact } = buildSampleArtifact({ runId: "run-d" });
    saveExperimentRunArtifact(artifact, { dir: tempDir });
    expect(() => saveExperimentRunArtifact(artifact, { dir: tempDir, overwrite: true })).not.toThrow();
  });

  it("leaves no stray temp files behind after a successful save (atomic write)", () => {
    const { artifact } = buildSampleArtifact({ runId: "run-e" });
    saveExperimentRunArtifact(artifact, { dir: tempDir });
    const files = fs.readdirSync(tempDir);
    expect(files.every((f) => !f.endsWith(".tmp"))).toBe(true);
  });

  it("throws ArtifactNotFoundError for a run id with no stored artifact", () => {
    expect(() => loadExperimentRunArtifact("does-not-exist", tempDir)).toThrow(ArtifactNotFoundError);
  });

  it("throws ArtifactCorruptError for a file that isn't valid JSON", () => {
    fs.writeFileSync(path.join(tempDir, "corrupt-run.json"), "{ this is not json");
    expect(() => loadExperimentRunArtifact("corrupt-run", tempDir)).toThrow(ArtifactCorruptError);
  });

  it("throws ArtifactCorruptError for valid JSON missing required artifact fields", () => {
    fs.writeFileSync(path.join(tempDir, "incomplete-run.json"), JSON.stringify({ foo: "bar" }));
    expect(() => loadExperimentRunArtifact("incomplete-run", tempDir)).toThrow(ArtifactCorruptError);
  });

  it("reports runExists correctly before and after saving", () => {
    const { artifact } = buildSampleArtifact({ runId: "run-f" });
    expect(runExists("run-f", tempDir)).toBe(false);
    saveExperimentRunArtifact(artifact, { dir: tempDir });
    expect(runExists("run-f", tempDir)).toBe(true);
  });

  it("creates the output directory if it does not yet exist", () => {
    const nestedDir = path.join(tempDir, "nested", "deeper");
    const { artifact } = buildSampleArtifact({ runId: "run-g" });
    saveExperimentRunArtifact(artifact, { dir: nestedDir });
    expect(fs.existsSync(path.join(nestedDir, "run-g.json"))).toBe(true);
  });
});

describe("assertSafeArtifactId — path traversal and unsafe-filename protection", () => {
  it("rejects ids containing path separators", () => {
    expect(() => assertSafeArtifactId("../evil")).toThrow();
    expect(() => assertSafeArtifactId("a/b")).toThrow();
    expect(() => assertSafeArtifactId("a\\b")).toThrow();
  });

  it("rejects an empty id", () => {
    expect(() => assertSafeArtifactId("")).toThrow();
  });

  it("rejects an id containing '..' even without a path separator adjacent", () => {
    expect(() => assertSafeArtifactId("run..id")).toThrow();
  });

  it("accepts an ordinary alphanumeric id with hyphens/underscores/dots", () => {
    expect(() => assertSafeArtifactId("run-123_abc.v2")).not.toThrow();
  });

  it("save/load refuse an unsafe run id before touching the filesystem", () => {
    const { artifact } = buildSampleArtifact({ runId: "run-h" });
    const malicious = { ...artifact, runId: "../../etc/passwd" };
    expect(() => saveExperimentRunArtifact(malicious, { dir: tempDir })).toThrow();
    expect(() => loadExperimentRunArtifact("../../etc/passwd", tempDir)).toThrow();
  });
});

describe("listRunMetadata", () => {
  it("returns an empty array for a directory that doesn't exist yet", () => {
    expect(listRunMetadata(path.join(tempDir, "nonexistent"))).toEqual([]);
  });

  it("lists every saved run's metadata without needing to load full artifacts", () => {
    const run1 = buildSampleArtifact({ runId: "run-i" }).artifact;
    const run2 = buildSampleArtifact({ runId: "run-j" }).artifact;
    saveExperimentRunArtifact(run1, { dir: tempDir });
    saveExperimentRunArtifact(run2, { dir: tempDir });
    const list = listRunMetadata(tempDir);
    expect(list.map((m) => m.runId).sort()).toEqual(["run-i", "run-j"]);
  });

  it("extractRunMetadata matches what's actually persisted", () => {
    const { artifact } = buildSampleArtifact({ runId: "run-k" });
    saveExperimentRunArtifact(artifact, { dir: tempDir });
    const [stored] = listRunMetadata(tempDir);
    expect(stored).toEqual(extractRunMetadata(artifact));
  });

  it("correctly reports questionCount and correctCount in metadata", () => {
    const { artifact } = buildSampleArtifact({ runId: "run-l" });
    const metadata = extractRunMetadata(artifact);
    expect(metadata.questionCount).toBe(artifact.provenance.responseSequence.length);
    expect(metadata.correctCount).toBe(artifact.provenance.responseSequence.filter((r) => r.isCorrect).length);
  });
});
