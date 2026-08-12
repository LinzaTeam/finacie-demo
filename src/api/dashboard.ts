import { demoDashboard } from "../data/demo";
import { periodEnd, periodLabel } from "../lib/period";
import { isDashboardData, type DashboardData } from "../types";

export type DashboardSource = "api" | "demo";

export type DashboardResult = {
  data: DashboardData;
  source: DashboardSource;
};

type RawDashboard = {
  as_of: string;
  currency: string;
  totals: {
    available_cents: number;
    partial: boolean;
  };
  month: {
    start: string;
    income_cents: number;
    expense_cents: number;
    net_cents: number;
    partial: boolean;
  };
  cashflow_partial?: boolean;
  categories: Array<{
    key?: string;
    name: string;
    icon_key?: string;
    color?: string;
    amount_cents: number;
  }>;
  cashflow: Array<{ date: string; income_cents: number; expense_cents: number }>;
  accounts: Array<{
    key: string;
    name: string;
    group: string;
    is_liability: boolean;
    amount_cents: number;
    currency: string;
    rub_cents: number | null;
    rate_missing: boolean;
    updated_at: string | null;
    owner_key?: string;
    owner_name?: string;
    icon_key?: string;
    color?: string;
    avatar_data_url?: string | null;
  }>;
  obligations: Array<{
    key: string;
    name: string;
    owner: string;
    debt_cents: number;
    available_credit_cents: number | null;
    min_payment_cents: number | null;
    due_date: string | null;
  }>;
  recent_transactions: Array<{
    id: string | number;
    date: string;
    person_name: string;
    person_key?: string;
    actor_person_key?: string;
    actor_name?: string;
    kind: string;
    category: string;
    counterparty: string | null;
    note: string | null;
    account_from: string | null;
    account_to: string | null;
    amount_cents: number;
    currency: string;
    category_key?: string;
  }>;
  people?: Array<{
    key: string;
    name: string;
    avatar_data_url: string | null;
    accent_color: string;
  }>;
  goals?: Array<{
    goal_id: string;
    owner_person_key: string;
    owner_name: string;
    name: string;
    target_cents: number;
    current_cents: number;
    currency: string;
    target_date: string | null;
    icon_key: string;
    color: string;
  }>;
  reconciliation: {
    period_start: string;
    period_end: string;
    missing_count: number;
    missing: Array<{ person_key: string; person_name: string; date: string }>;
  };
};

function isRawDashboard(value: unknown): value is RawDashboard {
  if (!value || typeof value !== "object") return false;
  const raw = value as Partial<RawDashboard>;
  return Boolean(
    raw.as_of &&
      raw.currency &&
      raw.totals &&
      raw.month &&
      raw.reconciliation &&
      Array.isArray(raw.cashflow) &&
      Array.isArray(raw.categories) &&
      Array.isArray(raw.accounts) &&
      Array.isArray(raw.obligations) &&
      Array.isArray(raw.recent_transactions),
  );
}

function dateLabel(value: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    ...(options ?? { day: "numeric", month: "long" }),
  }).format(new Date(`${value}T12:00:00+03:00`));
}

function normalizeOwner(owner: string): string {
  if (owner === "common") return "Общий";
  return "Участник";
}

function normalizeKind(kind: string): "income" | "expense" | "transfer" {
  if (kind === "income") return "income";
  if (kind === "card_payment" || kind === "transfer_to_person") return "expense";
  return "transfer";
}

function transactionTitle(transaction: RawDashboard["recent_transactions"][number]): string {
  if (transaction.kind === "income") return transaction.counterparty || "Доход";
  if (transaction.kind === "own_transfer") return "Перевод между счетами";
  if (transaction.kind === "balance_snapshot") return "Обновление баланса";
  if (transaction.kind === "excluded_transfer") return "Исключённый перевод";
  if (transaction.kind === "card_payment" || transaction.kind === "transfer_to_person") {
    return transaction.category || transaction.counterparty || "Расход";
  }
  return transaction.category || transaction.counterparty || "Операция";
}

