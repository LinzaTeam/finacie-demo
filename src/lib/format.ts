import type { CurrencyCode } from "../types";

export function formatMoney(amountMinor: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function formatSignedMoney(amountMinor: number, currency: CurrencyCode): string {
  const sign = amountMinor > 0 ? "+" : amountMinor < 0 ? "−" : "";
  return `${sign}${formatMoney(Math.abs(amountMinor), currency)}`;
}

export function formatCompactMoney(amountMinor: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amountMinor / 100);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}
