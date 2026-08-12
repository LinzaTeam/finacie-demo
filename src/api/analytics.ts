import type { AnalyticsData, DashboardData } from "../types";

type RawAnalytics = {
  period_start: string;
  period_end: string;
  scope: "month" | "year";
  currency: string;
  partial: boolean;
  totals: { income_cents: number; expense_cents: number; net_cents: number };
  people: Array<{
    key: string;
    name: string;
    avatar_data_url: string | null;
    accent_color: string;
    income_cents: number;
    expense_cents: number;
  }>;
  series: Array<{ bucket: string; income_cents: number; expense_cents: number }>;
  categories: Array<{
    key: string;
    name: string;
    icon_key: string;
    color: string;
    amount_cents: number;
    people: Array<{ key: string; name: string; amount_cents: number }>;
  }>;
};

function normalize(raw: RawAnalytics): AnalyticsData {
  return {
    periodStart: raw.period_start,
    periodEnd: raw.period_end,
    scope: raw.scope,
    currency: raw.currency,
    partial: raw.partial,
    totals: {
      incomeMinor: raw.totals.income_cents,
      expenseMinor: raw.totals.expense_cents,
      netMinor: raw.totals.net_cents,
    },
    people: raw.people.map((person) => ({
      key: person.key,
      name: person.name,
      avatarDataUrl: person.avatar_data_url,
      accentColor: person.accent_color,
      incomeMinor: person.income_cents,
      expenseMinor: person.expense_cents,
    })),
    series: raw.series.map((point) => ({
      bucket: point.bucket,
      incomeMinor: point.income_cents,
      expenseMinor: point.expense_cents,
    })),
    categories: raw.categories.map((category) => ({
      key: category.key,
      name: category.name,
      iconKey: category.icon_key,
      color: category.color,
      amountMinor: category.amount_cents,
      people: category.people.map((person) => ({
        key: person.key,
        name: person.name,
        amountMinor: person.amount_cents,
      })),
    })),
  };
}

function demoAnalytics(
  data: DashboardData,
  period: string,
  scope: "month" | "year",
  personKey: string | null,
): AnalyticsData {
  const prefix = scope === "year" ? period.slice(0, 4) : period;
  const transactions = data.transactions.filter((transaction) => (
    transaction.occurredAt.startsWith(prefix) &&
    (!personKey || transaction.subjectKey === personKey)
  ));
  const buckets = new Map<string, { bucket: string; incomeMinor: number; expenseMinor: number }>();
  const personTotals = new Map(data.people.map((person) => [person.key, {
    ...person,
    incomeMinor: 0,
    expenseMinor: 0,
  }]));
  const categories = new Map<string, AnalyticsData["categories"][number]>();
  transactions.forEach((transaction) => {
    const bucket = scope === "year"
      ? transaction.occurredAt.slice(0, 7)
      : transaction.occurredAt.slice(0, 10);
    const point = buckets.get(bucket) ?? { bucket, incomeMinor: 0, expenseMinor: 0 };
    const person = personTotals.get(transaction.subjectKey || "") ?? null;
    if (transaction.kind === "income") {
      point.incomeMinor += transaction.amountMinor;
      if (person) person.incomeMinor += transaction.amountMinor;
    } else if (transaction.kind === "expense") {
      point.expenseMinor += transaction.amountMinor;
      if (person) person.expenseMinor += transaction.amountMinor;
      const definition = data.categories.find((item) => item.id === transaction.categoryKey)
        ?? data.categories.find((item) => item.label === transaction.title);
      const key = transaction.categoryKey || definition?.id || "other";
      const category = categories.get(key) ?? {
        key,
        name: definition?.label || transaction.title,
        iconKey: definition?.iconKey || "receipt",
        color: definition?.color || "#95B1EE",
        amountMinor: 0,
        people: [],
      };
      category.amountMinor += transaction.amountMinor;
      if (person) {
        const current = category.people.find((item) => item.key === person.key);
        if (current) current.amountMinor += transaction.amountMinor;
        else category.people.push({ key: person.key, name: person.name, amountMinor: transaction.amountMinor });
      }
      categories.set(key, category);
    }
    buckets.set(bucket, point);
  });
  const visiblePeople = [...personTotals.values()].filter((person) => !personKey || person.key === personKey);
  const incomeMinor = visiblePeople.reduce((sum, person) => sum + person.incomeMinor, 0);
  const expenseMinor = visiblePeople.reduce((sum, person) => sum + person.expenseMinor, 0);
  return {
    periodStart: `${prefix}${scope === "year" ? "-01-01" : "-01"}`,
    periodEnd: data.meta.generatedAt.slice(0, 10),
    scope,
    currency: data.availableMoney.currency,
    partial: false,
    totals: { incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor },
    people: visiblePeople,
    series: [...buckets.values()].sort((a, b) => a.bucket.localeCompare(b.bucket)),
    categories: [...categories.values()].sort((a, b) => b.amountMinor - a.amountMinor),
  };
}

export async function getAnalytics(
  data: DashboardData,
  source: "api" | "demo",
  period: string,
  scope: "month" | "year",
  personKey: string | null,
  signal?: AbortSignal,
): Promise<AnalyticsData> {
  if (source === "demo") return demoAnalytics(data, period, scope, personKey);
  const query = new URLSearchParams({ period, scope });
  if (personKey) query.set("person", personKey);
  const headers: Record<string, string> = { Accept: "application/json" };
  const devUser = import.meta.env.VITE_FINANCE_DEV_USER;
  if (devUser) headers["X-Finance-Dev-User"] = devUser;
  const response = await fetch(`/api/v1/analytics?${query}`, {
    headers,
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) throw new Error(`Analytics API returned ${response.status}`);
  return normalize(await response.json() as RawAnalytics);
}
