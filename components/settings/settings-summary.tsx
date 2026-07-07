"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  CloudUpload,
  Download,
  FileSpreadsheet,
  FileText,
  LogOut,
  Loader2,
  Monitor,
  Moon,
  Sun,
  Target,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import { useT } from "@/contexts/i18n-context";
import {
  useDashboardStats,
  useInvalidatePayday,
  useJobs,
  useSettings,
  useShifts,
} from "@/hooks/use-payday";
import { exportAllData, importAllData, saveSettings } from "@/lib/db/repositories";
import { shiftsToCsv, downloadFile } from "@/lib/export/csv";
import { exportShiftsToExcel } from "@/lib/export/excel";
import { exportJsonBackup, importJsonBackup } from "@/lib/export/json";
import { syncUserData } from "@/lib/firebase/sync";
import { getAuthErrorMessage } from "@/lib/firebase/errors";
import { hasPasswordLogin, linkEmailPassword } from "@/lib/firebase/auth";
import { formatAmountInput, parseAmountInput } from "@/lib/pay/amount-input";
import { formatCurrency } from "@/lib/pay/calculate";
import {
  resolveNotificationSettings,
  type Currency,
  type Locale,
  type TimeFormat,
  type UserSettings,
  type WeekStartDay,
} from "@/types";
import { cn } from "@/lib/utils";

const CURRENCIES: { id: Currency; symbol: string; name: string }[] = [
  { id: "KRW", symbol: "₩", name: "Won" },
  { id: "VND", symbol: "₫", name: "VND" },
  { id: "USD", symbol: "$", name: "USD" },
];

const WEEK_STARTS: { id: WeekStartDay; label: string }[] = [
  { id: "monday", label: "T2" },
  { id: "sunday", label: "CN" },
  { id: "saturday", label: "T7" },
];

const THEMES = [
  { id: "system" as const, labelKey: "settings.themeSystem", icon: Monitor },
  { id: "light" as const, labelKey: "settings.themeLight", icon: Sun },
  { id: "dark" as const, labelKey: "settings.themeDark", icon: Moon },
];

