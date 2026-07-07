import Papa from "papaparse";
import type { Job, Shift } from "@/types";
import { formatDuration } from "@/lib/time/format";

export function shiftsToCsv(shifts: Shift[], jobs: Job[]): string {
  const rows = shifts
    .filter((s) => s.status === "completed" || s.status === "manual")
    .map((s) => ({
      date: s.date,
      job: jobs.find((j) => j.id === s.jobId)?.name ?? "",
      worked: formatDuration(s.workedMinutes),
      workedMinutes: s.workedMinutes,
      earned: s.earnedAmount,
      note: s.note ?? "",
      location: s.location ?? "",
    }));

  return Papa.unparse(rows);
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
