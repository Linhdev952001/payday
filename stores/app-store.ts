import { create } from "zustand";
import type { SyncErrorInfo, SyncStatus } from "@/lib/firebase/sync";
import type { ActiveSession, Job } from "@/types";

type AppStore = {
  selectedJobId: string | null;
  syncStatus: SyncStatus;
  syncError: SyncErrorInfo;
  setSelectedJobId: (id: string | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setSyncError: (error: SyncErrorInfo) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  selectedJobId: null,
  syncStatus: "idle",
  syncError: null,
  setSelectedJobId: (id) => set({ selectedJobId: id }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setSyncError: (error) => set({ syncError: error }),
}));

type ActiveSessionStore = {
  session: ActiveSession | null;
  currentShiftEvents: import("@/types").TimeEvent[];
  setSession: (session: ActiveSession | null) => void;
  setCurrentShiftEvents: (events: import("@/types").TimeEvent[]) => void;
};

export const useActiveSessionStore = create<ActiveSessionStore>((set) => ({
  session: null,
  currentShiftEvents: [],
  setSession: (session) => set({ session }),
  setCurrentShiftEvents: (events) => set({ currentShiftEvents: events }),
}));

export function getSelectedJob(jobs: Job[], selectedJobId: string | null): Job | null {
  if (jobs.length === 0) return null;
  if (selectedJobId) {
    return jobs.find((j) => j.id === selectedJobId) ?? jobs[0]!;
  }
  return jobs[0]!;
}
