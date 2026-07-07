"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { ArrowRight, ChevronDown, Loader2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { JobSelector } from "@/components/jobs/job-selector";
import { ListGroup } from "@/components/ui/list-section";
import { useAuth } from "@/contexts/auth-context";
import { useI18n, useT } from "@/contexts/i18n-context";
import { useInvalidatePayday, useJobs, useSettings } from "@/hooks/use-payday";
import { createManualShift, updateShift } from "@/lib/services/shift-service";
import { calculatePay, formatCurrency } from "@/lib/pay/calculate";
import { formatAmountInput, parseAmountInput } from "@/lib/pay/amount-input";
import { calculateWorkedMinutesFromManual } from "@/lib/time/calculate";
import { combineShiftTimes, formatDuration, isoToTimeInput } from "@/lib/time/format";
import { useAppStore } from "@/stores/app-store";
import type { Shift } from "@/types";
import { cn } from "@/lib/utils";

type ManualShiftFormProps = {
  date: string;
  shift?: Shift;
  onSuccess?: () => void;
  showPreview?: boolean;
  submitLabel?: string;
  formId?: string;
  hideSubmit?: boolean;
  className?: string;
  onFormStateChange?: (state: {
    isValid: boolean;
    loading: boolean;
    isEdit: boolean;
    isPerJob: boolean;
    isMonthlyPayout: boolean;
  }) => void;
};

function getShiftTimes(shift: Shift) {
  if (shift.manualStart && shift.manualEnd) {
    return {
      startTime: isoToTimeInput(shift.manualStart),
      endTime: isoToTimeInput(shift.manualEnd),
    };
  }

  const checkIn = shift.events.find((e) => e.type === "check_in");
  const checkOut = shift.events.find((e) => e.type === "check_out");

  return {
    startTime: checkIn ? isoToTimeInput(checkIn.timestamp) : "09:00",
    endTime: checkOut ? isoToTimeInput(checkOut.timestamp) : "18:00",
  };
}

