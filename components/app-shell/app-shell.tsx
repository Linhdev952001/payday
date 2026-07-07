"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Briefcase,
  CalendarDays,
  CloudOff,
  Home,
  Loader2,
  RefreshCw,
  Settings,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useT } from "@/contexts/i18n-context";
import { getLastSyncError, retrySync } from "@/lib/firebase/sync";
import { useInvalidatePayday } from "@/hooks/use-payday";
import { useAppStore } from "@/stores/app-store";

function SyncIndicator() {
  const { user } = useAuth();
  const t = useT();
  const syncStatus = useAppStore((s) => s.syncStatus);
  const syncError = useAppStore((s) => s.syncError);
  const setSyncStatus = useAppStore((s) => s.setSyncStatus);
  const setSyncError = useAppStore((s) => s.setSyncError);
  const invalidate = useInvalidatePayday();

  if (syncStatus === "idle") return null;

  async function handleRetry() {
    if (!user) return;
    setSyncStatus("syncing");
    const status = await retrySync(user.uid);
    setSyncStatus(status);
    setSyncError(getLastSyncError());

    if (status === "idle") {
      toast.success(t("sync.success"));
      invalidate();
    } else if (status === "error") {
      toast.error(getLastSyncError()?.message ?? t("sync.error"));
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {syncStatus === "syncing" && (
          <Loader2 className="size-3.5 animate-spin text-primary" />
        )}
        {syncStatus === "offline" && <CloudOff className="size-3.5" />}
        {syncStatus === "error" && (
          <CloudOff className="size-3.5 text-destructive" />
        )}
      </div>
      {syncStatus === "error" && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleRetry}
          title={syncError?.message ?? t("common.retry")}
        >
          <RefreshCw />
        </Button>
      )}
    </div>
  );
}

function UserAvatar() {
  const { user } = useAuth();
  const t = useT();
  if (!user) return null;

  const initials =
    user.displayName?.trim().charAt(0).toUpperCase() ||
    user.email?.charAt(0).toUpperCase() ||
    "?";

  return (
    <Link href="/settings" aria-label={t("common.account")}>
      <Avatar size="sm">
        {user.photoURL ? (
          <AvatarImage src={user.photoURL} alt={user.displayName ?? "Avatar"} />
        ) : null}
        <AvatarFallback className="bg-secondary text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  const [mounted, setMounted] = useState(false);

  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: t("nav.home"), icon: Home },
      { href: "/calendar", label: t("nav.calendar"), icon: CalendarDays },
      { href: "/stats", label: t("nav.stats"), icon: BarChart3 },
      { href: "/jobs", label: t("nav.jobs"), icon: Briefcase },
      { href: "/settings", label: t("nav.settings"), icon: Settings },
    ],
    [t]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="relative flex flex-col items-center">
                <Icon
                  className={cn("size-[22px]", active && "text-primary")}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {active ? (
                  <span className="absolute -bottom-1.5 size-1 rounded-full bg-primary" />
                ) : null}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>,
    document.body
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  const isDashboard = pathname === "/dashboard";
  const isCalendar = pathname === "/calendar";

  const pageTitle = useMemo(() => {
    const map: Record<string, string> = {
      "/dashboard": "Payday",
      "/calendar": t("page.calendar"),
      "/stats": t("page.stats"),
      "/jobs": t("page.jobs"),
      "/settings": t("page.settings"),
      "/history": t("page.history"),
      "/reports": t("page.reports"),
      "/shifts/new": t("nav.addShift"),
    };
    if (map[pathname]) return map[pathname];
    for (const [path, title] of Object.entries(map)) {
      if (pathname.startsWith(`${path}/`)) return title;
    }
    return "Payday";
  }, [pathname, t]);

  return (
    <AuthGuard>
      <div
        className={cn(
          "min-h-dvh min-w-0 overflow-x-hidden bg-background pt-safe-top",
          isCalendar && "flex flex-col"
        )}
      >
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
          <div
            className={cn(
              "mx-auto flex items-center justify-between py-3.5",
              isCalendar ? "w-full max-w-none px-4" : "max-w-lg px-5"
            )}
          >
            <Link
              href="/dashboard"
              className={cn(
                "font-bold tracking-tight text-foreground",
                isDashboard ? "text-xl" : "text-[17px]"
              )}
            >
              {pageTitle}
            </Link>
            <div className="flex items-center gap-2.5">
              <SyncIndicator />
              <UserAvatar />
            </div>
          </div>
        </header>
        <main
          className={cn(
            "page-enter min-w-0 py-2 pb-[calc(5.75rem+env(safe-area-inset-bottom))]",
            isCalendar
              ? "flex w-full max-w-none flex-1 flex-col px-0 py-0"
              : "mx-auto max-w-lg px-5"
          )}
        >
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
