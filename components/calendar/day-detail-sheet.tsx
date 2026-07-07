"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { JobColorDot } from "@/components/jobs/job-color-picker";
import { ManualShiftForm } from "@/components/shifts/manual-shift-form";
import { ListGroup, ListRow } from "@/components/ui/list-section";
import { useInvalidatePayday, useJobs, useSettings, useShiftsForDate } from "@/hooks/use-payday";
import { useAuth } from "@/contexts/auth-context";
import { useI18n, useT } from "@/contexts/i18n-context";
import { deleteShift as deleteShiftDb } from "@/lib/db/repositories";
import { syncUserData } from "@/lib/firebase/sync";
import { formatCurrency } from "@/lib/pay/calculate";
import { formatDate, formatDuration, formatTime } from "@/lib/time/format";
import type { Shift, ShiftStatus } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STATUS_KEYS: Record<ShiftStatus, string> = {
  in_progress: "shift.status.in_progress",
  completed: "shift.status.completed",
  manual: "shift.status.manual",
  off: "shift.status.off",
  leave: "shift.status.leave",
};

const WORK_STATUSES: ShiftStatus[] = ["completed", "manual", "in_progress"];

const SHIFT_FORM_ID = "day-shift-form";

type SheetView = "choose" | "add" | "edit" | "pick";

