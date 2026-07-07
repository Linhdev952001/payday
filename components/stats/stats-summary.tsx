"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useI18n, useT } from "@/contexts/i18n-context";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarJobFilter,
  filterShiftsByJob,
  type CalendarJobFilterValue,
} from "@/components/calendar/calendar-job-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobs, useSettings, useShifts } from "@/hooks/use-payday";
import { formatCurrency } from "@/lib/pay/calculate";
import { formatDuration, getPeriodRange } from "@/lib/time/format";
import { cn } from "@/lib/utils";

type Period = "day" | "week" | "month" | "year";

const PERIOD_KEYS: Record<Period, string> = {
  day: "stats.period.day",
  week: "stats.period.week",
  month: "stats.period.month",
  year: "stats.period.year",
};

const PERIOD_TAB_KEYS: Record<Period, string> = {
  day: "stats.tabDay",
  week: "stats.tabWeek",
  month: "stats.tabMonth",
  year: "stats.tabYear",
};

const WORK_STATUSES = new Set(["completed", "manual", "in_progress"]);

type ChartPoint = { date: string; minutes: number; earned: number };

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
  currency: string;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl bg-popover px-3 py-2 shadow-lg ring-1 ring-foreground/10">
      <p className="text-xs font-medium text-muted-foreground">{point.date}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums">
        {formatDuration(point.minutes)}
      </p>
      <p className="text-sm font-semibold tabular-nums text-primary">
        {formatCurrency(point.earned, currency as "KRW")}
      </p>
    </div>
  );
}