const LOCALES: Locale[] = ["vi", "en", "ko"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-0.5 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function OptionChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "bg-secondary text-muted-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

function GoalRing({ progress }: { progress: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;

  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0 -rotate-90">
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        className="text-secondary"
      />
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="text-primary transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

export function SettingsSummary() {
  const { user, signOut } = useAuth();
  const t = useT();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { data: settings } = useSettings();
  const { data: shifts = [] } = useShifts();
  const { data: jobs = [] } = useJobs();
  const { data: stats } = useDashboardStats();
  const invalidate = useInvalidatePayday();
  const fileRef = useRef<HTMLInputElement>(null);
  const [incomeGoal, setIncomeGoal] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);

  useEffect(() => {
    if (settings?.incomeGoal) {
      setIncomeGoal(formatAmountInput(settings.incomeGoal));
    }
  }, [settings?.incomeGoal]);

  if (!settings || !user) return null;

  const needsPassword =
    !passwordSet && !!user?.email && !hasPasswordLogin(user);

  const userId = user.uid;

  const notifications = resolveNotificationSettings(settings.notifications);

  const currency = settings.currency;
  const monthEarned = stats?.monthEarned ?? 0;
  const goalAmount = settings.incomeGoal ?? 0;
  const goalProgress =
    goalAmount > 0 ? Math.min(100, Math.round((monthEarned / goalAmount) * 100)) : 0;

  const displayName =
    user.displayName?.trim() || user.email?.split("@")[0] || t("common.user");
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  async function updateSettings(partial: Partial<UserSettings>) {
    const next = await saveSettings({ ...settings!, ...partial });
    if (partial.theme) setTheme(partial.theme);
    await syncUserData(userId);
    invalidate();
    return next;
  }

  async function handleExportCsv() {
    const csv = shiftsToCsv(shifts, jobs);
    downloadFile(csv, "payday-shifts.csv", "text/csv");
    toast.success(t("settings.exportedCsv"));
  }

  async function handleExportExcel() {
    exportShiftsToExcel(shifts, jobs);
    toast.success(t("settings.exportedExcel"));
  }

  async function handleExportJson() {
    const data = await exportAllData(userId);
    exportJsonBackup(data);
    toast.success(t("settings.exportedJson"));
  }

  async function handleImportJson(file: File) {
    try {
      const data = (await importJsonBackup(file)) as {
        jobs?: import("@/types").Job[];
        shifts?: import("@/types").Shift[];
        settings?: UserSettings;
      };
      await importAllData(userId, data, false);
      await syncUserData(userId);
      invalidate();
      toast.success(t("settings.importedJson"));
    } catch {
      toast.error(t("settings.invalidJson"));
    }
  }

  async function handleSaveGoal() {
    const amount = parseAmountInput(incomeGoal);
    await updateSettings({ incomeGoal: amount > 0 ? amount : undefined });
    toast.success(t("settings.goalSaved"));
  }

  async function handleSetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }

    setSavingPassword(true);
    try {
      await linkEmailPassword(password);
      setPasswordSet(true);
      setPassword("");
      setConfirmPassword("");
      toast.success(t("settings.passwordSaved"));
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const exportActions = [
    { icon: FileSpreadsheet, label: "Excel", onClick: handleExportExcel, tint: "#16bb76" },
    { icon: FileText, label: "CSV", onClick: handleExportCsv, tint: "#3182f6" },
    { icon: Download, label: "Backup", onClick: handleExportJson, tint: "#ae3dd1" },
    { icon: CloudUpload, label: "Import", onClick: () => fileRef.current?.click(), tint: "#f18600" },
  ] as const;

  return (
    <div className="space-y-7 pb-4">
      <header className="page-enter">
        <p className="toss-label">{t("settings.account")}</p>
        <h1 className="mt-0.5 text-[26px] font-bold tracking-tight">{t("settings.title")}</h1>
      </header>

      {/* Profile */}
      <div className="page-enter stagger-1 relative overflow-hidden rounded-3xl bg-card px-5 py-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 90% 80% at 100% 0%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 55%), radial-gradient(ellipse 70% 60% at 0% 100%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 50%)",
          }}
        />
        <div className="relative flex items-center gap-4">
          <Avatar size="lg" className="size-14 ring-2 ring-background">
            <AvatarImage src={user.photoURL ?? undefined} alt={displayName} />
            <AvatarFallback className="bg-primary/15 text-lg font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold">{displayName}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {jobs.length} {t("common.jobs")} · {shifts.length} {t("common.shifts")}
            </p>
          </div>
        </div>
      </div>

      {needsPassword && (
        <section className="page-enter stagger-1 space-y-2.5">
          <SectionLabel>{t("settings.setPassword")}</SectionLabel>
          <form
            onSubmit={(e) => void handleSetPassword(e)}
            className="space-y-3 rounded-3xl bg-card px-5 py-5"
          >
            <p className="text-sm text-muted-foreground">{t("settings.setPasswordDesc")}</p>
            <div className="space-y-1.5">
              <label
                htmlFor="set-password"
                className="px-1 text-[13px] font-medium text-muted-foreground"
              >
                {t("auth.password")}
              </label>
              <Input
                id="set-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className="px-1 text-[13px] font-medium text-muted-foreground"
              >
                {t("settings.confirmPassword")}
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={savingPassword}>
              {savingPassword && <Loader2 className="animate-spin" />}
              {t("settings.setPassword")}
            </Button>
          </form>
        </section>
      )}

      {/* Income goal */}
      <section className="page-enter stagger-2 space-y-2.5">
        <SectionLabel>{t("settings.monthGoal")}</SectionLabel>
        <div className="overflow-hidden rounded-3xl bg-card">
          <div className="flex items-center gap-4 px-5 py-5">
            <div className="relative flex items-center justify-center">
              <GoalRing progress={goalProgress} />
              <span className="absolute rotate-90 text-center">
                <span className="block text-lg font-bold tabular-nums text-primary">
                  {goalAmount > 0 ? `${goalProgress}%` : "—"}
                </span>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{t("settings.earnedThisMonth")}</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight">
                {formatCurrency(monthEarned, currency)}
              </p>
              {goalAmount > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  / {formatCurrency(goalAmount, currency)}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{t("settings.noGoal")}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 border-t border-border px-4 py-3.5">
            <MoneyInput
              value={incomeGoal}
              onChange={setIncomeGoal}
              placeholder="3.000.000"
              className="h-11 rounded-xl bg-secondary border-0"
            />
            <Button className="h-11 shrink-0 rounded-xl px-5" onClick={() => void handleSaveGoal()}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </section>

      {/* Display */}
      <section className="page-enter stagger-3 space-y-2.5">
        <SectionLabel>{t("settings.display")}</SectionLabel>
        <div className="space-y-3 rounded-3xl bg-card p-4">
          <div>
            <p className="mb-2 text-sm font-medium">{t("settings.language")}</p>
            <div className="flex gap-2">
              {LOCALES.map((locale) => (
                <OptionChip
                  key={locale}
                  active={settings.locale === locale}
                  onClick={() => updateSettings({ locale })}
                  className="flex-1"
                >
                  {t(`locale.${locale}`)}
                </OptionChip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{t("settings.currency")}</p>
            <div className="flex gap-2">
              {CURRENCIES.map((c) => (
                <OptionChip
                  key={c.id}
                  active={settings.currency === c.id}
                  onClick={() => updateSettings({ currency: c.id })}
                  className="flex-1"
                >
                  <span className="block text-base leading-none">{c.symbol}</span>
                  <span className="mt-0.5 block text-[10px] font-medium opacity-80">{c.name}</span>
                </OptionChip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{t("settings.timeFormat")}</p>
            <div className="flex gap-2">
              <OptionChip
                active={settings.timeFormat === "24h"}
                onClick={() => updateSettings({ timeFormat: "24h" as TimeFormat })}
                className="flex-1"
              >
                {t("settings.hours24")}
              </OptionChip>
              <OptionChip
                active={settings.timeFormat === "12h"}
                onClick={() => updateSettings({ timeFormat: "12h" as TimeFormat })}
                className="flex-1"
              >
                {t("settings.hours12")}
              </OptionChip>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{t("settings.weekStart")}</p>
            <div className="flex gap-2">
              {WEEK_STARTS.map((w) => (
                <OptionChip
                  key={w.id}
                  active={settings.weekStartDay === w.id}
                  onClick={() => updateSettings({ weekStartDay: w.id })}
                  className="flex-1"
                >
                  {w.label}
                </OptionChip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{t("settings.theme")}</p>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((theme) => {
                const Icon = theme.icon;
                const active = settings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updateSettings({ theme: theme.id })}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 transition-all active:scale-[0.98]",
                      active
                        ? "border-primary bg-primary/8 text-primary"
                        : "border-transparent bg-secondary text-muted-foreground"
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2} />
                    <span className="text-xs font-semibold">{t(theme.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="page-enter stagger-4 space-y-2.5">
        <SectionLabel>{t("settings.reminders")}</SectionLabel>
        <div className="overflow-hidden rounded-3xl bg-card">
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                  <Clock className="size-[18px] text-primary" />
                </span>
                <div>
                  <p className="text-[15px] font-medium">{t("settings.logShiftReminder")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.logShiftReminderDesc")}
                  </p>
                </div>
              </div>
              <Switch
                checked={notifications.logShiftReminder}
                onCheckedChange={(checked) =>
                  updateSettings({
                    notifications: { ...notifications, logShiftReminder: checked },
                  })
                }
              />
            </div>
            {notifications.logShiftReminder && (
              <Input
                type="time"
                value={notifications.logShiftTime}
                onChange={(e) =>
                  updateSettings({
                    notifications: { ...notifications, logShiftTime: e.target.value },
                  })
                }
                className="mt-3 h-11 rounded-xl bg-secondary border-0"
              />
            )}
          </div>
        </div>
      </section>

      {/* Data */}
      <section className="space-y-2.5 page-enter">
        <SectionLabel>{t("settings.data")}</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {exportActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="flex flex-col items-start gap-3 rounded-2xl bg-card p-4 text-left transition-transform active:scale-[0.98]"
            >
              <span
                className="flex size-10 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `color-mix(in srgb, ${action.tint} 14%, transparent)`,
                  color: action.tint,
                }}
              >
                <action.icon className="size-5" strokeWidth={2} />
              </span>
              <span className="text-sm font-semibold">{action.label}</span>
            </button>
          ))}
        </div>
        <Link
          href="/reports"
          className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 transition-colors active:bg-secondary/60"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Target className="size-5" strokeWidth={2} />
          </span>
          <span className="flex-1 text-[15px] font-medium">{t("settings.monthlyReport")}</span>
          <span className="text-sm text-muted-foreground">→</span>
        </Link>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportJson(file);
          }}
        />
      </section>

      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="page-enter flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-destructive transition-colors active:bg-destructive/8"
      >
        <LogOut className="size-4" />
        {t("settings.signOut")}
      </button>
    </div>
  );
}
