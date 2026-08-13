import type { AnalyticsData, DashboardData } from "../types";

type RawAnalytics = {
  period_start: string;
  period_end: string;
  scope: AnalyticsData["scope"];
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
  counterparties: Array<{
    key: string;
    name: string;
    entity_type: "company" | "person" | "merchant" | "platform" | "other";
    income_cents: number;
    expense_cents: number;
    net_cents: number;
    transaction_count: number;
    last_seen: string;
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
    counterparties: raw.counterparties.map((counterparty) => ({
      key: counterparty.key,
      name: counterparty.name,
      entityType: counterparty.entity_type,
      incomeMinor: counterparty.income_cents,
      expenseMinor: counterparty.expense_cents,
      netMinor: counterparty.net_cents,
      transactionCount: counterparty.transaction_count,
      lastSeen: counterparty.last_seen,
    })),
  };
}

function demoAnalytics(
  data: DashboardData,
  period: string,
  scope: AnalyticsData["scope"],
  personKey: string | null,
): AnalyticsData {
  const selectedYear = Number(period.slice(0, 4));
  const transactions = data.transactions.filter((transaction) => (
    (scope === "month"
      ? transaction.occurredAt.startsWith(period)
      : scope === "year"
        ? transaction.occurredAt.startsWith(String(selectedYear))
        : Number(transaction.occurredAt.slice(0, 4)) <= selectedYear) &&
    (!personKey || transaction.subjectKey === personKey)
  ));
  const buckets = new Map<string, { bucket: string; incomeMinor: number; expenseMinor: number }>();
  if (scope === "month") {
    const [year, month] = period.split("-").map(Number);
    const dayCount = new Date(year, month, 0).getDate();
    for (let day = 1; day <= dayCount; day += 1) {
      const bucket = `${period}-${String(day).padStart(2, "0")}`;
      buckets.set(bucket, { bucket, incomeMinor: 0, expenseMinor: 0 });
    }
  } else if (scope === "year") {
    for (let month = 1; month <= 12; month += 1) {
      const bucket = `${selectedYear}-${String(month).padStart(2, "0")}`;
      buckets.set(bucket, { bucket, incomeMinor: 0, expenseMinor: 0 });
    }
  } else {
    const years = transactions.map((transaction) => Number(transaction.occurredAt.slice(0, 4)));
    const firstYear = Math.min(selectedYear, ...years.filter(Number.isFinite));
    for (let year = firstYear; year <= selectedYear; year += 1) {
      const bucket = String(year);
      buckets.set(bucket, { bucket, incomeMinor: 0, expenseMinor: 0 });
    }
  }
  const personTotals = new Map(data.people.map((person) => [person.key, {
    ...person,
    incomeMinor: 0,
    expenseMinor: 0,
  }]));
  const categories = new Map<string, AnalyticsData["categories"][number]>();
  const counterparties = new Map<string, AnalyticsData["counterparties"][number]>();
  transactions.forEach((transaction) => {
    const bucket = scope === "month"
      ? transaction.occurredAt.slice(0, 10)
      : scope === "year"
        ? transaction.occurredAt.slice(0, 7)
        : transaction.occurredAt.slice(0, 4);
    const point = buckets.get(bucket) ?? { bucket, incomeMinor: 0, expenseMinor: 0 };
    const person = personTotals.get(transaction.subjectKey || "") ?? null;
    if (transaction.counterpartyName) {
      const key = transaction.counterpartyKey || transaction.counterpartyName.toLocaleLowerCase("ru-RU");
      const counterparty = counterparties.get(key) ?? {
        key,
        name: transaction.counterpartyName,
        entityType: transaction.kind === "income" ? "company" : "merchant",
        incomeMinor: 0,
        expenseMinor: 0,
        netMinor: 0,
        transactionCount: 0,
        lastSeen: transaction.occurredAt.slice(0, 10),
      };
      if (transaction.kind === "income") counterparty.incomeMinor += transaction.amountMinor;
      if (transaction.kind === "expense") counterparty.expenseMinor += transaction.amountMinor;
      counterparty.netMinor = counterparty.incomeMinor - counterparty.expenseMinor;
      counterparty.transactionCount += 1;
      counterparty.lastSeen = [counterparty.lastSeen, transaction.occurredAt.slice(0, 10)].sort().at(-1) || counterparty.lastSeen;
      counterparties.set(key, counterparty);
    }
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
  const firstBucket = buckets.keys().next().value as string | undefined;
  const periodStart = scope === "month"
    ? `${period}-01`
    : scope === "year"
      ? `${selectedYear}-01-01`
      : `${firstBucket ?? selectedYear}-01-01`;
  const periodEnd = scope === "month"
    ? `${period}-${String(new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0).getDate()).padStart(2, "0")}`
    : `${selectedYear}-12-31`;
  return {
    periodStart,
    periodEnd,
    scope,
    currency: data.availableMoney.currency,
    partial: false,
    totals: { incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor },
    people: visiblePeople,
    series: [...buckets.values()].sort((a, b) => a.bucket.localeCompare(b.bucket)),
    categories: [...categories.values()].sort((a, b) => b.amountMinor - a.amountMinor),
    counterparties: [...counterparties.values()].sort((a, b) => b.incomeMinor - a.incomeMinor),
  };
}

export async function getAnalytics(
  data: DashboardData,
  source: "api" | "demo",
  period: string,
  scope: AnalyticsData["scope"],
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
