# UI/UX Functional Inventory

See [`AUDIT_INDEX.md`](AUDIT_INDEX.md) for the evidence-level legend. Unless otherwise noted, every row below is **SOURCE VERIFIED** by direct reading of the named file; no browser was used (no browser-automation tool was available to this audit — see `AUDIT_INDEX.md`'s scope note).

## Legend for "Status"

- **Complete** — fully implemented, no known gap.
- **Complete with gap** — works, but a specific, cited gap exists.
- **Read-only by design** — intentionally non-interactive (documented as such in the page itself).
- **Orphaned** — reachable and functional, but not linked from the current primary navigation.

---

## Student Workspace (wrapped in `AppShell`)

### `/` — Dashboard
**File:** `src/app/page.tsx` → `src/app/DashboardClient.tsx`
**Purpose:** Student home — welcome/resume state, aggregate metrics, diagnostics, concept mastery by chapter, recent activity.
**Data dependencies:** `resumeAdaptiveSessionAction`, `resumeSessionAction`, `listCurriculumAction` (server), `buildHistorySummary`/`currentMasteryByConcept`/`listSessions` (client `localStorage`, from `studentHistory.ts`).
**User actions:** Resume an in-progress session; start initial diagnostic (new student) or practice (returning); navigate to Progress/History; click a "Recommended practice" chip (deep-links to `/practice?mode=adaptive&chapter=...&autostart=1`).
**States:** loading (`!summary`), new-student (`isNewStudent`), returning-student with/without a resumable session.
**Status:** Complete. **Gap:** its "current mastery" figures are computed by `currentMasteryByConcept()`, which scans `rise-student-history-v1` (per-session snapshots) — a *separate* store from the new `rise-student-mastery-state-v1` that actually seeds the next adaptive session (`src/lib/studentMasteryState.ts`). The two are populated together today but are not the same data path; see Finding F-04. In the ordinary case (every completed session writes both) they agree; there is no code path that reconciles them if one write succeeds and the other doesn't (each is wrapped in its own independent `try/catch`).

### `/practice` — Practice
**File:** `src/app/practice/page.tsx` → `PracticeClient.tsx`
**Purpose:** The single, unified entry point for both adaptive and non-adaptive practice, parameterized by `?mode=`, `?chapter=`, `?autostart=`, `?source=`.
**User actions:** Choose topic (15-option dropdown: "Across All Topics" + 14 RISE chapters — confirmed present and exactly 15 options by a dedicated existing test, TEST VERIFIED), choose mode (Adaptive/Non-Adaptive, mutually exclusive `ModeCard`s), start, answer, submit, continue, practice again.
**Backend operations invoked:** `startAdaptiveSessionAction`/`startTutorSessionAction`, `submitAdaptiveAnswerAction`/`submitAnswerAction`, `advanceAdaptiveSessionAction`/`advanceSessionAction`, `resetAdaptiveSessionAction`/`resetTutorSessionAction`.
**State changes caused:** server-side session mutation (via the above); client-side `localStorage` writes to `rise-student-settings-v1` (on start), `rise-student-question-history-v1` (per question, adaptive only), `rise-student-history-v1` and `rise-student-mastery-state-v1` (on completion, adaptive only).
**Error/loading/empty states:** `{kind:"loading"}`, `{kind:"error", message}` (any server action returning `{ok:false}`), a disabled Submit button until an option is selected.
**Status:** Complete, and the most feature-complete entry point in the app — the continuity fix, history recording, and settings-remembering all live here. **Gap:** no automated test exercises the continuity read/write wiring itself (only the cold-start/no-prior-state path is asserted by the existing dropdown tests, since `localStorage.clear()` runs in `beforeEach`) — see Finding F-11.

### `/assessments` — Assessments
**File:** `src/app/assessments/page.tsx` → `AssessmentsClient.tsx`
**Purpose:** Framing/entry point distinct from Practice — "Initial Diagnostic" (first-ever, detected via `listSessions().length > 0`) vs. "Full Diagnostic (All Topics)" vs. "Chapter-Specific Assessment" — all three literally deep-link into `/practice?mode=adaptive&...&autostart=1&source=assessment`, running the identical engine.
**User actions:** Pick a chapter (for the chapter-specific card), click Start.
**Status:** Complete. Its own copy is explicit and accurate: "Assessments use the identical adaptive practice engine as Practice... The difference is purely how you get here and what the result is used for." This is a good example of honest internal documentation matching actual behavior.
**Note on requirement 3's "distinguish assessment/practice modes":** this page is the *entire* mechanism by which that distinction exists in the student-facing product — there is no separate server-side "assessment mode" or registered experimental condition for it (confirmed: `startAdaptiveSessionAction`/`startAdaptiveSession` take no mode parameter at all). The `source: "practice" | "assessment"` field recorded in `SessionHistoryRecord` is purely a UI/analytics label.

### `/progress` — My Progress
**File:** `src/app/progress/page.tsx` → `ProgressClient.tsx`, backed by `src/app/progress/actions.ts`
**Purpose:** Concept mastery explorer (filterable/sortable table), a simple bar-chart "mastery progression" over multiple sessions per concept, and a prerequisite/dependent explorer against the real 109-concept RISE graph.
**Data dependencies:** `currentMasteryByConcept()`/`listSessions()` (client), `listCurriculumAction()`/`getConceptDetailAction()` (server, reading the real curriculum graph).
**Status:** Complete. Same F-04 caveat as the Dashboard (same underlying `currentMasteryByConcept()` call). The "mastery progression" bar chart explicitly only shows concepts touched in 2+ sessions, and says so.

### `/history` and `/history/[id]` — Session History
**Files:** `src/app/history/page.tsx`/`HistoryClient.tsx`, `src/app/history/[id]/page.tsx`/`HistoryDetailClient.tsx`
**Purpose:** Table of every `localStorage`-recorded session; detail view per session.
**User actions:** View list, click through to a session's detail, "Clear history."
**Status:** Complete. **Gap (shared with Settings):** "Clear history" removes `rise-student-history-v1` only (`clearHistory()`, `studentHistory.ts:109-116`) — it does not touch `rise-student-mastery-state-v1` or `rise-student-question-history-v1`. A student who clears history here and expects a fresh start will still have their next adaptive session seeded from the old, un-cleared mastery state and still skip previously-seen questions. See Finding F-04.

### `/settings` — Settings
**File:** `src/app/settings/page.tsx` → `SettingsClient.tsx`
**Purpose:** Theme explanation (actual toggle lives in the top bar on every page, not here), default-mode/default-topic preference, local-data disclosure and clear-history control.
**Status:** Complete with the same gap as `/history`'s clear control (same underlying `clearHistory()` call, `SettingsClient.tsx:32-35`). There is no control anywhere in the UI to clear `rise-student-mastery-state-v1` or `rise-student-question-history-v1` specifically — a student cannot reset just their adaptive mastery without clearing the browser's storage directly.

---

## Legacy / parallel entry points (wrapped in `NavHeader`, not `AppShell`)

### `/tutor` — Non-Adaptive Tutor
**Files:** `src/app/tutor/page.tsx`, `tutor-client.tsx`
**Purpose:** The original, standalone non-adaptive flow, predating the Workspace redesign.
**Status:** Complete, fully functional, and — per `/practice`'s non-adaptive mode calling the identical `src/app/tutor/actions.ts` Server Actions and the identical `src/tutoring/session/service.ts` — functionally redundant with `/practice` (non-adaptive mode). It does not record to `studentHistory.ts` and does not appear in the new Dashboard/History.

### `/adaptive-tutor` — Adaptive Tutor
**Files:** `src/app/adaptive-tutor/page.tsx`, `adaptive-tutor-client.tsx`
**Purpose:** The original, standalone Phase 7 adaptive flow.
**Status:** Complete with a **significant gap**: shares the exact same session cookie name (`adaptiveTutorSessionId`) and the same in-memory `adaptiveSessionStore` as `/practice`'s adaptive mode (both go through the same `src/app/adaptive-tutor/actions.ts`), meaning the two pages can resume *each other's* in-progress sessions — but `/adaptive-tutor`'s own client never supplies the continuity parameters, never records to `studentHistory.ts`, and never writes to either of the two new continuity `localStorage` keys. See Finding F-01 for the full consequence.
**Reachability:** not linked from any Student Workspace page (confirmed by `grep` across `src/app` and `src/components` — the only references to `/adaptive-tutor` as a hyperlink are `NavHeader.tsx` itself and `/dev/adaptive-session`'s own page text). Reachable only via direct URL or the legacy nav. **Orphaned** relative to the primary navigation, but not dead code — it is fully wired and still shares live state with `/practice`.

### `/dev/session` and `/dev/adaptive-session` — Researcher diagnostic viewers
**Files:** `src/app/dev/session/page.tsx`/`dev-session-client.tsx`, `src/app/dev/adaptive-session/page.tsx`/`dev-adaptive-session-client.tsx`
**Purpose:** Full raw-state dump (JSON) of the current session, including every selection trace and mastery-update trace, plus a download/reset control. Explicitly never linked from any student-facing page (CLAUDE.md, confirmed by the same `grep`).
**Status:** Complete, read-only-in-spirit (the only mutation is an explicit Reset button). This is the single place a researcher can see the *complete*, non-sanitized `AdaptiveSelectionTrace`/`MasteryUpdateTrace`/`misconceptionTallies` for a live session — valuable, and correctly gated off from the student-facing boundary.

---

## Researcher Workspace (wrapped in `AppShell`, all **read-only by design**)

Every page under `/research/*` reads live, on-disk state (`src/research/ui/readOnlyData.ts`) and renders it; none of them write, execute, or simulate anything. This is explicitly stated on several of the pages themselves (e.g., the Experiment Designer's own banner: "Protocol-controlled configuration is read-only... this page maintains no separate copy and cannot edit them").

| Page | File | What it shows | Status |
|---|---|---|---|
| `/research` | `research/page.tsx` | Phase-by-phase implementation-status table, registered conditions (C0-C3), most recent pilot summary, protocol/approval/git-commit integrity stats | Complete, read-only |
| `/research/experiments` | `research/experiments/page.tsx` | Live `config/phase8/*.json` contents, three "experimental mode" cards (Preview/Pilot/Confirmatory) with Confirmatory correctly shown `blocked` when `protocol/APPROVAL.md` is absent | Complete, read-only |
| `/research/models` | `research/models/page.tsx` | A hardcoded-but-accurate table of the 7 implemented estimators (Det-A, Det-B, BKT-fit, BKT-default, RunProp, EMA, B0) with role/config/status, the registered selection conditions, and (if a pilot report exists) a per-family worlds-observed table | Complete, read-only |
| `/research/results` | `research/results/page.tsx` | Pilot-scale Track A (log loss/MAE) and Track B (K(T)) tables, each captioned explicitly as "pilot data only... never a performance comparison" | Complete, read-only |
| `/research/runs` | `research/runs/page.tsx` | The one batch-level pilot run's metadata, runtime percentile tables, a JSON download link | Complete, read-only. Its own banner correctly discloses that per-run (not just per-batch) persistence is not yet built |
| `/research/reproducibility` | `research/reproducibility/page.tsx` | Protocol file/hash, config file hashes, git commit, amendment history, artifact-integrity status (explicitly notes Phase 6's integrity system exists but "is not yet wired to Phase 8 Track A/B runs"), replay-verification status (explicitly "not yet run at Phase 8 scale") | Complete, read-only |

This entire Workspace is a strong example of a UI that **never overstates its own system's maturity** — every "not yet" claim checked in this audit (approval file absence, lack of per-run persistence, lack of Phase 6/Phase 8 wiring) was independently confirmed against the actual filesystem/source, not just trusted. See `RESEARCH_PIPELINE_STATUS.md`.

---

## Shared shell components

- **`AppShell.tsx`** — sidebar nav, workspace switcher (with an explicit, correct disclaimer: "No authentication exists in this prototype — this switcher is a developer convenience, not access control"), breadcrumbs, mobile hamburger menu, theme toggle. Complete.
- **`ThemeToggle.tsx` / `themeScript.ts`** — class-based (`.dark` on `<html>`) manual override coexisting with `prefers-color-scheme`, via a blocking inline script to avoid a flash of the wrong theme. The `<html>` element correctly carries `suppressHydrationWarning` for this reason (a legitimate, intentional client/server difference, not a bug — documented inline at `layout.tsx:27-31`).
- **`MathText.tsx`** — KaTeX renderer for the RISE bank's `\( ... \)`/`\[ ... \]` delimiter convention, added in Phase 7 specifically because no KaTeX rendering existed before it (per RD-0008).
- **`globals.css`** — a minimal, Tailwind-v4-native theme (`@custom-variant dark`, two CSS variables for background/foreground), no custom design tokens beyond that. Typography/spacing are entirely Tailwind utility classes, applied consistently (`text-sm`/`text-base`/`text-lg`/`text-xl` hierarchy, `zinc` neutral palette, consistent `rounded-lg border` card treatment) across both the new Workspace pages and the legacy pages — visually consistent even though the two shells differ structurally.

## Accessibility observations (SOURCE VERIFIED from markup, not an automated audit)

- Radio-button question options use real `<input type="radio">` inside `<label>`, with a `<fieldset>`/`<legend className="sr-only">` wrapper — correct semantic structure (`PracticeClient.tsx:437-438`, mirrored in `adaptive-tutor-client.tsx`/`tutor-client.tsx`).
- Progress bars use `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax` (`PracticeClient.tsx:690`, `adaptive-tutor-client.tsx:364`).
- Nav items use `aria-current="page"` when active (`AppShell.tsx:100`, `NavHeader.tsx:30`).
- No automated accessibility testing (axe, Lighthouse, etc.) exists in the test suite — this observation is based on markup inspection only, not a rendered-DOM or contrast audit. **UNKNOWN** whether color contrast meets WCAG thresholds in either theme.

## Distinguishing aesthetic/usability/implementation/model issues, as requested

- **Aesthetic:** none identified as worth flagging — the Tailwind utility usage is consistent and the two shells, while structurally different, share the same color/spacing language.
- **Usability:** F-08 (two navigation systems co-existing) and F-09 (two functionally-overlapping adaptive entry points with diverging feature sets) are usability issues, not implementation bugs — both pages work correctly on their own terms.
- **Implementation defect:** F-01 (continuity fix not applied to `/adaptive-tutor`) and F-04/its Settings-page corollary (incomplete "clear history") are genuine implementation gaps — code that does less than the feature it's part of implies.
- **Scientific/model issue:** F-02 (disjoint question banks) is not a UI issue at all — it is a research-design consistency issue that happens to be *visible* in the UI (the Practice page's own copy says "Non-Adaptive... follows a fixed 35-question sequence through the quadratics curriculum," correctly describing its own condition, while never mentioning that Adaptive mode is drawing from an unrelated, much broader bank).
