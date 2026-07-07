"use client";

import {
  createShift,
  deleteShift,
  getActiveSession,
  getOrCreateSettings,
  getShift,
  getShifts,
  getShiftsByDateRange,
  saveActiveSession,
  saveShift,
  seedDefaultJob,
  clearActiveSession,
  getJobs,
} from "@/lib/db/repositories";
import { calculatePay } from "@/lib/pay/calculate";
import {
  calculateWorkedMinutesFromEvents,
  calculateWorkedMinutesFromManual,
} from "@/lib/time/calculate";
import { combineDateAndTime, combineShiftTimes } from "@/lib/time/format";
import { syncUserData } from "@/lib/firebase/sync";
import {
  createId,
  nowIso,
  todayDateString,
  type ActiveSession,
  type Job,
  type Shift,
  type TimeEvent,
  type TimeEventType,
} from "@/types";

export async function initializeUserData(userId: string) {
  await getOrCreateSettings(userId);
  const job = await seedDefaultJob(userId);
  return job;
}

export async function loadActiveSessionState(userId: string) {
  const session = await getActiveSession(userId);
  if (!session) return { session: null, events: [] as TimeEvent[] };

  const shift = await getShift(session.shiftId);
  return { session, events: shift?.events ?? [] };
}

async function appendEvent(
  userId: string,
  type: TimeEventType
): Promise<{ session: ActiveSession; shift: Shift }> {
  const timestamp = nowIso();
  let session = await getActiveSession(userId);
  let shift: Shift;

  if (type === "check_in") {
    const date = todayDateString();
    shift = await createShift({
      userId,
      jobId: session?.jobId ?? "",
      date,
      status: "in_progress",
      events: [{ type, timestamp }],
      breakMinutes: 0,
      workedMinutes: 0,
      earnedAmount: 0,
      isOvertime: false,
    });

    session = {
      id: createId(),
      userId,
      jobId: shift.jobId,
      shiftId: shift.id,
      status: "working",
      startedAt: timestamp,
      updatedAt: timestamp,
      pendingSync: true,
    };
    await saveActiveSession(session);
    await syncUserData(userId);
    return { session, shift };
  }

  if (!session) throw new Error("Không có ca đang hoạt động.");

  shift = (await getShift(session.shiftId))!;
  const events = [...shift.events, { type, timestamp }];

  let status: ActiveSession["status"] = session.status;
  if (type === "break_start") status = "on_break";
  if (type === "break_end") status = "working";

  if (type === "check_out") {
    const jobs = await getJobs(userId);
    const job = jobs.find((j) => j.id === shift.jobId);
    const workedMinutes = calculateWorkedMinutesFromEvents(events, shift.breakMinutes);
    const earnedAmount = job
      ? calculatePay(workedMinutes, job.payConfig, shift.date, shift.isOvertime)
      : 0;

    shift = await saveShift({
      ...shift,
      events,
      status: "completed",
      workedMinutes,
      earnedAmount,
    });

    await clearActiveSession(userId);
    await syncUserData(userId);
    return {
      session: { ...session, status: "idle", updatedAt: timestamp },
      shift,
    };
  }

  shift = await saveShift({ ...shift, events, status: "in_progress" });
  session = await saveActiveSession({ ...session, status, updatedAt: timestamp });
  await syncUserData(userId);
  return { session, shift };
}

export async function checkIn(userId: string, jobId: string) {
  const existing = await getActiveSession(userId);
  if (existing) throw new Error("Bạn đang trong một ca làm việc.");

  const session: ActiveSession = {
    id: createId(),
    userId,
    jobId,
    shiftId: "",
    status: "working",
    updatedAt: nowIso(),
    pendingSync: true,
  };

  await saveActiveSession(session);

  const date = todayDateString();
  const shift = await createShift({
    userId,
    jobId,
    date,
    status: "in_progress",
    events: [{ type: "check_in", timestamp: nowIso() }],
    breakMinutes: 0,
    workedMinutes: 0,
    earnedAmount: 0,
    isOvertime: false,
  });

  const nextSession = await saveActiveSession({
    ...session,
    shiftId: shift.id,
    startedAt: nowIso(),
  });

  await syncUserData(userId);
  return { session: nextSession, shift };
}

export async function checkOut(userId: string) {
  return appendEvent(userId, "check_out");
}

export async function startBreak(userId: string) {
  return appendEvent(userId, "break_start");
}

