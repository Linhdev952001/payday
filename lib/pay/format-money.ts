import type { Currency } from "@/types";
import type { Translate } from "@/lib/i18n";

const AMOUNT_LOCALE: Record<Currency, string> = {
  KRW: "ko-KR",
  VND: "vi-VN",
  USD: "en-US",
};

export function formatMoneyAmount(
  amount: number,
  currency: Currency
): string {
  return new Intl.NumberFormat(AMOUNT_LOCALE[currency], {
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  }).format(amount);
}

export function getMoneyUnit(currency: Currency, t: Translate): string {
  return t(`money.units.${currency}`);
}

export function formatMoneyText(
  amount: number,
  currency: Currency,
  t: Translate
): string {
  return `${formatMoneyAmount(amount, currency)} ${getMoneyUnit(currency, t)}`;
}
