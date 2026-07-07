import type { Locale } from "@/types";

const SUPPORTED: readonly Locale[] = ["vi", "en", "ko"];

export function matchLocale(language: string): Locale | null {
  const tag = language.trim().toLowerCase();
  if (!tag) return null;

  if (tag.startsWith("vi")) return "vi";
  if (tag.startsWith("ko")) return "ko";
  if (tag.startsWith("en")) return "en";

  return null;
}

/** ponytail: navigator.languages scan; upgrade path: Accept-Language on SSR */
export function detectDeviceLocale(): Locale {
  if (typeof navigator === "undefined") return "vi";

  for (const lang of navigator.languages ?? [navigator.language]) {
    const matched = matchLocale(lang);
    if (matched) return matched;
  }

  return "vi";
}

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED as readonly string[]).includes(value);
}
