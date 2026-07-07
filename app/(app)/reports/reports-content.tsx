"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJobs, useSettings, useShifts } from "@/hooks/use-payday";
import { formatCurrency } from "@/lib/pay/calculate";
import { formatDuration } from "@/lib/time/format";

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const { data: shifts = [] } = useShifts();
  const { data: jobs = [] } = useJobs();
  const { data: settings } = useSettings();

  const currency = settings?.currency ?? "KRW";
  const monthLabel = format(new Date(), "MMMM yyyy", { locale: vi });
  const monthPrefix = format(new Date(), "yyyy-MM");

  const report = useMemo(() => {
    const filtered = shifts.filter(
      (s) =>
        (s.status === "completed" || s.status === "manual") &&
        s.date.startsWith(monthPrefix) &&
        (!jobId || s.jobId === jobId)
    );

    const workDays = new Set(filtered.map((s) => s.date)).size;
    const totalMinutes = filtered.reduce((sum, s) => sum + s.workedMinutes, 0);
    const totalEarned = filtered.reduce((sum, s) => sum + s.earnedAmount, 0);

    return { workDays, totalMinutes, totalEarned, filtered };
  }, [shifts, monthPrefix, jobId]);

  const job = jobId ? jobs.find((j) => j.id === jobId) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="toss-label">Báo cáo</p>
        <h1 className="toss-page-title mt-0.5">{job ? job.name : monthLabel}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tổng hợp tháng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ngày làm</span>
            <span className="font-mono font-semibold">{report.workDays} ngày</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tổng giờ</span>
            <span className="font-mono font-semibold">
              {formatDuration(report.totalMinutes)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tổng lương</span>
            <span className="font-mono text-lg font-semibold">
              {formatCurrency(report.totalEarned, currency)}
            </span>
          </div>
        </CardContent>
      </Card>

      {settings?.incomeGoal && (
        <Card>
          <CardHeader>
            <CardTitle>Mục tiêu thu nhập</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{formatCurrency(report.totalEarned, currency)}</span>
              <span>{formatCurrency(settings.incomeGoal, currency)}</span>
            </div>
            <div className="h-2 bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min(100, (report.totalEarned / settings.incomeGoal) * 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