export async function resumeWork(userId: string) {
  return appendEvent(userId, "break_end");
}

async function clearDayMarkers(userId: string, date: string) {
  const existing = await getShiftsByDateRange(userId, date, date);
  await Promise.all(
    existing
      .filter((s) => s.status === "off" || s.status === "leave")
      .map((s) => deleteShift(s.id))
  );
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

async function findMonthlyPayout(
  userId: string,
  jobId: string,
  date: string,
  excludeShiftId?: string
) {
  const month = monthKey(date);
  const shifts = await getShifts(userId);
  return shifts.find(
    (s) =>
      s.jobId === jobId &&
      s.isMonthlyPayout &&
      monthKey(s.date) === month &&
      s.id !== excludeShiftId
  );
}

export async function createManualShift(
  userId: string,
  data: {
    jobId: string;
    date: string;
    startTime?: string;
    endTime?: string;
    taskName?: string;
    breakMinutes: number;
    note?: string;
    location?: string;
    isOvertime?: boolean;
    earnedAmount?: number;
    monthlyPayout?: boolean;
  },
  job: Job
): Promise<Shift> {
  await clearDayMarkers(userId, data.date);

  if (job.payConfig.type === "monthly" && data.monthlyPayout) {
    const duplicate = await findMonthlyPayout(userId, data.jobId, data.date);
    if (duplicate) {
      throw new Error("Đã chốt lương tháng này cho công việc này.");
    }

    const amount = data.earnedAmount ?? job.payConfig.monthlyRate ?? 0;
    if (amount <= 0) throw new Error("Nhập lương tháng.");

    const month = monthKey(data.date);
    const shift = await createShift({
      userId,
      jobId: data.jobId,
      date: data.date,
      status: "manual",
      events: [],
      breakMinutes: 0,
      note: data.note ?? `Lương tháng ${month}`,
      location: data.location,
      workedMinutes: 0,
      earnedAmount: Math.round(amount),
      isOvertime: false,
      isMonthlyPayout: true,
    });

    await syncUserData(userId);
    return shift;
  }

  if (job.payConfig.type === "per_job") {
    const taskName = data.taskName?.trim();
    if (!taskName) throw new Error("Nhập tên việc.");
    if (data.earnedAmount == null || data.earnedAmount < 0) {
      throw new Error("Nhập tiền việc.");
    }

    const earnedAmount = calculatePay(
      0,
      job.payConfig,
      data.date,
      data.isOvertime ?? false,
      data.earnedAmount
    );

    const shift = await createShift({
      userId,
      jobId: data.jobId,
      date: data.date,
      status: "manual",
      events: [],
      breakMinutes: 0,
      note: taskName,
      location: data.location,
      workedMinutes: 0,
      earnedAmount,
      isOvertime: data.isOvertime ?? false,
    });

    await syncUserData(userId);
    return shift;
  }

  if (!data.startTime || !data.endTime) {
    throw new Error("Nhập giờ bắt đầu và kết thúc.");
  }

  const { startIso, endIso } = combineShiftTimes(
    data.date,
    data.startTime,
    data.endTime
  );

  if (startIso >= endIso) {
    throw new Error("Giờ kết thúc phải sau giờ bắt đầu.");
  }

  const existing = await getShiftsByDateRange(userId, data.date, data.date);
  const overlap = existing.some(
    (s) =>
      s.jobId === data.jobId &&
      s.status !== "off" &&
      ((s.manualStart && s.manualEnd && startIso < s.manualEnd && endIso > s.manualStart) ||
        s.events.length > 0)
  );
  if (overlap) {
    throw new Error("Ca làm bị trùng với ca đã có trong ngày.");
  }
  const workedMinutes = calculateWorkedMinutesFromManual(
    startIso,
    endIso,
    data.breakMinutes
  );

  const earnedAmount = calculatePay(
    workedMinutes,
    job.payConfig,
    data.date,
    data.isOvertime ?? false
  );

  const shift = await createShift({
    userId,
    jobId: data.jobId,
    date: data.date,
    status: "manual",
    events: [],
    manualStart: startIso,
    manualEnd: endIso,
    breakMinutes: data.breakMinutes,
    note: data.note,
    location: data.location,
    workedMinutes,
    earnedAmount,
    isOvertime: data.isOvertime ?? false,
  });

  await syncUserData(userId);
  return shift;
}

export async function markDayStatus(
  userId: string,
  date: string,
  status: "off" | "leave",
  jobId: string,
  note?: string
): Promise<Shift> {
  const existing = await getShiftsByDateRange(userId, date, date);
  const marker = existing.find((s) => s.status === status);
  if (marker) {
    throw new Error(
      status === "off" ? "Ngày này đã được đánh dấu nghỉ." : "Ngày này đã được đánh dấu nghỉ phép."
    );
  }

  const hasWork = existing.some(
    (s) => s.status === "completed" || s.status === "manual" || s.status === "in_progress"
  );
  if (hasWork) {
    throw new Error("Ngày này đã có ca làm. Không thể đánh dấu nghỉ.");
  }

  const shift = await createShift({
    userId,
    jobId,
    date,
    status,
    events: [],
    breakMinutes: 0,
    note,
    workedMinutes: 0,
    earnedAmount: 0,
    isOvertime: false,
  });

  await syncUserData(userId);
  return shift;
}

export async function updateShift(
  shift: Shift,
  job: Job,
  updates: Partial<Shift>
): Promise<Shift> {
  const next: Shift = { ...shift, ...updates };

  if (next.isMonthlyPayout) {
    const duplicate = await findMonthlyPayout(
      shift.userId,
      next.jobId,
      next.date,
      shift.id
    );
    if (duplicate) {
      throw new Error("Đã chốt lương tháng này cho công việc này.");
    }
    next.workedMinutes = 0;
    delete next.manualStart;
    delete next.manualEnd;
    if (updates.earnedAmount !== undefined) {
      next.earnedAmount = Math.round(updates.earnedAmount);
    }
  } else if (job.payConfig.type === "per_job") {
    next.workedMinutes = 0;
    delete next.manualStart;
    delete next.manualEnd;
    if (updates.earnedAmount !== undefined) {
      next.earnedAmount = calculatePay(
        0,
        job.payConfig,
        next.date,
        next.isOvertime,
        updates.earnedAmount
      );
    }
  } else if (next.manualStart && next.manualEnd) {
    next.workedMinutes = calculateWorkedMinutesFromManual(
      next.manualStart,
      next.manualEnd,
      next.breakMinutes
    );
    next.earnedAmount = calculatePay(
      next.workedMinutes,
      job.payConfig,
      next.date,
      next.isOvertime
    );
  } else if (next.events.length > 0) {
    next.workedMinutes = calculateWorkedMinutesFromEvents(
      next.events,
      next.breakMinutes
    );
    next.earnedAmount = calculatePay(
      next.workedMinutes,
      job.payConfig,
      next.date,
      next.isOvertime
    );
  }

  const saved = await saveShift(next);
  await syncUserData(shift.userId);
  return saved;
}

export async function getDashboardStats(userId: string, job?: Job | null) {
  const today = todayDateString();
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = today;

  const shifts = await getShiftsByDateRange(userId, monthStart, monthEnd);
  const todayShifts = shifts.filter((s) => s.date === today && s.status !== "off");

  const todayMinutes = todayShifts.reduce((sum, s) => sum + s.workedMinutes, 0);
  const todayEarned = todayShifts.reduce((sum, s) => sum + s.earnedAmount, 0);
  const monthMinutes = shifts
    .filter((s) => s.status === "completed" || s.status === "manual")
    .reduce((sum, s) => sum + s.workedMinutes, 0);
  const monthEarned = shifts
    .filter((s) => s.status === "completed" || s.status === "manual")
    .reduce((sum, s) => sum + s.earnedAmount, 0);

  const session = await getActiveSession(userId);
  let liveMinutes = todayMinutes;
  let liveEarned = todayEarned;

  if (session && job) {
    const shift = await getShift(session.shiftId);
    if (shift) {
      const activeMinutes = calculateWorkedMinutesFromEvents(
        shift.events,
        shift.breakMinutes
      );
      const completedToday = todayShifts
        .filter((s) => s.id !== shift.id)
        .reduce((sum, s) => sum + s.workedMinutes, 0);
      const completedEarned = todayShifts
        .filter((s) => s.id !== shift.id)
        .reduce((sum, s) => sum + s.earnedAmount, 0);
      liveMinutes = completedToday + activeMinutes;
      liveEarned =
        completedEarned +
        calculatePay(activeMinutes, job.payConfig, shift.date, shift.isOvertime);
    }
  }

  return {
    todayMinutes: liveMinutes,
    todayEarned: liveEarned,
    monthMinutes,
    monthEarned,
    session,
  };
}
