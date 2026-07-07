import { useMemo } from "react";
import { parseISO } from "date-fns";
import type { Translate } from "@/lib/i18n";
import { formatDuration } from "@/lib/time/format";
import type { PayConfigType, Shift, ShiftStatus } from "@/types";

export type CalendarDayStats = { minutes: number; earned: number };

const WORK_STATUSES: ShiftStatus[] = ["completed", "manual", "in_progress"];

export function formatShiftBadgeLabel(
  shift: Shift,
  jobPayType?: PayConfigType,
  t?: Translate
): string {
  if (shift.isMonthlyPayout) {
    const month = Number(shift.date.slice(5, 7));
    return t ? t("shift.badge.monthPay", { month }) : `Lương T${month}`;
  }
  if (jobPayType === "per_job") {
    return shift.note?.trim() || (t ? t("shift.badge.task") : "Việc");
  }
  return formatDuration(shift.workedMinutes);
}

export function useCalendarDayShifts(shifts: Shift[]) {
  return useMemo(() => {
    const map = new Map<string, Shift[]>();

    shifts.forEach((shift) => {
      if (!WORK_STATUSES.includes(shift.status)) return;
      const list = map.get(shift.date) ?? [];
      list.push(shift);
      map.set(shift.date, list);
    });

    for (const [date, list] of map) {
      map.set(
        date,
        [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      );
    }

    return map;
  }, [shifts]);
}

export function useCalendarDayStats(shifts: Shift[]) {
  return useMemo(() => {
    const map = new Map<string, CalendarDayStats>();

    shifts.forEach((shift) => {
      if (!WORK_STATUSES.includes(shift.status)) return;

      const current = map.get(shift.date) ?? { minutes: 0, earned: 0 };
      map.set(shift.date, {
        minutes: current.minutes + shift.workedMinutes,
        earned: current.earned + shift.earnedAmount,
      });
    });

    return map;
  }, [shifts]);
}

export function useCalendarModifiers(shifts: Shift[]) {
  return useMemo(() => {
    const worked: Date[] = [];
    const off: Date[] = [];
    const leave: Date[] = [];

    const datesByStatus = new Map<string, ShiftStatus[]>();
    shifts.forEach((s) => {
      const list = datesByStatus.get(s.date) ?? [];
      list.push(s.status);
      datesByStatus.set(s.date, list);
    });

    datesByStatus.forEach((statuses, dateStr) => {
      const date = parseISO(`${dateStr}T12:00:00`);
      const hasWork = statuses.some((st) => WORK_STATUSES.includes(st));
      if (hasWork) {
        worked.push(date);
      } else if (statuses.includes("leave")) {
        leave.push(date);
      } else if (statuses.includes("off")) {
        off.push(date);
      }
    });

    return { worked, off, leave };
  }, [shifts]);
}
