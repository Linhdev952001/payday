"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarDays,
  History,
  Plus,
  Settings,
} from "lucide-react";
import { JobColorDot } from "@/components/jobs/job-color-picker";
import { Button } from "@/components/ui/button";
import { ListGroup, ListRow, ListSection } from "@/components/ui/list-section";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/auth-context";
import { useI18n, useT } from "@/contexts/i18n-context";
import { useDashboardStats, useJobs, useSettings } from "@/hooks/use-payday";
import { formatCurrency } from "@/lib/pay/calculate";
import { formatDuration } from "@/lib/time/format";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export function DashboardSummary() {
  const { user } = useAuth();
  const t = useT();
  const { dateLocale } = useI18n();
  const { data: jobs = [] } = useJobs();
  const { data: stats } = useDashboardStats();
  const { data: settings } = useSettings();
  const selectedJobId = useAppStore((s) => s.selectedJobId);
  const setSelectedJobId = useAppStore((s) => s.setSelectedJobId);

  const currency = settings?.currency ?? "KRW";
  const monthEarned = stats?.monthEarned ?? 0;
  const todayEarned = stats?.todayEarned ?? 0;
  const todayMinutes = stats?.todayMinutes ?? 0;
  const monthMinutes = stats?.monthMinutes ?? 0;
  const incomeGoal = settings?.incomeGoal;
  const activeJobId = selectedJobId ?? jobs[0]?.id ?? "";
  const activeJob = jobs.find((j) => j.id === activeJobId);

  const goalProgress =
    incomeGoal && incomeGoal > 0
      ? Math.min(100, Math.round((monthEarned / incomeGoal) * 100))
      : null;

  const firstName =
    user?.displayName?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    t("common.you");

  const todayLabel = format(new Date(), "EEEE, d MMMM", { locale: dateLocale });

  return (
    <div className="space-y-6">
      <header className="page-enter">
        <p className="toss-label capitalize">{todayLabel}</p>
        <h1 className="mt-0.5 text-[26px] font-bold tracking-tight">
          {t("dashboard.greeting", { name: firstName })}
        </h1>
      </header>

      {jobs.length > 0 && (
        <div className="page-enter stagger-1 flex gap-1.5 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {jobs.map((job) => {
            const active = job.id === activeJobId;
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedJobId(job.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                <JobColorDot
                  color={job.color}
                  className={cn("size-2", active && "ring-1 ring-primary-foreground/40")}
                />
                <span className="max-w-[9rem] truncate">{job.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <section className="page-enter stagger-2 relative overflow-hidden rounded-3xl bg-card px-5 py-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 100% 0%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, color-mix(in srgb, var(--primary) 8%, transparent), transparent)",
          }}
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-muted-foreground">
                {t("dashboard.monthSalary")}
              </p>
              <p className="mt-1 text-[34px] font-bold leading-none tracking-tight text-foreground tabular-nums">
                {formatCurrency(monthEarned, currency)}
              </p>
              {activeJob ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <JobColorDot color={activeJob.color} className="size-2" />
                  <span className="truncate">{activeJob.name}</span>
                  <span className="text-border">·</span>
                  <span className="shrink-0 tabular-nums">
                    {formatDuration(monthMinutes)}
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("dashboard.workDuration", { duration: formatDuration(monthMinutes) })}
                </p>
              )}
            </div>
            {goalProgress !== null && (
              <div className="flex shrink-0 flex-col items-center">
                <div
                  className="relative flex size-14 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(var(--primary) ${goalProgress * 3.6}deg, color-mix(in srgb, var(--primary) 12%, transparent) 0)`,
                  }}
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-card text-xs font-bold tabular-nums text-primary">
                    {goalProgress}%
                  </span>
                </div>
                <span className="mt-1 text-[10px] font-medium text-muted-foreground">
                  {t("dashboard.goal")}
                </span>
              </div>
            )}
          </div>

          {goalProgress !== null && incomeGoal ? (
            <div className="mt-5 space-y-2">
              <Progress value={goalProgress} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {t("dashboard.goalRemaining", {
                  amount: formatCurrency(
                    incomeGoal - monthEarned > 0 ? incomeGoal - monthEarned : 0,
                    currency
                  ),
                })}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="page-enter stagger-3 grid grid-cols-2 overflow-hidden rounded-2xl bg-secondary/60">
        <div className="border-r border-border/60 px-4 py-4">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t("dashboard.today")}
          </p>
          <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight">
            {formatDuration(todayMinutes)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("dashboard.workHours")}</p>
        </div>
        <div className="px-4 py-4">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t("dashboard.today")}
          </p>
          <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-primary">
            {formatCurrency(todayEarned, currency)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("dashboard.todayEarned")}</p>
        </div>
      </div>

      <div className="page-enter stagger-3 space-y-2.5">
        <Button className="h-12 w-full text-[15px] font-semibold" render={<Link href="/calendar" />}>
          {t("dashboard.logToday")}
          <ArrowRight className="size-4" />
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="h-11 rounded-2xl"
            render={<Link href="/shifts/new" />}
          >
            <Plus className="size-4" />
            {t("dashboard.addShift")}
          </Button>
          <Button
            variant="secondary"
            className="h-11 rounded-2xl"
            render={<Link href="/history" />}
          >
            <History className="size-4" />
            {t("dashboard.history")}
          </Button>
        </div>
      </div>

      <div className="page-enter stagger-4 grid grid-cols-4 gap-2">
        {[
          { href: "/calendar", icon: CalendarDays, label: t("nav.calendar") },
          { href: "/stats", icon: BarChart3, label: t("nav.stats") },
          { href: "/jobs", icon: Briefcase, label: t("nav.jobs") },
          { href: "/settings", icon: Settings, label: t("nav.settings") },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 rounded-2xl bg-card py-3.5 transition-colors active:bg-secondary/80"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="size-5" strokeWidth={2} />
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
          </Link>
        ))}
      </div>

      <ListSection title={t("dashboard.other")} className="page-enter stagger-4">
        <ListGroup>
          <ListRow icon={CalendarDays} title={t("dashboard.workCalendar")} href="/calendar" />
          <ListRow icon={BarChart3} title={t("dashboard.incomeStats")} href="/stats" />
          <ListRow icon={Briefcase} title={t("dashboard.manageJobs")} href="/jobs" />
        </ListGroup>
      </ListSection>
    </div>
  );
}
