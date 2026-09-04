import { CONCEPTS } from "@/domain/concepts/data";
import { MISCONCEPTIONS } from "@/domain/misconceptions/data";
import { QUESTIONS } from "@/domain/questions/data";
import { validateDomainModel } from "@/domain/validateDomainModel";
import { NON_ADAPTIVE_CURRICULUM_SEQUENCE } from "@/tutoring/selection/nonAdaptive/curriculumSequence";

export default function Home() {
  const domainErrors = validateDomainModel(QUESTIONS, CONCEPTS, MISCONCEPTIONS);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-10">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            RISE Research Prototype
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Non-Adaptive Mathematics Tutor
          </h1>
          <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            One condition of a study comparing adaptive and non-adaptive mathematics
            tutoring. This repository builds and validates the{" "}
            <strong>non-adaptive</strong> condition; the adaptive condition is developed
            separately.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="font-medium text-zinc-500 dark:text-zinc-400">Domain</p>
            <p className="mt-1 text-black dark:text-zinc-50">
              Quadratic Equations and Functions
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="font-medium text-zinc-500 dark:text-zinc-400">Condition (this repo)</p>
            <p className="mt-1 font-mono text-black dark:text-zinc-50">non_adaptive</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="font-medium text-zinc-500 dark:text-zinc-400">Assessment format</p>
            <p className="mt-1 text-black dark:text-zinc-50">
              Multiple choice, diagnostic distractors
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="font-medium text-zinc-500 dark:text-zinc-400">Status</p>
            <p className="mt-1 text-black dark:text-zinc-50">Research prototype — Phase 0</p>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p className="mb-3 font-medium text-zinc-500 dark:text-zinc-400">
            Seed data (development-only status panel)
          </p>
          <dl className="grid grid-cols-2 gap-y-2 sm:grid-cols-4">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Concepts</dt>
              <dd className="font-mono text-black dark:text-zinc-50">{CONCEPTS.length}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Misconceptions</dt>
              <dd className="font-mono text-black dark:text-zinc-50">{MISCONCEPTIONS.length}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Questions</dt>
              <dd className="font-mono text-black dark:text-zinc-50">{QUESTIONS.length}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Fixed sequence length</dt>
              <dd className="font-mono text-black dark:text-zinc-50">
                {NON_ADAPTIVE_CURRICULUM_SEQUENCE.length}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-zinc-500 dark:text-zinc-400">
            Domain model integrity:{" "}
            {domainErrors.length === 0 ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">valid</span>
            ) : (
              <span className="font-medium text-red-600 dark:text-red-400">
                {domainErrors.length} error(s)
              </span>
            )}
          </p>
        </section>
      </main>
    </div>
  );
}
