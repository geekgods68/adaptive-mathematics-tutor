import fs from "node:fs";
import { E2E_SCRATCH_DIR } from "./e2eScratch";

/**
 * Runs EXACTLY ONCE, in the main Playwright process, before the webServer
 * starts and before any worker process exists — unlike a top-level
 * statement in `playwright.config.ts` itself, which Playwright
 * re-evaluates inside EACH worker process too. That re-evaluation was a
 * real, confirmed bug during Stage 3 development: wiping the scratch
 * SQLite directory from a top-level config statement deleted data the
 * shared webServer had already written for an EARLIER spec file in the
 * same run, the moment a worker picked up a LATER spec file — the
 * webServer kept its own open file handle and kept "writing" successfully
 * into a now-detached, re-created-empty directory, while any fresh reader
 * (e.g. researchDataAgreement.spec.ts's durable-record check) saw nothing
 * at all. A `globalSetup` module is the correct, single-evaluation place
 * for this wipe.
 */
export default function globalSetup(): void {
  fs.rmSync(E2E_SCRATCH_DIR, { recursive: true, force: true });
}
