import { readFileSync } from "fs";
import path from "path";
import type { Concept, ConceptStrand } from "@/domain/concepts/types";
import type { Misconception } from "@/domain/misconceptions/types";
import { parseCsvRecords } from "@/domain/rise/csvParser";

const CONCEPT_CSV_PATH = path.join(process.cwd(), "data", "question-bank", "concept-taxonomy-v1.csv");
const MISCONCEPTION_CSV_PATH = path.join(process.cwd(), "data", "question-bank", "misconception-taxonomy-v1.csv");
const PREREQUISITE_EDGES_CSV_PATH = path.join(process.cwd(), "data", "question-bank", "prerequisite-edges-v1.csv");

const CHAPTER_TO_STRAND: Record<string, ConceptStrand> = {
  CH01: "ch01_algebra",
  CH02: "ch02_functions",
  CH03: "ch03_exponents",
  CH04: "ch04_logarithms",
  CH05: "ch05_differentiation",
  CH06: "ch06_integration",
  CH07: "ch07_geometry",
  CH08: "ch08_trigonometry",
  CH09: "ch09_vectors",
  CH10: "ch10_probability",
  CH11: "ch11_statistics",
  CH12: "ch12_proofs_and_logic",
  CH13: "ch13_permutations_and_combinations",
  CH14: "ch14_complex_numbers",
};

let cachedConcepts: Concept[] | null = null;
let cachedMisconceptions: Misconception[] | null = null;

/**
 * Loads the 109-concept RISE taxonomy, wiring in its 204 prerequisite edges
 * as each concept's `prerequisiteIds` (the taxonomy CSV's own
 * `prerequisite_concept_ids` column is redundant with the edges file and
 * is cross-checked against it, not trusted blindly, at load time).
 */
export function loadRiseConcepts(): Concept[] {
  if (cachedConcepts) return cachedConcepts;

  const conceptRows = parseCsvRecords(readFileSync(CONCEPT_CSV_PATH, "utf-8"));
  const edgeRows = parseCsvRecords(readFileSync(PREREQUISITE_EDGES_CSV_PATH, "utf-8"));

  const prereqsByDependent = new Map<string, string[]>();
  for (const edge of edgeRows) {
    const list = prereqsByDependent.get(edge.dependent_concept_id) ?? [];
    list.push(edge.prerequisite_concept_id);
    prereqsByDependent.set(edge.dependent_concept_id, list);
  }

  cachedConcepts = conceptRows.map((row): Concept => {
    const chapterId = row.chapter_id;
    const strand = CHAPTER_TO_STRAND[chapterId];
    if (!strand) {
      throw new Error(`RISE import: concept ${row.concept_id} has unrecognised chapter_id "${chapterId}"`);
    }
    const prereqIdsFromCsvColumn: string[] = row.prerequisite_concept_ids ? JSON.parse(row.prerequisite_concept_ids) : [];
    const prereqIdsFromEdgesFile = (prereqsByDependent.get(row.concept_id) ?? []).slice().sort();
    const csvColumnSorted = prereqIdsFromCsvColumn.slice().sort();
    if (JSON.stringify(prereqIdsFromEdgesFile) !== JSON.stringify(csvColumnSorted)) {
      throw new Error(
        `RISE import: concept ${row.concept_id}'s prerequisite_concept_ids column [${csvColumnSorted.join(",")}] disagrees with prerequisite-edges-v1.csv [${prereqIdsFromEdgesFile.join(",")}]`,
      );
    }
    return {
      id: row.concept_id,
      name: row.concept_name,
      description: row.description,
      prerequisiteIds: prereqIdsFromEdgesFile,
      strand,
      chapterId,
      curriculumLevel: Number(row.curriculum_level),
    };
  });
  return cachedConcepts;
}

/** Loads the 68-misconception RISE taxonomy. */
export function loadRiseMisconceptions(): Misconception[] {
  if (cachedMisconceptions) return cachedMisconceptions;
  const rows = parseCsvRecords(readFileSync(MISCONCEPTION_CSV_PATH, "utf-8"));
  cachedMisconceptions = rows.map((row): Misconception => ({
    id: row.misconception_id,
    label: row.name,
    description: row.mathematical_description,
    conceptIds: row.relevant_concept_ids ? JSON.parse(row.relevant_concept_ids) : [],
    errorPattern: row.example_of_error || undefined,
    exampleIncorrectReasoning: row.correct_reasoning
      ? `Error: ${row.example_of_error ?? "(not recorded)"} Correct reasoning: ${row.correct_reasoning}`
      : undefined,
  }));
  return cachedMisconceptions;
}
