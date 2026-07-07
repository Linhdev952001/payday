"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListGroup } from "@/components/ui/list-section";
import { JobColorDot } from "@/components/jobs/job-color-picker";
import { useAuth } from "@/contexts/auth-context";
import { useInvalidatePayday, useJobs } from "@/hooks/use-payday";
import { createJob } from "@/lib/db/repositories";
import { syncUserData } from "@/lib/firebase/sync";
import { pickAvailableJobColor } from "@/lib/color/job-colors";
import { DEFAULT_PAY_CONFIG } from "@/types";
import { cn } from "@/lib/utils";

type JobSelectorProps = {
  value?: string | null;
  onValueChange?: (jobId: string) => void;
  showLabel?: boolean;
  /** `card` = own ListGroup (dashboard). `rows` = rows only, for inside a parent ListGroup. */
  variant?: "card" | "rows";
};

function JobOptionRows({
  jobs,
  resolvedId,
  onSelect,
}: {
  jobs: { id: string; name: string; color?: string }[];
  resolvedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {jobs.map((job) => {
        const selected = job.id === resolvedId;
        return (
          <button
            key={job.id}
            type="button"
            onClick={() => onSelect(job.id)}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary/60",
              selected && "bg-primary/[0.04]"
            )}
          >
            <JobColorDot color={job.color} className="size-2.5" />
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[15px]",
                selected ? "font-semibold text-foreground" : "font-medium text-foreground/80"
              )}
            >
              {job.name}
            </span>
            {selected ? (
              <Check className="size-4 shrink-0 text-primary" strokeWidth={2.5} />
            ) : (
              <span className="size-4 shrink-0" aria-hidden />
            )}
          </button>
        );
      })}
    </>
  );
}

export function JobSelector({
  value,
  onValueChange,
  showLabel = true,
  variant = "card",
}: JobSelectorProps) {
  const { user } = useAuth();
  const { data: jobs = [], refetch } = useJobs();
  const invalidate = useInvalidatePayday();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const resolvedId = useMemo(() => {
    if (jobs.length === 0) return "";
    if (value && jobs.some((job) => job.id === value)) return value;
    return jobs[0]!.id;
  }, [jobs, value]);

  useEffect(() => {
    if (!resolvedId || resolvedId === value) return;
    onValueChange?.(resolvedId);
  }, [resolvedId, value, onValueChange]);

  async function handleQuickCreate() {
    if (!user || !newName.trim()) return;
    const nextColor = pickAvailableJobColor(jobs);
    if (!nextColor) {
      toast.error("Đã dùng hết màu. Đổi màu công việc khác trước.");
      return;
    }
    setLoading(true);
    try {
      const job = await createJob(user.uid, {
        name: newName.trim(),
        icon: "briefcase",
        color: nextColor,
        payConfig: DEFAULT_PAY_CONFIG,
      });
      await syncUserData(user.uid);
      invalidate();
      await refetch();
      onValueChange?.(job.id);
      setCreating(false);
      setNewName("");
      toast.success("Đã tạo công việc");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo");
    } finally {
      setLoading(false);
    }
  }

  if (jobs.length === 0 && !creating) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Chưa có công việc nào.</p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setCreating(true)}
        >
          <Plus />
          Tạo công việc
        </Button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="space-y-3">
        {showLabel && (
          <label className="text-sm font-medium text-muted-foreground">
            Tên công việc mới
          </label>
        )}
        <Input
          placeholder="VD: Lotte Mart, Quán ăn..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setCreating(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={loading || !newName.trim()}
            onClick={handleQuickCreate}
          >
            Tạo
          </Button>
        </div>
      </div>
    );
  }

  const rows = (
    <JobOptionRows
      jobs={jobs}
      resolvedId={resolvedId}
      onSelect={(id) => onValueChange?.(id)}
    />
  );

  if (variant === "rows") {
    return rows;
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <p className="px-1 text-[13px] font-semibold text-muted-foreground">Công việc</p>
      )}
      <ListGroup>{rows}</ListGroup>
    </div>
  );
}
