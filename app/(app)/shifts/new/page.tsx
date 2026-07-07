"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ManualShiftForm } from "@/components/shifts/manual-shift-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { todayDateString } from "@/types";

function NewShiftContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get("date") ?? todayDateString();

  return (
    <div className="space-y-6">
      <div>
        <p className="toss-label">Ghi ca</p>
        <h1 className="toss-page-title mt-0.5">Thêm thủ công</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin ca</CardTitle>
        </CardHeader>
        <CardContent>
          <ManualShiftForm date={date} onSuccess={() => router.push("/history")} />
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" render={<Link href="/dashboard" />}>
        Quay lại
      </Button>
    </div>
  );
}

export default function NewShiftPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Đang tải...</p>}>
      <NewShiftContent />
    </Suspense>
  );
}
