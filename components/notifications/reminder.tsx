"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useSettings, useShifts } from "@/hooks/use-payday";
import { useT } from "@/contexts/i18n-context";
import { resolveNotificationSettings, todayDateString } from "@/types";

const WORK_STATUSES = new Set(["completed", "manual", "in_progress"]);

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(":").map(Number);
  return { hour: hour ?? 0, minute: minute ?? 0 };
}

function isSameMinute(now: Date, time: string): boolean {
  const { hour, minute } = parseTime(time);
  return now.getHours() === hour && now.getMinutes() === minute;
}

export function NotificationReminder() {
  const { data: settings } = useSettings();
  const { data: shifts = [] } = useShifts();
  const t = useT();

  useEffect(() => {
    if (!settings || typeof window === "undefined") return;

    const interval = setInterval(() => {
      const notifications = resolveNotificationSettings(settings.notifications);
      if (!notifications.logShiftReminder) return;

      const now = new Date();
      if (!isSameMinute(now, notifications.logShiftTime)) return;

      const today = todayDateString();
      const hasWorkToday = shifts.some(
        (s) => s.date === today && WORK_STATUSES.has(s.status)
      );
      if (hasWorkToday) return;

      toast.message(t("reminder.title"), {
        description: t("reminder.body"),
      });

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`Payday — ${t("reminder.title")}`, {
          body: t("reminder.body"),
        });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [settings, shifts, t]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  return null;
}
