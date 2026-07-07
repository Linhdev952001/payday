import * as XLSX from "xlsx";
import type { Job, Shift } from "@/types";
import { formatDuration } from "@/lib/time/format";

export function exportShiftsToExcel(shifts: Shift[], jobs: Job[], filename = "payday-shifts.xlsx") {
  const rows = shifts
    .filter((s) => s.status === "completed" || s.status === "manual")
    .map((s) => ({
      Ngày: s.date,
      "Công việc": jobs.find((j) => j.id === s.jobId)?.name ?? "",
      Giờ: formatDuration(s.workedMinutes),
      "Phút làm": s.workedMinutes,
      Lương: s.earnedAmount,
      "Ghi chú": s.note ?? "",
      "Địa điểm": s.location ?? "",
    }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Shifts");
  XLSX.writeFile(workbook, filename);
}
