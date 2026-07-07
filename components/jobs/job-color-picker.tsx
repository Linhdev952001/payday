"use client";

import { cn } from "@/lib/utils";
import {
  DEFAULT_JOB_COLOR,
  JOB_COLOR_PRESETS,
  normalizeJobColor,
} from "@/lib/color/job-colors";

type JobColorPickerProps = {
  value?: string;
  onChange: (color: string) => void;
  /** Normalized hex values already used by other jobs */
  usedColors?: string[];
  className?: string;
};

export function JobColorPicker({
  value,
  onChange,
  usedColors = [],
  className,
}: JobColorPickerProps) {
  const selected = normalizeJobColor(value ?? DEFAULT_JOB_COLOR);
  const usedSet = new Set(usedColors.map((c) => normalizeJobColor(c).toLowerCase()));

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-muted-foreground">Màu trên lịch</p>
      <div className="flex flex-wrap gap-2.5">
        {JOB_COLOR_PRESETS.map((preset) => {
          const active = selected === preset.value;
          const taken =
            usedSet.has(preset.value.toLowerCase()) && !active;
          return (
            <button
              key={preset.id}
              type="button"
              title={taken ? `${preset.label} — đã dùng` : preset.label}
              aria-label={preset.label}
              aria-pressed={active}
              disabled={taken}
              onClick={() => onChange(preset.value)}
              className={cn(
                "relative size-9 rounded-full transition-transform",
                active && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                taken
                  ? "cursor-not-allowed opacity-30"
                  : "active:scale-95"
              )}
              style={{ backgroundColor: preset.value }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function JobColorDot({
  color,
  className,
}: {
  color?: string;
  className?: string;
}) {
  const hex = normalizeJobColor(color);
  return (
    <span
      className={cn("inline-block size-3 shrink-0 rounded-full", className)}
      style={{ backgroundColor: hex }}
      aria-hidden
    />
  );
}
