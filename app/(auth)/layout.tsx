"use client";

import Link from "next/link";
import { useT } from "@/contexts/i18n-context";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useT();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background pt-safe-top">
      <div aria-hidden className="auth-mesh pointer-events-none absolute inset-0" />
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between px-5">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Payday
        </Link>
        <Link
          href="/"
          className="text-[13px] font-medium text-muted-foreground transition-colors active:text-foreground"
        >
          {t("auth.home")}
        </Link>
      </header>
      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
