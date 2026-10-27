/**
 * C3/C0.3 (protocol/phase8-protocol-v2.md): every numeric value used by
 * Phase 8 code comes from these three files, never a literal. This
 * module loads them, validates their shape (so a malformed or
 * hand-edited config fails loudly instead of silently), and computes
 * each file's SHA-256 over its raw bytes -- the same hash recorded in
 * every run record (B10.1) and, eventually, in `protocol/APPROVAL.md`
 * (which this code never creates or reads for that purpose).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface SimulatorConfig {
  version: string;
  shared: {
    delta: number;
    sigmaB: number;
    muSd: number;
    uSd: number;
    cSd: number;
    thetaOffset: number;
    gammaSd: number;
    guessClip: [number, number];
    slip: [number, number];
    probClip: [number, number];
    masteredM: number;
    reference: { options: number; level: number; epsilon: number };
  };
  S2: { pL0: [number, number]; T: [number, number]; G: [number, number]; S: [number, number] };
  S3: { eta: [number, number]; nuSd: number };
  S4: {
    piTarget: [number, number];
    piOther: [number, number];
    tau: [number, number];
    G: [number, number];
    S: [number, number];
    zeta: number;
    cells: Record<string, { lambda: number; phi: number }>;
  };
}

export interface EstimatorConfig {
  version: string;
  detA: string;
  detB: string;
  bktDefault: { pL0: number; T: number; G: number; S: number };
  bktEm: {
    bounds: { pL0: [number, number]; T: [number, number]; G: [number, number]; S: [number, number] };
    coarse: { pL0: number[]; T: number[]; G: number[]; S: number[] };
    topStarts: number;
    includeDefaultStart: boolean;
    relTol: number;
    tolStreak: number;
    paramTol: number;
    maxIter: number;
    boundFlagEps: number;
    multimodal: { llGap: number; paramGap: number };
  };
  runProp: { prior: [number, number] };
  ema: { lambda: number; m0: number };
  baseRate: { addOne: boolean };
  link: { clip: number; l2: number; newtonTol: number; maxIter: number; referenceLevel: number };
}

export interface ExperimentPlanConfig {
  version: string;
  masterSeed: string;
  slices: number;
  worlds: number;
  worldsS1: number;
  worldsCap: number;
  trackA: {
    configs: string[];
    calLearners: number;
    testLearners: number;
    phase1PerX: number;
    phase2PerT: number;
    reviewEvery: number;
  };
  trackB: {
    configs: string[];
    learners: number;
    budget: number;
    policies: string[];
    artifactSampleRate: number;
    earlyTermFlag: number;
  };
  margins: { logloss: number; mae: number };
  alpha: number;
  activationThreshold: number;
  precision: { trackAHalfWidthFraction: number; trackBHalfWidth: number };
  pilot: { worlds: number; trackALearners: [number, number]; trackBLearners: number };
  analysis: { eceBins: number; bootstrap: number; signFlipExact: boolean };
  bkt4: { regretFlag: number; calLearnersIfFlag: number };
  bkt5: { fits: number; llTolerance: number; passShare: number };
}

export interface LoadedConfig<T> {
  value: T;
  /** SHA-256 of the raw file bytes (not a canonicalized re-serialization) -- what `git diff`/`sha256sum` would also report. */
  sha256: string;
  path: string;
}

const CONFIG_DIR = join(process.cwd(), "config", "phase8");

function readAndHash(filename: string): { raw: string; sha256: string; path: string } {
  const path = join(CONFIG_DIR, filename);
  const raw = readFileSync(path, "utf-8");
  const sha256 = createHash("sha256").update(raw, "utf-8").digest("hex");
  return { raw, sha256, path };
}

