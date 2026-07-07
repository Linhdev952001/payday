"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  getJobs,
  getOrCreateSettings,
  getShifts,
  getShiftsByDateRange,
} from "@/lib/db/repositories";
import { startSyncEngine, subscribeSyncStatus, getLastSyncError } from "@/lib/firebase/sync";
import {
  getDashboardStats,
  initializeUserData,
  loadActiveSessionState,
} from "@/lib/services/shift-service";
import { useActiveSessionStore, useAppStore, getSelectedJob } from "@/stores/app-store";

export function useUserInit() {
  const { user } = useAuth();
  const setSelectedJobId = useAppStore((s) => s.setSelectedJobId);
  const setSyncStatus = useAppStore((s) => s.setSyncStatus);
  const setSyncError = useAppStore((s) => s.setSyncError);
  const setSession = useActiveSessionStore((s) => s.setSession);
  const setEvents = useActiveSessionStore((s) => s.setCurrentShiftEvents);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function init() {
      const job = await initializeUserData(user!.uid);
      if (!cancelled) setSelectedJobId(job.id);

      const { session, events } = await loadActiveSessionState(user!.uid);
      if (!cancelled) {
        setSession(session);
        setEvents(events);
      }

      const jobs = await getJobs(user!.uid);
      if (!cancelled && jobs.length > 0) {
        const current = useAppStore.getState().selectedJobId;
        if (!current || !jobs.some((j) => j.id === current)) {
          setSelectedJobId(jobs[0]!.id);
        }
      }
    }

    void init();

    const stopSync = startSyncEngine(user.uid);
    const unsubStatus = subscribeSyncStatus((status) => {
      setSyncStatus(status);
      if (status === "error") {
        setSyncError(getLastSyncError());
      } else if (status === "idle") {
        setSyncError(null);
      }
    });

    return () => {
      cancelled = true;
      stopSync();
      unsubStatus();
    };
  }, [user, setSelectedJobId, setSyncStatus, setSyncError, setSession, setEvents]);
}

export function useJobs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["jobs", user?.uid],
    queryFn: () => getJobs(user!.uid),
    enabled: !!user,
  });
}

export function useSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["settings", user?.uid],
    queryFn: () => getOrCreateSettings(user!.uid),
    enabled: !!user,
  });
}

export function useShifts(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["shifts", user?.uid, startDate, endDate],
    queryFn: async () => {
      if (startDate && endDate) {
        return getShiftsByDateRange(user!.uid, startDate, endDate);
      }
      return getShifts(user!.uid);
    },
    enabled: !!user,
  });
}

export function useShiftsForDate(date: string, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["shifts", user?.uid, "day", date],
    queryFn: () => getShiftsByDateRange(user!.uid, date, date),
    enabled: !!user && enabled,
  });
}

export function useDashboardStats() {
  const { user } = useAuth();
  const selectedJobId = useAppStore((s) => s.selectedJobId);
  const { data: jobs } = useJobs();
  const job = jobs ? getSelectedJob(jobs, selectedJobId) : null;

  return useQuery({
    queryKey: ["dashboard", user?.uid, selectedJobId],
    queryFn: () => getDashboardStats(user!.uid, job),
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useInvalidatePayday() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return async () => {
    if (!user) return;
    await queryClient.refetchQueries({
      queryKey: ["shifts", user.uid],
      type: "active",
    });
    void queryClient.invalidateQueries({ queryKey: ["jobs", user.uid] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard", user.uid] });
    void queryClient.invalidateQueries({ queryKey: ["settings", user.uid] });
  };
}
