import { getDay, parseISO } from "date-fns";
import type { PayConfig } from "@/types";

/** ponytail: monthly → giờ chuẩn 22 ngày × 8h */
const MONTHLY_HOURS = 22 * 8;

export function getHourlyRateForDate(
  payConfig: PayConfig,
  dateStr: string,
  isOvertime = false
): number {
  if (payConfig.type === "monthly") {
    return (payConfig.monthlyRate ?? 0) / MONTHLY_HOURS;
  }

  if (payConfig.type === "per_job") {
    return 0;
  }

  if (payConfig.type === "daily") {
    const daily = payConfig.dailyRate ?? payConfig.weekdayRate ?? 0;
    return daily / 8;
  }

  if (isOvertime) {
    const base =
      payConfig.overtimeRate ??
      (payConfig.type === "hourly"
        ? (payConfig.hourlyRate ?? 0) * (payConfig.otMultiplier ?? 1.5)
        : payConfig.weekdayRate ?? 0);
    return base;
  }

  if (payConfig.type === "hourly") {
    return payConfig.hourlyRate ?? 0;
  }

  // legacy tiered
  const day = getDay(parseISO(`${dateStr}T12:00:00`));
  const isWeekend = day === 0 || day === 6;
  return isWeekend
    ? (payConfig.weekendRate ?? payConfig.weekdayRate ?? 0)
    : (payConfig.weekdayRate ?? 0);
}

export function calculatePay(
  workedMinutes: number,
  payConfig: PayConfig,
  dateStr: string,
  isOvertime = false,
  jobAmount?: number
): number {
  const allowances =
    (payConfig.mealAllowance ?? 0) + (payConfig.transportAllowance ?? 0);

  if (payConfig.type === "per_job") {
    if (jobAmount == null || jobAmount < 0) return allowances;
    return Math.round(jobAmount) + allowances;
  }

  if (workedMinutes <= 0) return allowances;

  if (payConfig.type === "daily") {
    const daily = payConfig.dailyRate ?? payConfig.weekdayRate ?? 0;
    return Math.round(daily) + allowances;
  }

  const hourlyRate = getHourlyRateForDate(payConfig, dateStr, isOvertime);
  const hours = workedMinutes / 60;
  return Math.round(hours * hourlyRate) + allowances;
}

export function formatCurrency(
  amount: number,
  currency: "KRW" | "VND" | "USD" = "KRW"
): string {
  const locales: Record<string, string> = {
    KRW: "ko-KR",
    VND: "vi-VN",
    USD: "en-US",
  };

  return new Intl.NumberFormat(locales[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" || currency === "VND" ? 0 : 2,
  }).format(amount);
}

export function formatCurrencyShort(
  amount: number,
  currency: "KRW" | "VND" | "USD" = "KRW"
): string {
  if (amount === 0) return "0";

  if (currency === "KRW") {
    if (amount >= 10000) {
      const man = amount / 10000;
      const text = man >= 10 ? Math.round(man).toString() : man.toFixed(1).replace(/\.0$/, "");
      return `${text}만`;
    }
    if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
    return amount.toString();
  }

  if (currency === "VND") {
    if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000)}tr`;
    if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
    return amount.toString();
  }

  if (amount >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }

  return formatCurrency(amount, currency);
}

export function formatEarnedPlain(
  amount: number,
  currency: "KRW" | "VND" | "USD" = "KRW"
): string {
  const locales: Record<string, string> = {
    KRW: "ko-KR",
    VND: "vi-VN",
    USD: "en-US",
  };

  return new Intl.NumberFormat(locales[currency], {
    maximumFractionDigits: 0,
  }).format(amount);
}
