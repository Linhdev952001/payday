import { z } from "zod";

export const timeEventTypeSchema = z.enum([
  "check_in",
  "break_start",
  "break_end",
  "check_out",
]);

export const shiftStatusSchema = z.enum([
  "in_progress",
  "completed",
  "manual",
  "off",
  "leave",
]);

export const payConfigTypeSchema = z.enum([
  "hourly",
  "daily",
  "monthly",
  "per_job",
  "tiered",
]);

export const activeSessionStatusSchema = z.enum(["idle", "working", "on_break"]);

export const currencySchema = z.enum(["KRW", "VND", "USD"]);

export const localeSchema = z.enum(["vi", "en", "ko"]);

export const timeFormatSchema = z.enum(["24h", "12h"]);

export const weekStartDaySchema = z.enum([
  "monday",
  "sunday",
  "saturday",
]);

export const payConfigSchema = z.object({
  type: payConfigTypeSchema,
  hourlyRate: z.number().min(0).optional(),
  dailyRate: z.number().min(0).optional(),
  monthlyRate: z.number().min(0).optional(),
  weekdayRate: z.number().min(0).optional(),
  weekendRate: z.number().min(0).optional(),
  overtimeRate: z.number().min(0).optional(),
  otMultiplier: z.number().min(1).optional(),
  mealAllowance: z.number().min(0).optional(),
  transportAllowance: z.number().min(0).optional(),
});

export const timeEventSchema = z.object({
  type: timeEventTypeSchema,
  timestamp: z.string(),
});

export const jobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1),
  icon: z.string().default("briefcase"),
  color: z.string().default("#6366f1"),
  payConfig: payConfigSchema,
  location: z.string().optional(),
  pinned: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pendingSync: z.boolean().default(true),
  deleted: z.boolean().default(false),
});

export const shiftSchema = z.object({
  id: z.string(),
  userId: z.string(),
  jobId: z.string(),
  date: z.string(),
  status: shiftStatusSchema,
  events: z.array(timeEventSchema).default([]),
  manualStart: z.string().optional(),
  manualEnd: z.string().optional(),
  breakMinutes: z.number().min(0).default(0),
  note: z.string().optional(),
  location: z.string().optional(),
  workedMinutes: z.number().min(0).default(0),
  earnedAmount: z.number().min(0).default(0),
  isOvertime: z.boolean().default(false),
  isMonthlyPayout: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pendingSync: z.boolean().default(true),
  deleted: z.boolean().default(false),
});

export const activeSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  jobId: z.string(),
  shiftId: z.string(),
  status: activeSessionStatusSchema,
  startedAt: z.string().optional(),
  updatedAt: z.string(),
  pendingSync: z.boolean().default(true),
});

export const notificationSettingsSchema = z.object({
  logShiftReminder: z.boolean().default(true),
  logShiftTime: z.string().default("21:00"),
});

/** ponytail: map legacy check-in/out settings on read */
export function resolveNotificationSettings(
  raw?: Partial<NotificationSettings> & {
    checkInReminder?: boolean;
    checkOutReminder?: boolean;
    checkInTime?: string;
    checkOutTime?: string;
  }
): NotificationSettings {
  if (raw && "logShiftReminder" in raw) {
    return {
      logShiftReminder: raw.logShiftReminder ?? true,
      logShiftTime: raw.logShiftTime ?? "21:00",
    };
  }
  return {
    logShiftReminder: raw?.checkOutReminder ?? true,
    logShiftTime: raw?.checkOutTime ?? "21:00",
  };
}

export const userSettingsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  currency: currencySchema.default("KRW"),
  timeFormat: timeFormatSchema.default("24h"),
  weekStartDay: weekStartDaySchema.default("monday"),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  locale: localeSchema.default("vi"),
  defaultJobId: z.string().optional(),
  incomeGoal: z.number().min(0).optional(),
  notifications: notificationSettingsSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pendingSync: z.boolean().default(true),
});

export type TimeEventType = z.infer<typeof timeEventTypeSchema>;
export type ShiftStatus = z.infer<typeof shiftStatusSchema>;
export type PayConfigType = z.infer<typeof payConfigTypeSchema>;
export type ActiveSessionStatus = z.infer<typeof activeSessionStatusSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type Locale = z.infer<typeof localeSchema>;
export type TimeFormat = z.infer<typeof timeFormatSchema>;
export type WeekStartDay = z.infer<typeof weekStartDaySchema>;
export type PayConfig = z.infer<typeof payConfigSchema>;
export type TimeEvent = z.infer<typeof timeEventSchema>;
export type Job = z.infer<typeof jobSchema>;
export type Shift = z.infer<typeof shiftSchema>;
export type ActiveSession = z.infer<typeof activeSessionSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;

export type SyncEntity = Job | Shift | ActiveSession | UserSettings;

export const DEFAULT_PAY_CONFIG: PayConfig = {
  type: "hourly",
  hourlyRate: 12000,
  weekdayRate: 12000,
  weekendRate: 14000,
  overtimeRate: 18000,
  otMultiplier: 1.5,
};

export function createId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