export function StatsSummary() {
  const { data: shifts = [] } = useShifts();
  const { data: jobs = [] } = useJobs();
  const { data: settings } = useSettings();
  const t = useT();
  const { dateLocale } = useI18n();
  const [period, setPeriod] = useState<Period>("month");
  const [jobFilter, setJobFilter] = useState<CalendarJobFilterValue>("all");

  const currency = settings?.currency ?? "KRW";
  const weekStart = settings?.weekStartDay ?? "monday";

  const stats = useMemo(() => {
    const { start, end } = getPeriodRange(period, new Date(), weekStart);
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");

    const filtered = filterShiftsByJob(shifts, jobFilter).filter(
      (s) =>
        WORK_STATUSES.has(s.status) &&
        s.date >= startStr &&
        s.date <= endStr
    );

    const totalMinutes = filtered.reduce((sum, s) => sum + s.workedMinutes, 0);
    const totalEarned = filtered.reduce((sum, s) => sum + s.earnedAmount, 0);
    const workDays = new Set(filtered.map((s) => s.date)).size;
    const avgMinutes = workDays > 0 ? Math.round(totalMinutes / workDays) : 0;

    const byDate = new Map<string, number>();
    filtered.forEach((s) => {
      byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.workedMinutes);
    });

    let busiestDate = "";
    let busiestMinutes = 0;
    byDate.forEach((mins, date) => {
      if (mins > busiestMinutes) {
        busiestMinutes = mins;
        busiestDate = date;
      }
    });

    const chartData: ChartPoint[] = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, minutes]) => ({
        date: format(parseISO(`${date}T12:00:00`), "dd/MM"),
        minutes,
        earned: filtered
          .filter((s) => s.date === date)
          .reduce((sum, s) => sum + s.earnedAmount, 0),
      }));

    return {
      totalMinutes,
      totalEarned,
      avgMinutes,
      busiestDate,
      busiestMinutes,
      chartData,
      workDays,
    };
  }, [shifts, period, weekStart, jobFilter]);

  const busiestLabel = stats.busiestDate
    ? format(parseISO(`${stats.busiestDate}T12:00:00`), "d MMM", { locale: dateLocale })
    : "—";

  return (
    <div className="space-y-5">
      <header className="page-enter">
        <p className="toss-label">{t("stats.eyebrow")}</p>
        <h1 className="mt-0.5 text-[26px] font-bold tracking-tight">{t("stats.title")}</h1>
      </header>

      <Tabs
        value={period}
        onValueChange={(v) => setPeriod(v as Period)}
        className="page-enter stagger-1"
      >
        <TabsList className="grid h-11 w-full grid-cols-4">
          <TabsTrigger value="day">{t(PERIOD_TAB_KEYS.day)}</TabsTrigger>
          <TabsTrigger value="week">{t(PERIOD_TAB_KEYS.week)}</TabsTrigger>
          <TabsTrigger value="month">{t(PERIOD_TAB_KEYS.month)}</TabsTrigger>
          <TabsTrigger value="year">{t(PERIOD_TAB_KEYS.year)}</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="mt-4 space-y-4">
          {jobs.length > 0 && (
            <CalendarJobFilter
              jobs={jobs}
              value={jobFilter}
              onChange={setJobFilter}
              className="page-enter stagger-2"
            />
          )}

          {/* Hero */}
          <section className="page-enter stagger-2 relative overflow-hidden rounded-3xl bg-card px-5 py-6">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 85% 65% at 100% 0%, color-mix(in srgb, var(--primary) 16%, transparent), transparent 50%)",
              }}
            />
            <div className="relative">
              <p className="text-[13px] font-medium text-muted-foreground">
                {t(PERIOD_KEYS[period])}
              </p>
              <p className="mt-1 text-[34px] font-bold leading-none tracking-tight tabular-nums">
                {formatCurrency(stats.totalEarned, currency)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatDuration(stats.totalMinutes)}
                {stats.workDays > 0 && (
                  <span>
                    {" "}
                    · {t("stats.workDaysCount", { count: stats.workDays })}
                  </span>
                )}
              </p>
            </div>
          </section>

          {/* Metrics */}
          <div className="page-enter stagger-3 grid grid-cols-3 overflow-hidden rounded-2xl bg-secondary/60">
            <div className="border-r border-border/60 px-3 py-4 text-center">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t("stats.avgDay")}
              </p>
              <p className="mt-1.5 text-base font-bold tabular-nums">
                {formatDuration(stats.avgMinutes)}
              </p>
            </div>
            <div className="border-r border-border/60 px-3 py-4 text-center">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t("stats.workDays")}
              </p>
              <p className="mt-1.5 text-base font-bold tabular-nums">{stats.workDays}</p>
            </div>
            <div className="px-3 py-4 text-center">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t("stats.busiest")}
              </p>
              <p className="mt-1.5 text-base font-bold tabular-nums leading-tight">
                {stats.busiestDate ? formatDuration(stats.busiestMinutes) : "—"}
              </p>
              {stats.busiestDate ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground">{busiestLabel}</p>
              ) : null}
            </div>
          </div>

          {/* Chart */}
          {stats.chartData.length > 0 ? (
            <section className="page-enter stagger-4 overflow-hidden rounded-3xl bg-card">
              <div className="border-b border-border/50 px-5 py-4">
                <p className="text-[15px] font-semibold">{t("stats.chartTitle")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("stats.chartHint")}
                </p>
              </div>
              <div className="h-56 px-2 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData} barSize={period === "year" ? 6 : 14}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="color-mix(in srgb, var(--border) 80%, transparent)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      interval={period === "year" ? "preserveStartEnd" : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={24}
                      tickFormatter={(v) => `${Math.round(v / 60)}h`}
                    />
                    <Tooltip
                      cursor={{ fill: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
                      content={<ChartTooltip currency={currency} />}
                    />
                    <Bar
                      dataKey="minutes"
                      fill="var(--primary)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : (
            <div
              className={cn(
                "page-enter stagger-4 flex flex-col items-center rounded-3xl bg-card px-6 py-14 text-center"
              )}
            >
              <p className="text-[15px] font-semibold">{t("stats.noData")}</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                {t("stats.noDataDesc", { period: t(PERIOD_KEYS[period]).toLowerCase() })}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