function assertType(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Phase 8 config validation failed: ${message}`);
  }
}

function isPair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === "number");
}

function validateSimulatorConfig(value: unknown, path: string): asserts value is SimulatorConfig {
  const v = value as Partial<SimulatorConfig>;
  assertType(typeof v.version === "string", `${path}: missing/invalid "version"`);
  assertType(typeof v.shared === "object" && v.shared !== null, `${path}: missing "shared"`);
  assertType(isPair(v.shared?.guessClip), `${path}: shared.guessClip must be a [number, number] pair`);
  assertType(isPair(v.shared?.slip), `${path}: shared.slip must be a [number, number] pair`);
  assertType(isPair(v.shared?.probClip), `${path}: shared.probClip must be a [number, number] pair`);
  assertType(typeof v.shared?.reference?.options === "number", `${path}: shared.reference.options missing`);
  assertType(typeof v.S2 === "object" && v.S2 !== null, `${path}: missing "S2"`);
  assertType(isPair(v.S2?.pL0) && isPair(v.S2?.T) && isPair(v.S2?.G) && isPair(v.S2?.S), `${path}: S2 ranges must be [number, number] pairs`);
  assertType(typeof v.S3 === "object" && v.S3 !== null, `${path}: missing "S3"`);
  assertType(isPair(v.S3?.eta), `${path}: S3.eta must be a [number, number] pair`);
  assertType(typeof v.S4 === "object" && v.S4 !== null, `${path}: missing "S4"`);
  assertType(typeof v.S4?.cells === "object" && v.S4?.cells !== null, `${path}: S4.cells missing`);
  for (const cellId of ["S4-ref", "S4-GF", "S4-N", "S4-GW"]) {
    const cell = v.S4?.cells?.[cellId];
    assertType(
      cell !== undefined && typeof cell.lambda === "number" && typeof cell.phi === "number",
      `${path}: S4.cells["${cellId}"] missing or malformed`,
    );
  }
}

function validateEstimatorConfig(value: unknown, path: string): asserts value is EstimatorConfig {
  const v = value as Partial<EstimatorConfig>;
  assertType(typeof v.version === "string", `${path}: missing/invalid "version"`);
  assertType(typeof v.detA === "string" && typeof v.detB === "string", `${path}: detA/detB must name exported defaults`);
  assertType(typeof v.bktDefault === "object" && v.bktDefault !== null, `${path}: missing "bktDefault"`);
  for (const key of ["pL0", "T", "G", "S"] as const) {
    assertType(typeof v.bktDefault?.[key] === "number", `${path}: bktDefault.${key} missing`);
  }
  assertType(typeof v.bktEm === "object" && v.bktEm !== null, `${path}: missing "bktEm"`);
  assertType(typeof v.bktEm?.topStarts === "number" && v.bktEm.topStarts > 0, `${path}: bktEm.topStarts must be positive`);
  assertType(Array.isArray(v.bktEm?.coarse?.pL0), `${path}: bktEm.coarse.pL0 must be an array`);
  assertType(typeof v.link === "object" && v.link !== null, `${path}: missing "link"`);
}

function validateExperimentPlan(value: unknown, path: string): asserts value is ExperimentPlanConfig {
  const v = value as Partial<ExperimentPlanConfig>;
  assertType(typeof v.version === "string", `${path}: missing/invalid "version"`);
  assertType(typeof v.masterSeed === "string" && v.masterSeed.length > 0, `${path}: masterSeed must be a non-empty string`);
  assertType(typeof v.worlds === "number" && v.worlds > 0, `${path}: worlds must be positive`);
  assertType(typeof v.worldsCap === "number" && v.worldsCap >= v.worlds!, `${path}: worldsCap must be >= worlds`);
  assertType(Array.isArray(v.trackA?.configs) && v.trackA.configs.length > 0, `${path}: trackA.configs must be non-empty`);
  assertType(Array.isArray(v.trackB?.configs) && v.trackB.configs.length > 0, `${path}: trackB.configs must be non-empty`);
  assertType(Array.isArray(v.trackB?.policies) && v.trackB.policies.length > 0, `${path}: trackB.policies must be non-empty`);
  assertType(typeof v.margins?.logloss === "number" && typeof v.margins?.mae === "number", `${path}: margins.logloss/mae required`);
  assertType(typeof v.pilot === "object" && v.pilot !== null, `${path}: missing "pilot"`);
  assertType(isPair(v.pilot?.trackALearners), `${path}: pilot.trackALearners must be a [number, number] pair`);
}

export function loadSimulatorConfig(): LoadedConfig<SimulatorConfig> {
  const { raw, sha256, path } = readAndHash("simulator-config-v2.json");
  const value = JSON.parse(raw) as unknown;
  validateSimulatorConfig(value, path);
  return { value, sha256, path };
}

export function loadEstimatorConfig(): LoadedConfig<EstimatorConfig> {
  const { raw, sha256, path } = readAndHash("estimator-config-v2.json");
  const value = JSON.parse(raw) as unknown;
  validateEstimatorConfig(value, path);
  return { value, sha256, path };
}

export function loadExperimentPlan(): LoadedConfig<ExperimentPlanConfig> {
  const { raw, sha256, path } = readAndHash("experiment-plan-v2.json");
  const value = JSON.parse(raw) as unknown;
  validateExperimentPlan(value, path);
  return { value, sha256, path };
}

export interface Phase8Config {
  simulator: LoadedConfig<SimulatorConfig>;
  estimator: LoadedConfig<EstimatorConfig>;
  plan: LoadedConfig<ExperimentPlanConfig>;
}

/** Loads and validates all three config files in one call -- the form almost every Phase 8 entry point needs. */
export function loadPhase8Config(): Phase8Config {
  return {
    simulator: loadSimulatorConfig(),
    estimator: loadEstimatorConfig(),
    plan: loadExperimentPlan(),
  };
}