function transactionDetail(transaction: RawDashboard["recent_transactions"][number]): string {
  if (transaction.note) return transaction.note;
  if (transaction.kind === "own_transfer") {
    return `${transaction.account_from ?? "Счёт"} → ${transaction.account_to ?? "Счёт"}`;
  }
  if (transaction.kind === "balance_snapshot") {
    return transaction.account_to ?? "Счёт";
  }
  return transaction.counterparty ?? "Семейный профиль";
}

export function normalizeDashboard(raw: RawDashboard): DashboardData {
  const categoryTotal = raw.categories.reduce((sum, category) => sum + category.amount_cents, 0);
  const missingCurrencies = Array.from(
    new Set(raw.accounts.filter((account) => account.rate_missing).map((account) => account.currency)),
  );
  const monthLabel = dateLabel(raw.month.start, { month: "long", year: "numeric" });
  const normalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const completedParticipants = new Set(
    raw.reconciliation.missing.map((entry) => entry.person_key),
  ).size;

  return {
    meta: {
      generatedAt: `${raw.as_of}T12:00:00+03:00`,
      periodLabel: normalizedMonthLabel,
      timezone: "Europe/Moscow",
      fx: {
        status:
          raw.totals.partial || raw.month.partial || raw.cashflow_partial || missingCurrencies.length > 0
            ? "partial"
            : "complete",
        missingCurrencies,
        updatedAt: null,
      },
    },
    availableMoney: {
      amountMinor: raw.totals.available_cents,
      currency: raw.currency,
      changeMinor: raw.month.net_cents,
      changeLabel: "чистый поток за месяц",
    },
    month: {
      incomeMinor: raw.month.income_cents,
      expenseMinor: raw.month.expense_cents,
      currency: raw.currency,
    },
    cashflow: raw.cashflow.map((point) => ({
      date: point.date,
      incomeMinor: point.income_cents,
      expenseMinor: point.expense_cents,
    })),
    categories: raw.categories.map((category, index) => ({
      id: category.key || `${category.name}-${index}`,
      label: category.name,
      iconKey: category.icon_key || "receipt",
      color: category.color || "#95B1EE",
      amountMinor: category.amount_cents,
      currency: raw.currency,
      share: categoryTotal > 0 ? category.amount_cents / categoryTotal : 0,
    })),
    accounts: raw.accounts
      .filter((account) => !account.is_liability)
      .map((account) => ({
        id: account.key,
        name: account.name,
        group:
          account.group === "savings" || account.group === "cash"
            ? account.group
            : "operating",
        balanceMinor: account.amount_cents,
        currency: account.currency,
        convertedBalanceMinor: account.rub_cents,
        updatedAt: account.updated_at || `${raw.as_of}T12:00:00+03:00`,
        ownerKey: account.owner_key || "common",
        ownerName: account.owner_name || "Общий профиль",
        iconKey: account.icon_key || "wallet",
        color: account.color || "#95B1EE",
        avatarDataUrl: account.avatar_data_url || null,
      })),
    obligations: raw.obligations.map((obligation) => ({
      id: obligation.key,
      name: obligation.name,
      owner: normalizeOwner(obligation.owner),
      debtMinor: obligation.debt_cents,
      currency: raw.currency,
      minimumPaymentMinor: obligation.min_payment_cents,
      dueDate: obligation.due_date,
      availableCreditMinor: obligation.available_credit_cents,
    })),
    transactions: raw.recent_transactions.map((transaction) => ({
      id: String(transaction.id),
      occurredAt: `${transaction.date}T12:00:00+03:00`,
      title: transactionTitle(transaction),
      detail: transactionDetail(transaction),
      kind: normalizeKind(transaction.kind),
      amountMinor: transaction.amount_cents,
      currency: transaction.currency,
      status: "confirmed",
      actorKey: transaction.actor_person_key,
      actorName: transaction.actor_name || transaction.person_name,
      subjectKey: transaction.person_key,
      subjectName: transaction.person_name,
      categoryKey: transaction.category_key,
    })),
    people: (raw.people ?? []).map((person) => ({
      key: person.key,
      name: person.name,
      avatarDataUrl: person.avatar_data_url,
      accentColor: person.accent_color,
    })),
    goals: (raw.goals ?? []).map((goal) => ({
      id: goal.goal_id,
      ownerKey: goal.owner_person_key,
      ownerName: goal.owner_name,
      name: goal.name,
      targetMinor: goal.target_cents,
      currentMinor: goal.current_cents,
      currency: goal.currency,
      targetDate: goal.target_date,
      iconKey: goal.icon_key,
      color: goal.color,
    })),
    reconciliation: {
      periodLabel: `${dateLabel(raw.reconciliation.period_start)} - ${dateLabel(raw.reconciliation.period_end)}`,
      status: raw.reconciliation.missing_count === 0 ? "complete" : "attention",
      completedParticipants: Math.max(0, 2 - completedParticipants),
      totalParticipants: 2,
      openIssues: raw.reconciliation.missing_count,
      nextAction:
        raw.reconciliation.missing_count === 0
          ? "Оба участника подтвердили период. Расхождений нет."
          : `Нужно закрыть ${raw.reconciliation.missing_count} несданных отчётов за период.`,
    },
  };
}

