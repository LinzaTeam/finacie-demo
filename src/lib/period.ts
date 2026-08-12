const PERIOD_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const MONTH_LABELS = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
] as const;

export function currentPeriodKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function parsePeriod(value: string): { year: number; month: number } {
  const match = PERIOD_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid period: ${value}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function periodLabel(value: string): string {
  const { year, month } = parsePeriod(value);
  const label = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  }).format(new Date(`${periodKey(year, month)}-01T12:00:00+03:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function dateForPeriod(value: string, preferredDay = new Date().getDate()): string {
  const { year, month } = parsePeriod(value);
  const lastDay = new Date(year, month, 0).getDate();
  return `${periodKey(year, month)}-${String(Math.min(preferredDay, lastDay)).padStart(2, "0")}`;
}

export function periodEnd(value: string): string {
  const { year, month } = parsePeriod(value);
  return dateForPeriod(value, new Date(year, month, 0).getDate());
}
