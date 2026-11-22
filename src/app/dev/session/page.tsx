import { cookies } from "next/headers";
import * as sessionService from "@/tutoring/session/service";
import { TutorSessionError } from "@/tutoring/session/errors";
import DevSessionClient from "@/app/dev/session/dev-session-client";
import NavHeader from "@/components/NavHeader";

export default async function DevSessionPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("tutorSessionId")?.value;

  if (!sessionId) {
    return (
      <Shell>
        <p className="text-zinc-600 dark:text-zinc-400">
          No active session (no `tutorSessionId` cookie). Start one at{" "}
          <a href="/tutor" className="underline">
            /tutor
          </a>
          .
        </p>
      </Shell>
    );
  }

  let exportData;
  try {
    exportData = sessionService.exportSession(sessionId);
  } catch (err) {
    if (err instanceof TutorSessionError) {
      return (
        <Shell>
          <p className="text-zinc-600 dark:text-zinc-400">
            The session cookie points at session &quot;{sessionId}&quot;, which no longer exists server-side
            (likely a dev-server restart — session state is in-memory only; see docs/research-logging.md).
          </p>
        </Shell>
      );
    }
    throw err;
  }

  return (
    <Shell>
      <DevSessionClient exportData={exportData} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-zinc-50 font-mono text-sm dark:bg-black">
      <NavHeader current="dev-session" />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
          Development-only diagnostic view — not part of the student tutor
        </p>
        <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">/dev/session</h1>
        {children}
      </div>
    </div>
  );
}
