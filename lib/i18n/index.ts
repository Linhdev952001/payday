import { enUS, ko, vi as viLocale, type Locale as DateFnsLocale } from "date-fns/locale";
import type { Locale } from "@/types";
import { messages, type Messages } from "./messages";

export type { Messages };

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
  return typeof value === "string" ? value : undefined;
}

export function createTranslator(locale: Locale) {
  const dict = messages[locale] ?? messages.vi;
  return (key: string, params?: Record<string, string | number>) => {
    let text = getNested(dict as Record<string, unknown>, key) ?? getNested(messages.vi as Record<string, unknown>, key) ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };
}

export type Translate = ReturnType<typeof createTranslator>;

export function getDateFnsLocale(locale: Locale): DateFnsLocale {
  if (locale === "ko") return ko;
  if (locale === "en") return enUS;
  return viLocale;
}
