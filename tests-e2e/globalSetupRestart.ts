import fs from "node:fs";
import { E2E_RESTART_SCRATCH_DIR } from "./e2eScratch";

/** See globalSetup.ts's doc comment for why this must be a globalSetup module rather than a top-level statement in playwright.restart.config.ts. */
export default function globalSetup(): void {
  fs.rmSync(E2E_RESTART_SCRATCH_DIR, { recursive: true, force: true });
}
