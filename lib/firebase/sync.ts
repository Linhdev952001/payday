import { FirebaseError } from "firebase/app";
import { onAuthStateChanged } from "firebase/auth";
import {
  getAllJobsForSync,
  getAllShiftsForSync,
  getOrCreateSettings,
  getPendingSyncEntities,
  markSynced,
} from "@/lib/db/repositories";
import { getDb } from "@/lib/db/schema";
import { getFirebaseAuth } from "@/lib/firebase/client";
import {
  pullActiveSessionFromFirestore,
  pullJobsFromFirestore,
  pullSettingsFromFirestore,
  pullShiftsFromFirestore,
  pushActiveSessionToFirestore,
  pushJobToFirestore,
  pushSettingsToFirestore,
  pushShiftToFirestore,
} from "@/lib/firebase/firestore";
import type { ActiveSession, Job, Shift, UserSettings } from "@/types";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export type SyncErrorInfo = {
  code: string;
  message: string;
} | null;

let lastSyncError: SyncErrorInfo = null;

export function getLastSyncError(): SyncErrorInfo {
  return lastSyncError;
}

function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function waitForAuthUser(expectedUserId: string): Promise<boolean> {
  const auth = getFirebaseAuth();

  if (auth.currentUser?.uid === expectedUserId) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.uid === expectedUserId) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(true);
      }
    });
  });
}

function mergeByUpdatedAt<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[]
): T[] {
  const map = new Map<string, T>();

  for (const item of local) {
    map.set(item.id, item);
  }

  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing || item.updatedAt >= existing.updatedAt) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

function mapSyncError(error: unknown): NonNullable<SyncErrorInfo> {
  if (error instanceof FirebaseError) {
    const messages: Record<string, string> = {
      "permission-denied":
        "Chưa có quyền Firestore. Bật Firestore và deploy security rules trong Firebase Console.",
      "unavailable":
        "Firestore tạm thời không khả dụng. Dữ liệu vẫn lưu trên máy.",
      "not-found":
        "Firestore chưa được tạo. Vào Firebase Console → Firestore → Create database.",
      "failed-precondition":
        "Cấu hình Firestore chưa đúng. Kiểm tra Firebase project.",
    };

    return {
      code: error.code,
      message: messages[error.code] ?? error.message,
    };
  }

  if (error instanceof Error) {
    return { code: "unknown", message: error.message };
  }

  return { code: "unknown", message: "Không thể đồng bộ với Firebase." };
}

async function pushPending(userId: string): Promise<void> {
  const pending = await getPendingSyncEntities(userId);

  for (const job of pending.jobs) {
    await pushJobToFirestore(job);
    await markSynced("jobs", job.id);
  }

  for (const shift of pending.shifts) {
    await pushShiftToFirestore(shift);
    await markSynced("shifts", shift.id);
  }

  for (const session of pending.sessions) {
    await pushActiveSessionToFirestore(session);
    await markSynced("activeSessions", session.id);
  }

  for (const settings of pending.settings) {
    await pushSettingsToFirestore(settings);
    await markSynced("settings", settings.id);
  }
}

async function putLocalWithoutPendingSync(
  table: "jobs" | "shifts" | "activeSessions" | "settings",
  record: Job | Shift | ActiveSession | UserSettings
): Promise<void> {
  const db = getDb();
  const synced = { ...record, pendingSync: false };

  switch (table) {
    case "jobs":
      await db.jobs.put(synced as Job);
      break;
    case "shifts":
      await db.shifts.put(synced as Shift);
      break;
    case "activeSessions":
      await db.activeSessions.put(synced as ActiveSession);
      break;
    case "settings":
      await db.settings.put(synced as UserSettings);
      break;
  }
}

async function pullRemote(userId: string): Promise<void> {
  const [remoteJobs, remoteShifts, remoteSettings, remoteSession] =
    await Promise.all([
      pullJobsFromFirestore(userId),
      pullShiftsFromFirestore(userId),
      pullSettingsFromFirestore(userId),
      pullActiveSessionFromFirestore(userId),
    ]);

  const [localJobs, localShifts, localSettings] = await Promise.all([
    getAllJobsForSync(userId),
    getAllShiftsForSync(userId),
    getOrCreateSettings(userId),
  ]);

  const mergedJobs = mergeByUpdatedAt(localJobs, remoteJobs);
  const mergedShifts = mergeByUpdatedAt(localShifts, remoteShifts);

  await Promise.all(
    mergedJobs.map((job: Job) => putLocalWithoutPendingSync("jobs", job))
  );
  await Promise.all(
    mergedShifts.map((shift: Shift) => putLocalWithoutPendingSync("shifts", shift))
  );

  if (remoteSettings) {
    const settings: UserSettings =
      !localSettings || remoteSettings.updatedAt >= localSettings.updatedAt
        ? remoteSettings
        : localSettings;
    await putLocalWithoutPendingSync("settings", settings);
  }

  if (remoteSession) {
    await putLocalWithoutPendingSync("activeSessions", remoteSession);
  }
}

export async function syncUserData(userId: string): Promise<SyncStatus> {
  if (!isOnline()) {
    lastSyncError = null;
    return "offline";
  }

  const authed = await waitForAuthUser(userId);
  if (!authed) {
    lastSyncError = {
      code: "auth/not-ready",
      message: "Đang chờ xác thực Firebase...",
    };
    return "error";
  }

  try {
    await pushPending(userId);
    await pullRemote(userId);
    lastSyncError = null;
    return "idle";
  } catch (error) {
    const syncError = mapSyncError(error);
    lastSyncError = syncError;
    console.error("[payday sync]", syncError.code, syncError.message, error);
    return "error";
  }
}

let syncListeners: Array<(status: SyncStatus) => void> = [];

export function subscribeSyncStatus(listener: (status: SyncStatus) => void) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

function notifySyncStatus(status: SyncStatus) {
  syncListeners.forEach((l) => l(status));
}

export function startSyncEngine(userId: string) {
  const run = async () => {
    notifySyncStatus("syncing");
    const status = await syncUserData(userId);
    notifySyncStatus(status);
  };

  void run();

  const onOnline = () => void run();
  window.addEventListener("online", onOnline);

  const interval = setInterval(() => {
    if (isOnline()) void run();
  }, 30000);

  return () => {
    window.removeEventListener("online", onOnline);
    clearInterval(interval);
  };
}

export async function retrySync(userId: string): Promise<SyncStatus> {
  return syncUserData(userId);
}
