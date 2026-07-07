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
    <div className="relative min-h-dvh overflow-hidden bg-background pt-safe-top">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_srgb,var(--primary)_12%,transparent),transparent)]"
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Payday
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("auth.home")}
        </Link>
      </header>
      <main className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 pb-16 sm:px-12">
        {children}
      </main>
    </div>
  );
}
