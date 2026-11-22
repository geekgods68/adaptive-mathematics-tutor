import { NextResponse } from "next/server";
import { readLatestPilotReport } from "@/research/ui/readOnlyData";

/** Read-only export of the stored pilot report (Part D7: "Export functionality... exports must come from actual stored experimental results"). Serves exactly the file already on disk — never regenerates, alters, or runs anything. */
export async function GET() {
  const pilot = readLatestPilotReport();
  if (!pilot) {
    return NextResponse.json({ error: "No pilot report found on disk." }, { status: 404 });
  }
  return NextResponse.json(pilot.report, {
    headers: { "Content-Disposition": "attachment; filename=pilot-report.json" },
  });
}
