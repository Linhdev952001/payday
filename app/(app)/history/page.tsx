"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Search, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useT } from "@/contexts/i18n-context";
import { useInvalidatePayday, useJobs, useSettings, useShifts } from "@/hooks/use-payday";
import { formatCurrency } from "@/lib/pay/calculate";
import { deleteShift as deleteShiftDb } from "@/lib/db/repositories";
import { syncUserData } from "@/lib/firebase/sync";
import { updateShift } from "@/lib/services/shift-service";
import { formatDate, formatDuration } from "@/lib/time/format";
import type { Shift } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  EmptyState,
  ListGroup,
  ListRow,
  PageHeader,
} from "@/components/ui/list-section";

export default function HistoryPage() {
  const { user } = useAuth();
  const t = useT();
  const { data: shifts = [] } = useShifts();
  const { data: jobs = [] } = useJobs();
  const { data: settings } = useSettings();
  const invalidate = useInvalidatePayday();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Shift | null>(null);
  const [note, setNote] = useState("");

  const currency = settings?.currency ?? "KRW";

  const filtered = useMemo(() => {
    const completed = shifts
      .filter((s) => s.status === "completed" || s.status === "manual")
      .sort((a, b) => b.date.localeCompare(a.date));

    if (!query.trim()) return completed;

    const q = query.toLowerCase();
    return completed.filter(
      (s) =>
        s.date.includes(q) ||
        s.note?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q)
    );
  }, [shifts, query]);

  async function handleDelete(shift: Shift) {
    if (!confirm(t("history.deleteConfirm"))) return;
    await deleteShiftDb(shift.id);
    if (user) await syncUserData(user.uid);
    toast.success(t("history.deleted"));
    await invalidate();
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const job = jobs.find((j) => j.id === editing.jobId);
    if (!job) return;
    await updateShift(editing, job, { note });
    toast.success(t("history.updated"));
    setEditing(null);
    invalidate();
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t("history.eyebrow")} title={t("history.title")} />

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-11"
          placeholder={t("history.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t("history.empty")}
          description={t("history.emptyDesc")}
          action={
            <Button render={<Link href="/shifts/new" />}>
              {t("history.firstShift")}
            </Button>
          }
        />
      ) : (
        <ListGroup>
          {filtered.map((shift) => {
            const job = jobs.find((j) => j.id === shift.jobId);
            const subtitle =
              job?.payConfig.type === "per_job"
                ? `${job.name} · ${shift.note || "—"}`
                : `${job?.name ?? "—"} · ${shift.isMonthlyPayout ? shift.note ?? t("history.monthSalary") : formatDuration(shift.workedMinutes)}`;
            return (
              <ListRow
                key={shift.id}
                title={formatDate(shift.date)}
                subtitle={subtitle}
                trailing={
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold tabular-nums text-primary">
                      {formatCurrency(shift.earnedAmount, currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditing(shift);
                        setNote(shift.note ?? "");
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleDelete(shift);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                }
              />
            );
          })}
        </ListGroup>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("history.editNote")}</DialogTitle>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          <Button onClick={handleSaveEdit}>{t("common.save")}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
