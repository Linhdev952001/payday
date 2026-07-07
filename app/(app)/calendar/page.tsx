"use client";

import { useMemo, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DayDetailSheet } from "@/components/calendar/day-detail-sheet";
import {
  CalendarJobFilter,
  filterShiftsByJob,
  type CalendarJobFilterValue,
} from "@/components/calendar/calendar-job-filter";
import {
  useCalendarDayShifts,
  useCalendarDayStats,
  useCalendarModifiers,
} from "@/components/calendar/calendar-utils";
import { Button } from "@/components/ui/button";
import { useI18n, useT } from "@/contexts/i18n-context";
import { AnimatedMoney } from "@/components/ui/animated-money";
import { useJobs, useSettings, useShifts } from "@/hooks/use-payday";
import { jobColorMap } from "@/lib/color/job-colors";
import { todayDateString } from "@/types";

const WORK_STATUSES = new Set(["completed", "manual", "in_progress"]);

export default function CalendarPage() {
  const { data: shifts = [] } = useShifts();
  const { data: jobs = [] } = useJobs();
  const { data: settings } = useSettings();
  const t = useT();
  const { dateLocale } = useI18n();
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [jobFilter, setJobFilter] = useState<CalendarJobFilterValue>("all");

  const currency = settings?.currency ?? "KRW";
  const selectedDate = selected ? format(selected, "yyyy-MM-dd") : todayDateString();
  const monthPrefix = format(month, "yyyy-MM");

  const jobIds = useMemo(() => new Set(jobs.map((j) => j.id)), [jobs]);

  const filteredShifts = useMemo(
    () => filterShiftsByJob(shifts.filter((s) => jobIds.has(s.jobId)), jobFilter),
    [shifts, jobFilter, jobIds]
  );

  const modifiers = useCalendarModifiers(filteredShifts);
  const dayStats = useCalendarDayStats(filteredShifts);
  const dayShifts = useCalendarDayShifts(filteredShifts);
  const colors = useMemo(() => jobColorMap(jobs), [jobs]);
  const jobPayTypes = useMemo(
    () => new Map(jobs.map((j) => [j.id, j.payConfig.type])),
    [jobs]
  );

  const monthStats = useMemo(() => {
    return filteredShifts
      .filter((s) => WORK_STATUSES.has(s.status) && s.date.startsWith(monthPrefix))
      .reduce((sum, s) => sum + s.earnedAmount, 0);
  }, [filteredShifts, monthPrefix]);

  function handleDaySelect(date: Date | undefined) {
    const next = date ?? selected ?? new Date();
    setSelected(next);
    setOpen(true);
  }

  function openTodaySheet() {
    const today = new Date();
    setSelected(today);
    setMonth(today);
    setOpen(true);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 bg-background">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <CalendarJobFilter
            jobs={jobs}
            value={jobFilter}
            onChange={setJobFilter}
            className="min-w-0 flex-1"
          />
          <AnimatedMoney
            value={monthStats}
            currency={currency}
            className="shrink-0 text-sm font-bold text-primary"
          />
        </div>

        <div className="flex items-center justify-between gap-2 px-1 py-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label={t("calendar.prevMonth")}
          >
            <ChevronLeft className="size-5" />
          </Button>

          <p className="font-mono text-base font-semibold tracking-wide">
            {format(month, "yyyy.MM")}
          </p>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label={t("calendar.nextMonth")}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </div>

      <Calendar
        variant="work"
        fixedWeeks
        mode="single"
        required
        selected={selected}
        month={month}
        onMonthChange={setMonth}
        onSelect={handleDaySelect}
        locale={dateLocale}
        weekStartsOn={settings?.weekStartDay === "sunday" ? 0 : 1}
        modifiers={modifiers}
        dayStats={dayStats}
        dayShifts={dayShifts}
        jobColors={colors}
        jobPayTypes={jobPayTypes}
        currency={currency}
        className="min-h-0 w-full flex-1"
      />

      <Button
        size="icon-lg"
        className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 shadow-lg shadow-primary/25"
        onClick={openTodaySheet}
        aria-label={t("calendar.addShift")}
      >
        <Plus className="size-6" />
      </Button>

      <DayDetailSheet date={selectedDate} open={open} onOpenChange={setOpen} />
    </div>
  );
}
//rebuild