function demoDashboardForPeriod(period: string): DashboardData {
  if (demoDashboard.meta.generatedAt.slice(0, 7) === period) return demoDashboard;
  const transactions = demoDashboard.transactions.filter(
    (transaction) => transaction.occurredAt.slice(0, 7) === period,
  );
  const incomeMinor = transactions
    .filter((transaction) => transaction.kind === "income")
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);
  const expenseMinor = transactions
    .filter((transaction) => transaction.kind === "expense")
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);
  const end = periodEnd(period);
  const endDate = new Date(`${end}T12:00:00+03:00`);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);
  const shortDate = (date: Date) => new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  }).format(date);

  return {
    ...demoDashboard,
    meta: {
      ...demoDashboard.meta,
      generatedAt: `${end}T12:00:00+03:00`,
      periodLabel: periodLabel(period),
    },
    availableMoney: {
      ...demoDashboard.availableMoney,
      changeMinor: incomeMinor - expenseMinor,
      changeLabel: "чистый поток за месяц",
    },
    month: {
      ...demoDashboard.month,
      incomeMinor,
      expenseMinor,
    },
    cashflow: demoDashboard.cashflow.filter((point) => point.date.startsWith(period)),
    categories: [],
    transactions,
    reconciliation: {
      ...demoDashboard.reconciliation,
      periodLabel: `${shortDate(startDate)} - ${shortDate(endDate)}`,
      status: "complete",
      completedParticipants: 2,
      openIssues: 0,
      nextAction: "За выбранный период открытых вопросов нет.",
    },
  };
}

export async function getDashboard(period: string, signal?: AbortSignal): Promise<DashboardResult> {
  try {
    const devUser = import.meta.env.VITE_FINANCE_DEV_USER;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (devUser) headers["X-Finance-Dev-User"] = devUser;

    const response = await fetch(`/api/v1/dashboard?period=${encodeURIComponent(period)}`, {
      method: "GET",
      headers,
      credentials: "same-origin",
      signal,
    });

    if (!response.ok) {
      throw new Error(`Dashboard API returned ${response.status}`);
    }

    const payload: unknown = await response.json();
    const candidate =
      payload && typeof payload === "object" && "data" in payload
        ? (payload as { data: unknown }).data
        : payload;

    const data = isDashboardData(candidate)
      ? candidate
      : isRawDashboard(candidate)
        ? normalizeDashboard(candidate)
        : null;

    if (!data) throw new Error("Dashboard API returned an unsupported payload");

    return { data, source: "api" };
  } catch (error) {
    if (signal?.aborted) throw error;
    if (import.meta.env.VITE_FINANCE_DEMO === "true") {
      return { data: demoDashboardForPeriod(period), source: "demo" };
    }
    throw error;
  }
}
