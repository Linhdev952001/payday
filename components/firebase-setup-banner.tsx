"use client";

import { isFirebaseConfigured, getMissingFirebaseEnvKeys } from "@/lib/firebase/config";

export function FirebaseSetupBanner() {
  if (isFirebaseConfigured()) return null;

  const missing = getMissingFirebaseEnvKeys();

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
      <p className="font-semibold">Firebase chưa được cấu hình trên server</p>
      <p className="mt-1 text-amber-100/80">
        Thêm biến môi trường trên Vercel rồi redeploy
        {missing.length > 0 ? `: ${missing.join(", ")}` : ""}
      </p>
    </div>
  );
}
