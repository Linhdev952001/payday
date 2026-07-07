import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  type Locale,
} from "date-fns";
import { vi } from "date-fns/locale";
import type { TimeFormat, WeekStartDay } from "@/types";

const WEEK_START_MAP: Record<WeekStartDay, 0 | 1 | 6> = {
  sunday: 0,
  monday: 1,
  saturday: 6,
};

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes.toString().padStart(2, "0")}m`;
}

export function formatDurationLong(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} giờ ${minutes} phút`;
}

export function formatTime(
  iso: string,
  timeFormat: TimeFormat = "24h"
): string {
  const date = parseISO(iso);
  return format(date, timeFormat === "24h" ? "HH:mm" : "hh:mm a");
}

export function formatDate(
  dateStr: string,
  pattern = "dd/MM/yyyy",
  locale: Locale = vi
): string {
  return format(parseISO(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr), pattern, {
    locale,
  });
}

export function formatDateTime(iso: string, timeFormat: TimeFormat = "24h"): string {
  return `${formatDate(iso)} ${formatTime(iso, timeFormat)}`;
}

export function getWeekStart(date: Date, weekStartDay: WeekStartDay): Date {
  return startOfWeek(date, { weekStartsOn: WEEK_START_MAP[weekStartDay] });
}

export function getWeekEnd(date: Date, weekStartDay: WeekStartDay): Date {
  return endOfWeek(date, { weekStartsOn: WEEK_START_MAP[weekStartDay] });
}

export function getPeriodRange(
  period: "day" | "week" | "month" | "year",
  reference = new Date(),
  weekStartDay: WeekStartDay = "monday"
): { start: Date; end: Date } {
  switch (period) {
    case "day":
      return { start: reference, end: reference };
    case "week":
      return {
        start: getWeekStart(reference, weekStartDay),
        end: getWeekEnd(reference, weekStartDay),
      };
    case "month":
      return { start: startOfMonth(reference), end: endOfMonth(reference) };
    case "year":
      return { start: startOfYear(reference), end: endOfYear(reference) };
  }
}

export function eachDateInRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  let current = start;
  while (current <= end) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = addDays(current, 1);
  }
  return dates;
}

export function minutesBetween(startIso: string, endIso: string): number {
  const start = parseISO(startIso).getTime();
  const end = parseISO(endIso).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

export function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function isoToTimeInput(iso: string): string {
  return format(parseISO(iso), "HH:mm");
}
