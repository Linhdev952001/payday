"use client";

import { JobColorDot } from "@/components/jobs/job-color-picker";
import { useT } from "@/contexts/i18n-context";
import { cn } from "@/lib/utils";

export type CalendarJobFilterValue = "all" | string;

type CalendarJobFilterProps = {
  jobs: { id: string; name: string; color?: string }[];
  value: CalendarJobFilterValue;
  onChange: (value: CalendarJobFilterValue) => void;
  className?: string;
};

export function CalendarJobFilter({
  jobs,
  value,
  onChange,
  className,
}: CalendarJobFilterProps) {
  const t = useT();

  return (
    <div
      className={cn(
        "flex gap-1.5 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
          value === "all"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground"
        )}
      >
        {t("calendar.allJobs")}
      </button>
      {jobs.map((job) => {
        const active = value === job.id;
        return (
          <button
            key={job.id}
            type="button"
            onClick={() => onChange(job.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <JobColorDot
              color={job.color}
              className={cn("size-2", active && "ring-1 ring-primary-foreground/40")}
            />
            <span className="max-w-[8rem] truncate">{job.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function filterShiftsByJob<T extends { jobId: string }>(
  shifts: T[],
  jobFilter: CalendarJobFilterValue
): T[] {
  if (jobFilter === "all") return shifts;
  return shifts.filter((s) => s.jobId === jobFilter);
}
