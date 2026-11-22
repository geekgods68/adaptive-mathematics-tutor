import { cookies } from "next/headers";
import * as adaptiveSessionService from "@/tutoring/adaptiveSession/service";
import { AdaptiveSessionError } from "@/tutoring/adaptiveSession/errors";
import DevAdaptiveSessionClient from "@/app/dev/adaptive-session/dev-adaptive-session-client";
import NavHeader from "@/components/NavHeader";

export default async function DevAdaptiveSessionPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("adaptiveTutorSessionId")?.value;

  if (!sessionId) {
    return (
      <Shell>
        <p className="text-zinc-600 dark:text-zinc-400">
          No active session (no `adaptiveTutorSessionId` cookie). Start one at{" "}
          <a href="/adaptive-tutor" className="underline">
            /adaptive-tutor
          </a>
          .
        </p>
      </Shell>
    );
  }

  let session;
  try {
    session = adaptiveSessionService.getSession(sessionId);
  } catch (err) {
    if (err instanceof AdaptiveSessionError) {
      return (
        <Shell>
          <p className="text-zinc-600 dark:text-zinc-400">
            The session cookie points at session &quot;{sessionId}&quot;, which no longer exists server-side (likely a dev-server
            restart — session state is in-memory only).
          </p>
        </Shell>
      );
    }
    throw err;
  }

  return (
    <Shell>
      <DevAdaptiveSessionClient session={session} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-zinc-50 font-mono text-sm dark:bg-black">
      <NavHeader current="dev-adaptive-session" />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
          Development/researcher-only diagnostic view — not part of the student tutor. Shows the complete numerical decision
          traces (Phase 3 mastery updates, Phase 4 selection decisions) behind the simplified explanations shown at
          /adaptive-tutor.
        </p>
        <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">/dev/adaptive-session</h1>
        {children}
      </div>
    </div>
  );
}
