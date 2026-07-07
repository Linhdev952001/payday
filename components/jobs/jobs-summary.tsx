"use client";

import { useState } from "react";
import { Briefcase, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { ListGroup, ListRow } from "@/components/ui/list-section";
import { JobColorPicker } from "@/components/jobs/job-color-picker";
import { useAuth } from "@/contexts/auth-context";
import { useT } from "@/contexts/i18n-context";
import { useInvalidatePayday, useJobs, useSettings } from "@/hooks/use-payday";
import { createJob, deleteJob, saveJob } from "@/lib/db/repositories";
import { formatCurrency } from "@/lib/pay/calculate";
import { formatAmountInput, parseAmountInput } from "@/lib/pay/amount-input";
import { syncUserData } from "@/lib/firebase/sync";
import { DEFAULT_JOB_COLOR, isJobColorTaken, normalizeJobColor, pickAvailableJobColor } from "@/lib/color/job-colors";
import type { Job, PayConfig } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function PayTypeChips({
  value,
  onChange,
}: {
  value: PayConfig["type"];
  onChange: (type: PayConfig["type"]) => void;
}) {
  const t = useT();
  const options = [
    { id: "hourly" as const, label: t("jobs.hourly") },
    { id: "daily" as const, label: t("jobs.daily") },
    { id: "monthly" as const, label: t("jobs.monthly") },
    { id: "per_job" as const, label: t("jobs.perJob") },
  ];

  const selected = value === "tiered" ? "daily" : value;

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
            selected === opt.id
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function payLabel(job: Job, currency: string, t: ReturnType<typeof useT>) {
  const p = job.payConfig;
  if (p.type === "per_job") return t("jobs.perTask");
  if (p.type === "hourly") {
    return `${formatCurrency(p.hourlyRate ?? 0, currency as "KRW")}${t("jobs.perHour")}`;
  }
  if (p.type === "monthly") {
    return `${formatCurrency(p.monthlyRate ?? 0, currency as "KRW")}${t("jobs.perMonth")}`;
  }
  const daily = p.dailyRate ?? p.weekdayRate ?? 0;
  return `${formatCurrency(daily, currency as "KRW")}${t("jobs.perDay")}`;
}

function normalizePayType(
  type: PayConfig["type"]
): "hourly" | "daily" | "monthly" | "per_job" {
  if (type === "tiered") return "daily";
  return type;
}

function jobToForm(job: Job) {
  const p = job.payConfig;
  const payType = normalizePayType(p.type);
  return {
    name: job.name,
    color: normalizeJobColor(job.color),
    payType,
    hourlyRate: formatAmountInput(p.hourlyRate ?? 12000),
    dailyRate: formatAmountInput(p.dailyRate ?? p.weekdayRate ?? 100000),
    monthlyRate: formatAmountInput(p.monthlyRate ?? 2500000),
  };
}

export function JobsSummary() {
  const { user } = useAuth();
  const t = useT();
  const { data: jobs = [] } = useJobs();
  const { data: settings } = useSettings();
  const invalidate = useInvalidatePayday();
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [payType, setPayType] = useState<"hourly" | "daily" | "monthly" | "per_job">("hourly");
  const [hourlyRate, setHourlyRate] = useState(formatAmountInput("12000"));
  const [dailyRate, setDailyRate] = useState(formatAmountInput("100000"));
  const [monthlyRate, setMonthlyRate] = useState(formatAmountInput("2500000"));
  const [color, setColor] = useState<string>(DEFAULT_JOB_COLOR);

  const currency = settings?.currency ?? "KRW";
  const dialogOpen = createOpen || editingJob !== null;

  function resetForm() {
    setName("");
    setPayType("hourly");
    setHourlyRate(formatAmountInput("12000"));
    setDailyRate(formatAmountInput("100000"));
    setMonthlyRate(formatAmountInput("2500000"));
    setColor(DEFAULT_JOB_COLOR);
  }

  function openCreate() {
    resetForm();
    const nextColor = pickAvailableJobColor(jobs);
    if (nextColor) setColor(nextColor);
    setEditingJob(null);
    setCreateOpen(true);
  }

  function openEdit(job: Job) {
    const f = jobToForm(job);
    setName(f.name);
    setColor(f.color);
    setPayType(f.payType);
    setHourlyRate(f.hourlyRate);
    setDailyRate(f.dailyRate);
    setMonthlyRate(f.monthlyRate);
    setCreateOpen(false);
    setEditingJob(job);
  }

  function closeDialog() {
    setCreateOpen(false);
    setEditingJob(null);
    resetForm();
  }

  function buildPayConfig(): PayConfig {
    if (payType === "hourly") {
      return { type: "hourly", hourlyRate: parseAmountInput(hourlyRate), otMultiplier: 1.5 };
    }
    if (payType === "monthly") {
      return { type: "monthly", monthlyRate: parseAmountInput(monthlyRate) };
    }
    if (payType === "per_job") {
      return { type: "per_job" };
    }
    return { type: "daily", dailyRate: parseAmountInput(dailyRate) };
  }

  async function handleSave() {
    if (!user || !name.trim()) return;

    if (isJobColorTaken(color, jobs, editingJob?.id)) {
      toast.error(t("jobs.colorTaken"));
      return;
    }

    const payConfig = buildPayConfig();

    if (editingJob) {
      await saveJob({
        ...editingJob,
        name: name.trim(),
        color,
        payConfig,
      });
      toast.success(t("jobs.saved"));
    } else {
      await createJob(user.uid, {
        name: name.trim(),
        icon: "briefcase",
        color,
        payConfig,
      });
      toast.success(t("jobs.created"));
    }

    await syncUserData(user.uid);
    closeDialog();
    await invalidate();
  }

  async function handleDelete() {
    if (!user || !editingJob || !confirm(t("jobs.deleteConfirm"))) return;
    await deleteJob(editingJob.id);
    await syncUserData(user.uid);
    toast.success(t("jobs.deleted"));
    closeDialog();
    await invalidate();
  }

  async function handleTogglePin(job: Job) {
    if (!user) return;
    await saveJob({ ...job, pinned: !job.pinned });
    await syncUserData(user.uid);
    await invalidate();
  }

  const payFields =
    payType === "per_job" ? (
      <p className="text-xs text-muted-foreground">
        {t("jobs.perJobHint")}
      </p>
    ) : payType === "hourly" ? (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t("jobs.hourlyRate")}</p>
        <MoneyInput
          value={hourlyRate}
          onChange={setHourlyRate}
          placeholder="12.000"
        />
      </div>
    ) : payType === "daily" ? (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t("jobs.dailyRate")}</p>
        <MoneyInput
          value={dailyRate}
          onChange={setDailyRate}
          placeholder="100.000"
        />
      </div>
    ) : (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t("jobs.monthlyRate")}</p>
        <MoneyInput
          value={monthlyRate}
          onChange={setMonthlyRate}
          placeholder="2.500.000"
        />
        <p className="text-xs text-muted-foreground">
          {t("jobs.monthlyHint")}
        </p>
      </div>
    );

  return (
    <div className="space-y-5">
      <header className="page-enter flex items-end justify-between gap-3">
        <div>
          <p className="toss-label">{t("jobs.eyebrow")}</p>
          <h1 className="mt-0.5 text-[26px] font-bold tracking-tight">{t("jobs.title")}</h1>
        </div>
        <Button size="sm" className="shrink-0 rounded-xl" onClick={openCreate}>
          <Plus />
          {t("common.add")}
        </Button>
      </header>

      {jobs.length === 0 ? (
        <div className="page-enter flex flex-col items-center rounded-3xl bg-card px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Briefcase className="size-7 text-primary" />
          </span>
          <p className="mt-4 text-[17px] font-semibold">{t("jobs.empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("jobs.emptyDesc")}</p>
          <Button className="mt-5" onClick={openCreate}>
            <Plus />
            {t("jobs.create")}
          </Button>
        </div>
      ) : (
        <ListGroup className="page-enter stagger-1">
          {jobs.map((job) => (
            <ListRow
              key={job.id}
              icon={Briefcase}
              iconColor={job.color}
              title={job.name}
              subtitle={payLabel(job, currency, t)}
              onClick={() => openEdit(job)}
              trailing={
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleTogglePin(job);
                  }}
                  aria-label={job.pinned ? t("jobs.unpin") : t("jobs.pin")}
                  className="flex size-8 items-center justify-center rounded-lg transition-colors active:bg-secondary"
                >
                  <Star
                    className={cn(
                      "size-[18px] transition-colors",
                      job.pinned
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/50"
                    )}
                    strokeWidth={job.pinned ? 0 : 2}
                  />
                </button>
              }
            />
          ))}
        </ListGroup>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 border-b border-border px-5 pt-5 pb-4">
            <DialogTitle>{editingJob ? t("jobs.edit") : t("jobs.add")}</DialogTitle>
            <DialogDescription>{t("jobs.dialogDesc")}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("jobs.name")}</p>
              <Input
                placeholder={t("jobs.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <JobColorPicker
              value={color}
              onChange={setColor}
              usedColors={jobs
                .filter((j) => j.id !== editingJob?.id)
                .map((j) => normalizeJobColor(j.color))}
            />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("jobs.payType")}</p>
              <PayTypeChips
                value={payType}
                onChange={(t) => setPayType(normalizePayType(t))}
              />
            </div>
            {payFields}
          </div>

          <div className="shrink-0 space-y-2 border-t border-border px-5 py-4">
            <Button className="h-12 w-full" disabled={!name.trim()} onClick={() => void handleSave()}>
              {editingJob ? t("jobs.saveChanges") : t("jobs.create")}
            </Button>
            {editingJob ? (
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => void handleDelete()}
              >
                {t("jobs.deleteJob")}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
