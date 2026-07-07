import { parseISO } from "date-fns";
import type { TimeEvent } from "@/types";
import { minutesBetween } from "./format";

export function calculateWorkedMinutesFromEvents(
  events: TimeEvent[],
  extraBreakMinutes = 0
): number {
  if (events.length === 0) return 0;

  const sorted = [...events].sort(
    (a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime()
  );

  let total = 0;
  let workStart: string | null = null;
  let breakStart: string | null = null;

  for (const event of sorted) {
    switch (event.type) {
      case "check_in":
        workStart = event.timestamp;
        break;
      case "break_start":
        if (workStart) {
          total += minutesBetween(workStart, event.timestamp);
          workStart = null;
        }
        breakStart = event.timestamp;
        break;
      case "break_end":
        workStart = event.timestamp;
        breakStart = null;
        break;
      case "check_out":
        if (workStart) {
          total += minutesBetween(workStart, event.timestamp);
          workStart = null;
        }
        if (breakStart) {
          total += minutesBetween(breakStart, event.timestamp);
          breakStart = null;
        }
        break;
    }
  }

  if (workStart) {
    total += minutesBetween(workStart, new Date().toISOString());
  }

  return Math.max(0, total - extraBreakMinutes);
}

export function calculateWorkedMinutesFromManual(
  startIso: string,
  endIso: string,
  breakMinutes = 0
): number {
  return Math.max(0, minutesBetween(startIso, endIso) - breakMinutes);
}

export function getActiveWorkMinutes(events: TimeEvent[]): number {
  return calculateWorkedMinutesFromEvents(events, 0);
}
