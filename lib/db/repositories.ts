import {
  createId,
  DEFAULT_PAY_CONFIG,
  nowIso,
  type ActiveSession,
  type Job,
  type Shift,
  type UserSettings,
} from "@/types";
import { detectDeviceLocale } from "@/lib/i18n/detect-locale";
import { getDb } from "./schema";

function markPending<T extends { pendingSync: boolean; updatedAt: string }>(
  entity: T
): T {
  return { ...entity, pendingSync: true, updatedAt: nowIso() };
}

// Jobs
export async function getJobs(userId: string): Promise<Job[]> {
  const jobs = await getDb()
    .jobs.where("userId")
    .equals(userId)
    .filter((j) => !j.deleted)
    .sortBy("createdAt");

  return jobs.sort((a, b) => {
    const aPinned = a.pinned ? 1 : 0;
    const bPinned = b.pinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** Includes soft-deleted rows — for sync merge only */
export async function getAllJobsForSync(userId: string): Promise<Job[]> {
  return getDb().jobs.where("userId").equals(userId).sortBy("createdAt");
}

export async function getJob(id: string): Promise<Job | undefined> {
  const job = await getDb().jobs.get(id);
  return job && !job.deleted ? job : undefined;
}

export async function saveJob(job: Job): Promise<Job> {
  const next = markPending(job);
  await getDb().jobs.put(next);
  return next;
}

export async function createJob(
  userId: string,
  data: Pick<Job, "name" | "icon" | "color" | "payConfig" | "location">
): Promise<Job> {
  const timestamp = nowIso();
  const job: Job = {
    id: createId(),
    userId,
    name: data.name,
    icon: data.icon,
    color: data.color,
    payConfig: data.payConfig,
    location: data.location,
    createdAt: timestamp,
    updatedAt: timestamp,
    pendingSync: true,
    deleted: false,
  };
  await getDb().jobs.put(job);
  return job;
}

export async function deleteJob(id: string): Promise<void> {
  const job = await getDb().jobs.get(id);
  if (!job) return;
  await saveJob({ ...job, deleted: true });

  const shifts = await getDb().shifts.where("jobId").equals(id).toArray();
  await Promise.all(
    shifts
      .filter((s) => !s.deleted)
      .map((s) => saveShift({ ...s, deleted: true }))
  );
}

// Shifts
export async function getShifts(userId: string): Promise<Shift[]> {
  return getDb()
    .shifts.where("userId")
    .equals(userId)
    .filter((s) => !s.deleted)
    .sortBy("date");
}

/** Includes soft-deleted rows — for sync merge only */
export async function getAllShiftsForSync(userId: string): Promise<Shift[]> {
  return getDb().shifts.where("userId").equals(userId).sortBy("date");
}

export async function getShiftsByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Shift[]> {
  const shifts = await getShifts(userId);
  return shifts.filter((s) => s.date >= startDate && s.date <= endDate);
}

export async function getShift(id: string): Promise<Shift | undefined> {
  const shift = await getDb().shifts.get(id);
  return shift && !shift.deleted ? shift : undefined;
}

export async function getShiftsByJob(userId: string, jobId: string): Promise<Shift[]> {
  const shifts = await getShifts(userId);
  return shifts.filter((s) => s.jobId === jobId);
}

export async function saveShift(shift: Shift): Promise<Shift> {
  const next = markPending(shift);
  await getDb().shifts.put(next);
  return next;
}

export async function createShift(
  data: Omit<Shift, "id" | "createdAt" | "updatedAt" | "pendingSync" | "deleted">
): Promise<Shift> {
  const timestamp = nowIso();
  const shift: Shift = {
    ...data,
    isMonthlyPayout: data.isMonthlyPayout ?? false,
    id: createId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    pendingSync: true,
    deleted: false,
  };
  await getDb().shifts.put(shift);
  return shift;
}

export async function deleteShift(id: string): Promise<void> {
  const shift = await getDb().shifts.get(id);
  if (!shift) return;
  await saveShift({ ...shift, deleted: true });
}

// Active session
export async function getActiveSession(
  userId: string
): Promise<ActiveSession | undefined> {
  return getDb().activeSessions.where("userId").equals(userId).first();
}

export async function saveActiveSession(
  session: ActiveSession
): Promise<ActiveSession> {
  const next = markPending(session);
  await getDb().activeSessions.put(next);
  return next;
}

export async function clearActiveSession(userId: string): Promise<void> {
  const session = await getActiveSession(userId);
  if (session) {
    await getDb().activeSessions.delete(session.id);
  }
}

// Settings
export async function getSettings(userId: string): Promise<UserSettings | undefined> {
  return getDb().settings.where("userId").equals(userId).first();
}

export async function getOrCreateSettings(userId: string): Promise<UserSettings> {
  const existing = await getSettings(userId);
  if (existing) return existing;

  const timestamp = nowIso();
  const settings: UserSettings = {
    id: "main",
    userId,
    currency: "KRW",
    timeFormat: "24h",
    weekStartDay: "monday",
    theme: "system",
    locale: detectDeviceLocale(),
    notifications: {
      logShiftReminder: true,
      logShiftTime: "21:00",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    pendingSync: true,
  };

  await getDb().settings.put(settings);
  return settings;
}

export async function saveSettings(settings: UserSettings): Promise<UserSettings> {
  const next = markPending(settings);
  await getDb().settings.put(next);
  return next;
}

export async function getPendingSyncEntities(userId: string) {
  const db = getDb();
  const [jobs, shifts, sessions, settings] = await Promise.all([
    db.jobs.where("userId").equals(userId).filter((j) => j.pendingSync).toArray(),
    db.shifts.where("userId").equals(userId).filter((s) => s.pendingSync).toArray(),
    db.activeSessions.where("userId").equals(userId).filter((s) => s.pendingSync).toArray(),
    db.settings.where("userId").equals(userId).filter((s) => s.pendingSync).toArray(),
  ]);
  return { jobs, shifts, sessions, settings };
}

export async function markSynced(
  table: "jobs" | "shifts" | "activeSessions" | "settings",
  id: string
): Promise<void> {
  const db = getDb();

  switch (table) {
    case "jobs": {
      const record = await db.jobs.get(id);
      if (record) await db.jobs.put({ ...record, pendingSync: false });
      break;
    }
    case "shifts": {
      const record = await db.shifts.get(id);
      if (record) await db.shifts.put({ ...record, pendingSync: false });
      break;
    }
    case "activeSessions": {
      const record = await db.activeSessions.get(id);
      if (record) await db.activeSessions.put({ ...record, pendingSync: false });
      break;
    }
    case "settings": {
      const record = await db.settings.get(id);
      if (record) await db.settings.put({ ...record, pendingSync: false });
      break;
    }
  }
}

export async function seedDefaultJob(userId: string): Promise<Job> {
  const jobs = await getJobs(userId);
  if (jobs.length > 0) return jobs[0]!;

  return createJob(userId, {
    name: "Công việc chính",
    icon: "briefcase",
    color: "#6366f1",
    payConfig: DEFAULT_PAY_CONFIG,
  });
}

export async function exportAllData(userId: string) {
  const [jobs, shifts, settings, activeSession] = await Promise.all([
    getJobs(userId),
    getShifts(userId),
    getOrCreateSettings(userId),
    getActiveSession(userId),
  ]);

  return {
    exportedAt: nowIso(),
    userId,
    jobs,
    shifts,
    settings,
    activeSession: activeSession ?? null,
  };
}

export async function importAllData(
  userId: string,
  data: {
    jobs?: Job[];
    shifts?: Shift[];
    settings?: UserSettings;
    activeSession?: ActiveSession | null;
  },
  replace = false
): Promise<void> {
  const db = getDb();

  if (replace) {
    await db.transaction("rw", db.jobs, db.shifts, db.settings, db.activeSessions, async () => {
      const existingJobs = await db.jobs.where("userId").equals(userId).toArray();
      const existingShifts = await db.shifts.where("userId").equals(userId).toArray();
      await Promise.all(existingJobs.map((j) => db.jobs.delete(j.id)));
      await Promise.all(existingShifts.map((s) => db.shifts.delete(s.id)));
      await db.settings.where("userId").equals(userId).delete();
      await db.activeSessions.where("userId").equals(userId).delete();
    });
  }

  if (data.jobs) {
    await Promise.all(data.jobs.map((j) => db.jobs.put({ ...j, userId, pendingSync: true })));
  }
  if (data.shifts) {
    await Promise.all(data.shifts.map((s) => db.shifts.put({ ...s, userId, pendingSync: true })));
  }
  if (data.settings) {
    await db.settings.put({ ...data.settings, userId, pendingSync: true });
  }
  if (data.activeSession) {
    await db.activeSessions.put({ ...data.activeSession, userId, pendingSync: true });
  }
}