export function ManualShiftForm({
  date,
  shift,
  onSuccess,
  showPreview = true,
  submitLabel,
  formId,
  hideSubmit = false,
  className,
  onFormStateChange,
}: ManualShiftFormProps) {
  const autoId = useId();
  const resolvedFormId = formId ?? autoId;
  const isEdit = Boolean(shift);
  const { user } = useAuth();
  const t = useT();
  const { dateLocale } = useI18n();
  const { data: jobs = [] } = useJobs();
  const { data: settings } = useSettings();
  const globalJobId = useAppStore((s) => s.selectedJobId);
  const invalidate = useInvalidatePayday();
  const initialTimes = shift ? getShiftTimes(shift) : { startTime: "09:00", endTime: "18:00" };
  const [jobId, setJobId] = useState(shift?.jobId ?? "");
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState(initialTimes.startTime);
  const [endTime, setEndTime] = useState(initialTimes.endTime);
  const [taskName, setTaskName] = useState(shift?.note ?? "");
  const [note, setNote] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [jobAmount, setJobAmount] = useState(
    shift?.earnedAmount ? formatAmountInput(shift.earnedAmount) : ""
  );
  const [monthlyMode, setMonthlyMode] = useState<"hours" | "payout">(
    shift?.isMonthlyPayout ? "payout" : shift ? "hours" : "payout"
  );
  const [payoutAmount, setPayoutAmount] = useState(
    shift?.isMonthlyPayout && shift.earnedAmount
      ? formatAmountInput(shift.earnedAmount)
      : ""
  );

  useEffect(() => {
    if (jobs.length === 0) return;

    const exists = jobId && jobs.some((j) => j.id === jobId);
    if (exists) return;

    const fallback =
      globalJobId && jobs.some((j) => j.id === globalJobId)
        ? globalJobId
        : jobs[0]!.id;

    setJobId(fallback);
  }, [jobs, jobId, globalJobId]);

  const job = jobs.find((j) => j.id === jobId);
  const currency = settings?.currency ?? "KRW";
  const isPerJob = job?.payConfig.type === "per_job";
  const isMonthly = job?.payConfig.type === "monthly";
  const isMonthlyPayout = Boolean(isMonthly && monthlyMode === "payout");
  const monthLabel = format(parseISO(`${date}T12:00:00`), "MMMM yyyy", { locale: dateLocale });

  useEffect(() => {
    if (!job || job.payConfig.type !== "monthly") return;
    if (shift?.isMonthlyPayout) return;
    if (!payoutAmount && job.payConfig.monthlyRate) {
      setPayoutAmount(formatAmountInput(job.payConfig.monthlyRate));
    }
  }, [job, shift?.isMonthlyPayout, payoutAmount]);

  const preview = useMemo(() => {
    if (!job) return null;

    if (isPerJob) {
      const amount = parseAmountInput(jobAmount);
      if (!taskName.trim() || !jobAmount || Number.isNaN(amount) || amount < 0) return null;
      const earned = calculatePay(0, job.payConfig, date, false, amount);
      return { minutes: 0, earned, taskName: taskName.trim() };
    }

    if (isMonthly && monthlyMode === "payout") {
      const amount = parseAmountInput(payoutAmount);
      if (!payoutAmount || Number.isNaN(amount) || amount < 0) return null;
      return { minutes: 0, earned: amount, monthLabel };
    }

    if (!startTime || !endTime) return null;
    try {
      const { startIso, endIso } = combineShiftTimes(date, startTime, endTime);
      if (startIso >= endIso) return null;
      const minutes = calculateWorkedMinutesFromManual(startIso, endIso, 0);
      const earned = calculatePay(minutes, job.payConfig, date);
      return { minutes, earned };
    } catch {
      return null;
    }
  }, [job, isPerJob, isMonthly, monthlyMode, date, startTime, endTime, jobAmount, taskName, payoutAmount, monthLabel]);

  const isValid = Boolean(
    date &&
      job &&
      preview &&
      (isPerJob
        ? taskName.trim()
        : isMonthlyPayout
          ? payoutAmount
          : startTime && endTime)
  );

  useEffect(() => {
    onFormStateChange?.({
      isValid,
      loading,
      isEdit,
      isPerJob: Boolean(isPerJob),
      isMonthlyPayout,
    });
  }, [isValid, loading, isEdit, isPerJob, isMonthlyPayout, onFormStateChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !job || !preview) return;

    setLoading(true);
    try {
      if (isPerJob) {
        if (shift) {
          await updateShift(shift, job, {
            jobId: job.id,
            note: taskName.trim(),
            breakMinutes: 0,
            status: shift.status === "completed" ? "manual" : shift.status,
            earnedAmount: parseAmountInput(jobAmount),
          });
          toast.success(t("shift.updatedTask"));
        } else {
          await createManualShift(
            user.uid,
            {
              jobId: job.id,
              date,
              taskName: taskName.trim(),
              breakMinutes: 0,
              earnedAmount: parseAmountInput(jobAmount),
            },
            job
          );
          toast.success(t("shift.savedTask"));
        }
      } else if (isMonthlyPayout) {
        const amount = parseAmountInput(payoutAmount);
        const month = date.slice(0, 7);
        if (shift) {
          await updateShift(shift, job, {
            jobId: job.id,
            isMonthlyPayout: true,
            earnedAmount: amount,
            note: `Lương tháng ${month}`,
            breakMinutes: 0,
            status: shift.status === "completed" ? "manual" : shift.status,
          });
          toast.success(t("shift.updatedMonth"));
        } else {
          await createManualShift(
            user.uid,
            {
              jobId: job.id,
              date,
              monthlyPayout: true,
              breakMinutes: 0,
              earnedAmount: amount,
              note: `Lương tháng ${month}`,
            },
            job
          );
          toast.success(t("shift.closedMonth"));
        }
      } else {
        const { startIso, endIso } = combineShiftTimes(date, startTime, endTime);

        if (shift) {
          await updateShift(shift, job, {
            jobId: job.id,
            isMonthlyPayout: false,
            manualStart: startIso,
            manualEnd: endIso,
            breakMinutes: 0,
            note: note || undefined,
            status: shift.status === "completed" ? "manual" : shift.status,
          });
          toast.success(t("shift.updated"));
        } else {
          await createManualShift(
            user.uid,
            {
              jobId: job.id,
              date,
              startTime,
              endTime,
              breakMinutes: 0,
              note: note || undefined,
            },
            job
          );
          toast.success(t("shift.saved"));
        }
      }

      setTaskName("");
      setNote("");
      onSuccess?.();
      await invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("shift.saveFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      id={resolvedFormId}
      onSubmit={handleSubmit}
      className={cn("space-y-4", className)}
    >
      <ListGroup>
        <JobSelector
          variant="rows"
          value={jobId}
          onValueChange={setJobId}
          showLabel={false}
        />

        {isPerJob ? (
          <>
            <label className="flex flex-col border-t border-border px-4 py-3.5">
              <span className="text-xs font-medium text-muted-foreground">{t("shift.taskName")}</span>
              <Input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder={t("shift.taskPlaceholder")}
                required
                className="mt-1.5 h-auto border-0 bg-transparent p-0 text-xl font-bold shadow-none focus-visible:ring-0"
              />
            </label>
            <label className="flex flex-col border-t border-border px-4 py-3.5">
              <span className="text-xs font-medium text-muted-foreground">{t("shift.jobAmount")}</span>
              <MoneyInput
                value={jobAmount}
                onChange={setJobAmount}
                placeholder="50.000"
                required
                className="mt-1.5 h-auto border-0 bg-transparent p-0 text-xl font-bold tabular-nums shadow-none focus-visible:ring-0"
              />
            </label>
          </>
        ) : isMonthly ? (
          <>
            <div className="flex gap-1.5 border-t border-border px-4 py-3">
              {(
                [
                  { id: "payout" as const, label: t("shift.closeMonth") },
                  { id: "hours" as const, label: t("shift.logHours") },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMonthlyMode(opt.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    monthlyMode === opt.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {monthlyMode === "payout" ? (
              <>
                <div className="border-t border-border px-4 py-3.5">
                  <p className="text-xs font-medium text-muted-foreground">{t("shift.month")}</p>
                  <p className="mt-1 text-lg font-bold capitalize">{monthLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("shift.monthPayoutHint")}
                  </p>
                </div>
                <label className="flex flex-col border-t border-border px-4 py-3.5">
                  <span className="text-xs font-medium text-muted-foreground">{t("shift.monthSalary")}</span>
                  <MoneyInput
                    value={payoutAmount}
                    onChange={setPayoutAmount}
                    placeholder="2.500.000"
                    required
                    className="mt-1.5 h-auto border-0 bg-transparent p-0 text-xl font-bold tabular-nums shadow-none focus-visible:ring-0"
                  />
                </label>
              </>
            ) : (
              <>
                <div className="flex items-stretch divide-x divide-border border-t border-border">
                  <label className="flex min-w-0 flex-1 flex-col px-4 py-3.5">
                    <span className="text-xs font-medium text-muted-foreground">{t("shift.start")}</span>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="mt-1.5 h-auto border-0 bg-transparent p-0 text-xl font-bold tabular-nums shadow-none focus-visible:ring-0"
                    />
                  </label>
                  <div className="flex w-10 shrink-0 items-center justify-center text-muted-foreground/50">
                    <ArrowRight className="size-4" strokeWidth={2} />
                  </div>
                  <label className="flex min-w-0 flex-1 flex-col px-4 py-3.5 text-right">
                    <span className="text-xs font-medium text-muted-foreground">{t("shift.end")}</span>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="mt-1.5 h-auto border-0 bg-transparent p-0 text-right text-xl font-bold tabular-nums shadow-none focus-visible:ring-0"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  className="flex w-full items-center gap-3 border-t border-border px-4 py-3.5 text-left transition-colors active:bg-secondary/60"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <StickyNote className="size-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium">{t("shift.note")}</span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {note || t("shift.notePlaceholder")}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      showMore && "rotate-180"
                    )}
                  />
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex items-stretch divide-x divide-border border-t border-border">
              <label className="flex min-w-0 flex-1 flex-col px-4 py-3.5">
                <span className="text-xs font-medium text-muted-foreground">{t("shift.start")}</span>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="mt-1.5 h-auto border-0 bg-transparent p-0 text-xl font-bold tabular-nums shadow-none focus-visible:ring-0"
                />
              </label>

              <div className="flex w-10 shrink-0 items-center justify-center text-muted-foreground/50">
                <ArrowRight className="size-4" strokeWidth={2} />
              </div>

              <label className="flex min-w-0 flex-1 flex-col px-4 py-3.5 text-right">
                <span className="text-xs font-medium text-muted-foreground">{t("shift.end")}</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="mt-1.5 h-auto border-0 bg-transparent p-0 text-right text-xl font-bold tabular-nums shadow-none focus-visible:ring-0"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="flex w-full items-center gap-3 border-t border-border px-4 py-3.5 text-left transition-colors active:bg-secondary/60"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <StickyNote className="size-4 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{t("shift.note")}</span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {note || t("shift.notePlaceholder")}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  showMore && "rotate-180"
                )}
              />
            </button>
          </>
        )}
      </ListGroup>

      {showMore && !isPerJob && !(isMonthly && monthlyMode === "payout") && (
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("shift.noteLong")}
          className="min-h-[88px] resize-none"
          autoFocus
        />
      )}

      {showPreview && preview && (
        <div className="relative overflow-hidden rounded-2xl bg-primary/[0.07] px-5 py-5 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, var(--primary) 30%, transparent), transparent)",
            }}
          />
          <p className="relative text-xs font-medium text-muted-foreground">
            {isPerJob ? t("shift.jobAmount") : isMonthlyPayout ? t("shift.monthSalary") : t("shift.expected")}
          </p>
          <p className="relative mt-1 text-[28px] font-bold tracking-tight text-primary tabular-nums">
            {formatCurrency(preview.earned, currency)}
          </p>
          {isPerJob ? (
            <p className="relative mt-1 truncate text-sm text-muted-foreground">
              {preview.taskName}
            </p>
          ) : isMonthlyPayout && "monthLabel" in preview ? (
            <p className="relative mt-1 capitalize text-sm text-muted-foreground">
              {preview.monthLabel as string}
            </p>
          ) : (
            <p className="relative mt-1 text-sm text-muted-foreground">
              {t("shift.workTime", { duration: formatDuration(preview.minutes) })}
            </p>
          )}
        </div>
      )}

      {showPreview && !preview && !isPerJob && !isMonthlyPayout && startTime && endTime && (
        <p className="rounded-2xl bg-destructive/8 px-4 py-3 text-center text-sm text-destructive">
          {t("shift.endAfterStart")}
        </p>
      )}

      {!hideSubmit && (
        <Button type="submit" className="h-12 w-full" disabled={loading || !isValid}>
          {loading && <Loader2 className="animate-spin" />}
          {submitLabel ??
            (isEdit
              ? isPerJob
                ? t("shift.updateTask")
                : isMonthlyPayout
                  ? t("shift.updateMonth")
                  : t("shift.update")
              : isPerJob
                ? t("shift.saveTask")
                : isMonthlyPayout
                  ? t("shift.saveMonth")
                  : t("shift.save"))}
        </Button>
      )}
    </form>
  );
}
