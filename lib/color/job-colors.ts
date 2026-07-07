import type { CSSProperties } from "react";

/** Toss-inspired preset palette for job / shift badges */
export const JOB_COLOR_PRESETS = [
  { id: "blue", label: "Xanh", value: "#3182f6" },
  { id: "green", label: "Xanh lá", value: "#16bb76" },
  { id: "teal", label: "Ngọc", value: "#2eaab2" },
  { id: "orange", label: "Cam", value: "#f18600" },
  { id: "purple", label: "Tím", value: "#ae3dd1" },
  { id: "red", label: "Đỏ", value: "#f04251" },
  { id: "yellow", label: "Vàng", value: "#ffb134" },
  { id: "grey", label: "Xám", value: "#7e7e87" },
] as const;

export const DEFAULT_JOB_COLOR = JOB_COLOR_PRESETS[0]!.value;

export function normalizeJobColor(color?: string | null) {
  if (!color) return DEFAULT_JOB_COLOR;
  const preset = JOB_COLOR_PRESETS.find((p) => p.value.toLowerCase() === color.toLowerCase());
  return preset?.value ?? color;
}

export function getJobBadgeStyle(color: string): CSSProperties {
  const hex = normalizeJobColor(color);
  return {
    backgroundColor: `color-mix(in srgb, ${hex} 16%, transparent)`,
    color: hex,
  };
}

export function jobColorMap(jobs: { id: string; color?: string }[]) {
  return new Map(jobs.map((job) => [job.id, normalizeJobColor(job.color)]));
}

export function getUsedJobColors(
  jobs: { id: string; color?: string }[],
  excludeJobId?: string
): string[] {
  return jobs
    .filter((j) => j.id !== excludeJobId)
    .map((j) => normalizeJobColor(j.color));
}

export function pickAvailableJobColor(
  jobs: { id: string; color?: string }[],
  excludeJobId?: string
): string | null {
  const used = new Set(
    getUsedJobColors(jobs, excludeJobId).map((c) => c.toLowerCase())
  );
  const preset = JOB_COLOR_PRESETS.find((p) => !used.has(p.value.toLowerCase()));
  return preset?.value ?? null;
}

export function isJobColorTaken(
  color: string,
  jobs: { id: string; color?: string }[],
  excludeJobId?: string
): boolean {
  const hex = normalizeJobColor(color).toLowerCase();
  return getUsedJobColors(jobs, excludeJobId).some((c) => c.toLowerCase() === hex);
}
