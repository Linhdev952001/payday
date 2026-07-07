import { Suspense } from "react";
import ReportsPage from "./reports-content";

export default function ReportsRoute() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Đang tải...</p>}>
      <ReportsPage />
    </Suspense>
  );
}