type DayDetailSheetProps = {
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DayDetailSheet({ date, open, onOpenChange }: DayDetailSheetProps) {
  const { user } = useAuth();
  const t = useT();
  const { dateLocale } = useI18n();
  const { data: dayShifts = [], refetch: refetchDayShifts, isLoading: dayShiftsLoading } =
    useShiftsForDate(date, open);
  const { data: jobs = [] } = useJobs();
  const { data: settings } = useSettings();
  const invalidate = useInvalidatePayday();
  const [formKey, setFormKey] = useState(0);
  const [view, setView] = useState<SheetView>("add");
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formState, setFormState] = useState({
    isValid: false,
    loading: false,
    isEdit: false,
    isPerJob: false,
    isMonthlyPayout: false,
  });
  const initialViewSet = useRef(false);

  useEffect(() => {
    if (!open) {
      initialViewSet.current = false;
      setView("add");
      setEditingShift(null);
      return;
    }

    void refetchDayShifts();
  }, [open, date, refetchDayShifts]);

  const currency = settings?.currency ?? "KRW";
  const timeFormat = settings?.timeFormat ?? "24h";

  const workShifts = dayShifts.filter((s) => WORK_STATUSES.includes(s.status));
  const totalMinutes = workShifts.reduce((sum, s) => sum + s.workedMinutes, 0);
  const totalEarned = workShifts.reduce((sum, s) => sum + s.earnedAmount, 0);

  const isFormView = view === "add" || view === "edit";
  const canGoBack = view !== "choose" && workShifts.length > 0;

  useEffect(() => {
    if (!open || dayShiftsLoading || initialViewSet.current) return;
    setView(workShifts.length > 0 ? "choose" : "add");
    initialViewSet.current = true;
  }, [open, dayShiftsLoading, workShifts.length]);

  async function handleFormSuccess() {
    await invalidate();
    await refetchDayShifts();
    setFormKey((k) => k + 1);
    setEditingShift(null);
    setView("choose");
    initialViewSet.current = true;
  }

  function startEdit(shift: Shift) {
    setEditingShift(shift);
    setView("edit");
  }

  function handleChooseEdit() {
    if (workShifts.length === 1) {
      startEdit(workShifts[0]!);
      return;
    }
    setView("pick");
  }

  function handleBack() {
    setEditingShift(null);
    setView("choose");
  }

  async function handleDelete(shift: Shift, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!confirm(t("shift.deleteConfirm"))) return;
    await deleteShiftDb(shift.id);
    if (user) await syncUserData(user.uid);
    toast.success(t("shift.deleted"));
    await invalidate();
    await refetchDayShifts();
    if (workShifts.length <= 1) {
      setView("add");
      setEditingShift(null);
    }
  }

  function formatShiftTime(shift: Shift): string {
    if (shift.manualStart && shift.manualEnd) {
      return `${formatTime(shift.manualStart, timeFormat)} – ${formatTime(shift.manualEnd, timeFormat)}`;
    }
    const checkIn = shift.events.find((e) => e.type === "check_in");
    const checkOut = shift.events.find((e) => e.type === "check_out");
    if (checkIn && checkOut) {
      return `${formatTime(checkIn.timestamp, timeFormat)} – ${formatTime(checkOut.timestamp, timeFormat)}`;
    }
    if (checkIn) {
      return t("shift.fromTime", { time: formatTime(checkIn.timestamp, timeFormat) });
    }
    return "—";
  }

  function formatShiftSubtitle(shift: Shift, shiftJob?: (typeof jobs)[number]) {
    if (shift.isMonthlyPayout) {
      return shift.note ?? t("shift.monthSalaryNote", { month: shift.date.slice(0, 7) });
    }
    if (shiftJob?.payConfig.type === "per_job") {
      return shift.note || "—";
    }
    return `${formatShiftTime(shift)} · ${formatDuration(shift.workedMinutes)}`;
  }

  const sheetDescription = useMemo(() => {
    if (view === "add") return t("shift.formAddDesc");
    if (view === "edit")
      return formState.isPerJob
        ? t("shift.formEditTask")
        : formState.isMonthlyPayout
          ? t("shift.formEditMonth")
          : t("shift.formEditHours");
    if (view === "pick") return t("shift.pickShift");
    if (workShifts.length > 0) {
      return `${formatDuration(totalMinutes)} · ${formatCurrency(totalEarned, currency)}`;
    }
    return t("shift.formAddDesc");
  }, [view, workShifts.length, totalMinutes, totalEarned, currency, formState.isPerJob, formState.isMonthlyPayout, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden rounded-3xl border-0 p-0 shadow-2xl ring-1 ring-foreground/8 sm:max-w-[400px]">
        <DialogHeader className="shrink-0 space-y-0 border-b border-border px-5 pt-5 pr-14 pb-4">
          {canGoBack && (
            <button
              type="button"
              onClick={handleBack}
              className="mb-2 flex items-center gap-1 text-sm font-medium text-primary"
            >
              <ArrowLeft className="size-4" />
              {t("common.back")}
            </button>
          )}
          <p className="toss-label capitalize">{formatDate(date, "EEEE", dateLocale)}</p>
          <DialogTitle className="mt-0.5 text-[22px] font-bold tracking-tight">
            {formatDate(date, "dd MMMM yyyy", dateLocale)}
          </DialogTitle>
          <DialogDescription className="mt-1">{sheetDescription}</DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "flex-1 overflow-y-auto overscroll-contain px-5 py-4",
            isFormView && "pb-2"
          )}
        >
          {view === "choose" && workShifts.length > 0 && (
            <div className="space-y-4 page-enter">
              <div className="rounded-2xl bg-primary/[0.07] px-5 py-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">{t("shift.dayTotal")}</p>
                <p className="mt-1 text-[26px] font-bold tracking-tight text-primary tabular-nums">
                  {formatCurrency(totalEarned, currency)}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatDuration(totalMinutes)}
                </p>
              </div>

              <div className="space-y-2">
                <p className="px-1 text-[13px] font-semibold text-muted-foreground">
                  {t("shift.logged")} · {workShifts.length}
                  <span className="ml-1 font-normal">{t("shift.tapEdit")}</span>
                </p>
                <ListGroup>
                  {workShifts.map((shift) => {
                    const shiftJob = jobs.find((j) => j.id === shift.jobId);
                    return (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => startEdit(shift)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary/60"
                      >
                        <JobColorDot color={shiftJob?.color} className="size-2.5" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium">
                            {shiftJob?.name ?? t("shift.chooseJob")}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-sm text-muted-foreground">
                            {formatShiftSubtitle(shift, shiftJob)}
                          </p>
                          {shift.note && shiftJob?.payConfig.type !== "per_job" ? (
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">
                              {shift.note}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatCurrency(shift.earnedAmount, currency)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {t(STATUS_KEYS[shift.status])}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDelete(shift, e)}
                          aria-label={t("common.delete")}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </button>
                    );
                  })}
                </ListGroup>
              </div>

              {workShifts.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <Button className="h-12" onClick={handleChooseEdit}>
                    <Pencil />
                    {t("shift.editShift")}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12"
                    onClick={() => {
                      setEditingShift(null);
                      setView("add");
                    }}
                  >
                    <Plus />
                    {t("shift.addShift")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {view === "pick" && (
            <div className="space-y-2 page-enter">
              <p className="px-1 text-[13px] font-semibold text-muted-foreground">
                {t("shift.pickShift")}
              </p>
              <ListGroup>
                {workShifts.map((shift) => {
                  const shiftJob = jobs.find((j) => j.id === shift.jobId);
                  return (
                    <ListRow
                      key={shift.id}
                      icon={Briefcase}
                      title={shiftJob?.name ?? t("shift.chooseJob")}
                      subtitle={formatShiftSubtitle(shift, shiftJob)}
                      iconColor={shiftJob?.color}
                      onClick={() => startEdit(shift)}
                    />
                  );
                })}
              </ListGroup>
            </div>
          )}

          {isFormView && (
            <div className="page-enter">
              <ManualShiftForm
                key={`${date}-${formKey}-${editingShift?.id ?? "new"}`}
                formId={SHIFT_FORM_ID}
                hideSubmit
                date={date}
                shift={view === "edit" ? editingShift ?? undefined : undefined}
                onSuccess={handleFormSuccess}
                onFormStateChange={setFormState}
              />
            </div>
          )}

        </div>

        {isFormView && (
          <div className="shrink-0 border-t border-border bg-popover px-5 py-4">
            <Button
              type="submit"
              form={SHIFT_FORM_ID}
              className="h-12 w-full"
              disabled={formState.loading || !formState.isValid}
            >
              {formState.loading && <Loader2 className="animate-spin" />}
              {formState.isEdit
                ? formState.isPerJob
                  ? t("shift.updateTask")
                  : formState.isMonthlyPayout
                    ? t("shift.updateMonth")
                    : t("shift.update")
                : formState.isPerJob
                  ? t("shift.saveTask")
                  : formState.isMonthlyPayout
                    ? t("shift.saveMonth")
                    : t("shift.save")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
