import type { Locale } from "@/lib/i18n/dictionaries";

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

export function relativeTime(date: string | Date | null | undefined, locale: Locale): string {
  if (!date) return "—";
  const formatter = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", { numeric: "auto" });
  let duration = (new Date(date).getTime() - Date.now()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) return formatter.format(Math.round(duration), division.unit);
    duration /= division.amount;
  }
  return "—";
}

export function timeOfDay(date: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function dayKey(date: string | Date): string {
  return new Date(date).toDateString();
}

export function dayLabel(date: string | Date, locale: Locale, t: { today: string; yesterday: string }): string {
  const key = dayKey(date);
  if (key === new Date().toDateString()) return t.today;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === yesterday.toDateString()) return t.yesterday;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}
