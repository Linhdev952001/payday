import Dexie, { type Table } from "dexie";
import type { ActiveSession, Job, Shift, UserSettings } from "@/types";

export class PaydayDatabase extends Dexie {
  jobs!: Table<Job, string>;
  shifts!: Table<Shift, string>;
  activeSessions!: Table<ActiveSession, string>;
  settings!: Table<UserSettings, string>;

  constructor() {
    super("payday");

    this.version(1).stores({
      jobs: "id, userId, updatedAt, pendingSync, deleted",
      shifts: "id, userId, jobId, date, updatedAt, pendingSync, deleted",
      activeSessions: "id, userId, updatedAt, pendingSync",
      settings: "id, userId, updatedAt, pendingSync",
    });
  }
}

let dbInstance: PaydayDatabase | null = null;

export function getDb(): PaydayDatabase {
  if (typeof window === "undefined") {
    throw new Error("Dexie is only available in the browser.");
  }

  if (!dbInstance) {
    dbInstance = new PaydayDatabase();
  }

  return dbInstance;
}
