import { describe, expect, it } from "vitest";
import { EstimatorRegistry, estimatorRegistry } from "@/research/experiment/estimatorRegistry";
import { DEFAULT_MODEL_PARAMETERS, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY } from "@/domain/learner-model/parameters";

describe("the process-wide estimatorRegistry", () => {
  it("pre-registers exactly the estimators this build actually implements, nothing more", () => {
    const ids = estimatorRegistry.list().map((e) => e.estimatorId).sort();
    expect(ids).toEqual(["deterministic-mastery-v1", "deterministic-mastery-v2-inverse-difficulty", "none"].sort());
  });

  it("does NOT register a placeholder for BKT or any other unimplemented estimator", () => {
    expect(estimatorRegistry.get("bkt-v1")).toBeUndefined();
    expect(estimatorRegistry.get("irt-v1")).toBeUndefined();
  });

  it("looking up 'deterministic-mastery-v1' builds a working adapter with the correct parameters", () => {
    const entry = estimatorRegistry.get("deterministic-mastery-v1")!;
    const adapter = entry.build();
    expect(adapter.version).toBe(DEFAULT_MODEL_PARAMETERS.version);
    expect(adapter.parameters).toEqual(DEFAULT_MODEL_PARAMETERS);
  });

  it("looking up 'deterministic-mastery-v2-inverse-difficulty' builds the inverse-difficulty variant", () => {
    const entry = estimatorRegistry.get("deterministic-mastery-v2-inverse-difficulty")!;
    const adapter = entry.build();
    expect(adapter.version).toBe(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY.version);
  });

  it("looking up 'none' builds the null estimator", () => {
    const entry = estimatorRegistry.get("none")!;
    const adapter = entry.build();
    expect(adapter.estimatorType).toBe("none");
  });

  it("returns undefined for an unregistered id rather than throwing", () => {
    expect(estimatorRegistry.get("does-not-exist")).toBeUndefined();
  });
});

describe("EstimatorRegistry — the generic mechanism, tested independently of the pre-populated singleton", () => {
  it("allows registering and retrieving a custom entry", () => {
    const registry = new EstimatorRegistry();
    const build = () => ({ estimatorType: "custom", version: "v1", parameters: {}, initConcept: () => ({}), applyResponse: () => ({ updatedStates: {}, traces: [] }), readMastery: () => undefined, serializeStates: () => "{}", restoreStates: () => ({}) });
    registry.register({ estimatorId: "custom-test", description: "A test-only custom estimator.", build });
    expect(registry.get("custom-test")?.build).toBe(build);
  });

  it("rejects registering the same id twice", () => {
    const registry = new EstimatorRegistry();
    const entry = { estimatorId: "dup", description: "d", build: () => ({ estimatorType: "x", version: "v", parameters: {}, initConcept: () => ({}), applyResponse: () => ({ updatedStates: {}, traces: [] }), readMastery: () => undefined, serializeStates: () => "{}", restoreStates: () => ({}) }) };
    registry.register(entry);
    expect(() => registry.register(entry)).toThrow();
  });

  it("list() returns every registered entry", () => {
    const registry = new EstimatorRegistry();
    const makeEntry = (id: string) => ({ estimatorId: id, description: id, build: () => ({ estimatorType: id, version: "v", parameters: {}, initConcept: () => ({}), applyResponse: () => ({ updatedStates: {}, traces: [] }), readMastery: () => undefined, serializeStates: () => "{}", restoreStates: () => ({}) }) });
    registry.register(makeEntry("a"));
    registry.register(makeEntry("b"));
    expect(registry.list().map((e) => e.estimatorId).sort()).toEqual(["a", "b"]);
  });

  it("a fresh registry starts empty, independent of the pre-populated singleton", () => {
    const registry = new EstimatorRegistry();
    expect(registry.list()).toEqual([]);
  });
});
