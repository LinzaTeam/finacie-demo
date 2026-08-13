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
  exchange_rates?: {
    source?: string;
    effective_date?: string | null;
    fetched_at?: string | null;
    items?: Array<{ currency: string; rub_per_unit: string | number }>;
  };
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
  planned?: {
    income_cents: number;
    expense_cents: number;
    mandatory_expense_cents?: number;
    category_budget_cents?: number;
    partial?: boolean;
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
    owner_name?: string | null;
    source?: "credit_card" | "manual";
    debt_cents: number;
    currency?: string;
    credit_limit_cents?: number | null;
    available_credit_cents: number | null;
    min_payment_cents: number | null;
    due_date: string | null;
    recurrence?: "once" | "monthly";
    account_key?: string | null;
    note?: string | null;
  }>;
  planned_payments?: Array<{
    id: string;
    name: string;
    kind: "income" | "expense";
    owner_key: string;
    owner_name?: string | null;
    amount_cents: number;
    currency: string;
    due_date: string;
    recurrence?: "once" | "monthly";
    account_key?: string | null;
    category_key?: string | null;
    note?: string | null;
  }>;
  monthly_category_budgets?: Array<{
    period: string;
    person_key: string;
    person_name: string;
    category_key: string;
    amount_cents: number;
    currency?: string;
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
    counterparty_key?: string | null;
    counterparty_type?: string | null;
  }>;
  people?: Array<{
    key: string;
    name: string;
    avatar_data_url: string | null;
    accent_color: string;
  }>;
  goals?: Array<{
    goal_id: string;
    owner_person_key: string | null;
    owner_name: string;
    name: string;
    target_cents: number;
    current_cents: number;
    currency: string;
    target_date: string | null;
    icon_key: string;
    color: string;
  }>;
  attention?: {
    total_count?: number;
    duplicate_reviews?: Array<{
      token: string;
      created_at?: string | null;
      requester_key?: string;
      requester_name?: string;
      reviewer_key?: string;
      reviewer_name?: string;
      transaction?: {
        title?: string;
        detail?: string | null;
        kind?: "income" | "expense";
        amount_cents?: number;
        currency?: string;
        date?: string | null;
      };
      existing?: {
        transaction_id?: string | number | null;
        title?: string;
        amount_cents?: number;
        date?: string | null;
      };
    }>;
    reminders?: Array<{
      id: string;
      kind: "planned_payment" | "obligation";
      name: string;
      detail: string;
      due_date: string;
      amount_cents: number;
      currency: string;
      owner_key: string;
      owner_name: string;
      operation_kind: "income" | "expense";
      account_key?: string | null;
      category_key?: string | null;
    }>;
  };
  reconciliation: {
    period_start: string;
    period_end: string;
    automatic?: boolean;
    confirmed_transaction_count?: number;
    missing_count?: number;
    missing?: Array<{ person_key: string; person_name: string; date: string }>;
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
  const cbrRates = (raw.exchange_rates?.items ?? [])
    .map((item) => ({ currency: item.currency, rubPerUnit: Number(item.rub_per_unit) }))
    .filter((item) => Number.isFinite(item.rubPerUnit));

  return {
    meta: {
      generatedAt: `${raw.as_of}T12:00:00+03:00`,
      periodLabel: normalizedMonthLabel,
      timezone: "Europe/Moscow",
      fx: {
        status:
          raw.totals.partial || raw.month.partial || raw.cashflow_partial || raw.planned?.partial || missingCurrencies.length > 0
            ? "partial"
            : "complete",
        missingCurrencies,
        updatedAt: raw.exchange_rates?.fetched_at ?? null,
        source: raw.exchange_rates?.source ?? null,
        effectiveDate: raw.exchange_rates?.effective_date ?? null,
        rates: cbrRates,
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
    plan: raw.planned ? {
      budgetMinor: raw.planned.expense_cents,
      currency: raw.currency,
      incomeMinor: raw.planned.income_cents,
      expenseMinor: raw.planned.expense_cents,
      mandatoryExpenseMinor: raw.planned.mandatory_expense_cents ?? raw.planned.expense_cents,
      categoryBudgetMinor: raw.planned.category_budget_cents ?? 0,
    } : undefined,
    monthlyCategoryBudgets: (raw.monthly_category_budgets ?? []).map((budget) => ({
      period: budget.period,
      personKey: budget.person_key,
      personName: budget.person_name,
      categoryKey: budget.category_key,
      amountMinor: budget.amount_cents,
      currency: budget.currency || raw.currency,
    })),
    obligations: raw.obligations.map((obligation) => ({
      id: obligation.key,
      name: obligation.name,
      owner: obligation.owner_name || normalizeOwner(obligation.owner),
      ownerKey: obligation.owner,
      source: obligation.source || "credit_card",
      debtMinor: obligation.debt_cents,
      currency: obligation.currency || raw.currency,
      minimumPaymentMinor: obligation.min_payment_cents,
      dueDate: obligation.due_date,
      creditLimitMinor: obligation.credit_limit_cents ?? null,
      availableCreditMinor: obligation.available_credit_cents,
      recurrence: obligation.recurrence || "monthly",
      accountKey: obligation.account_key || null,
      note: obligation.note || null,
    })),
    plannedPayments: (raw.planned_payments ?? []).map((payment) => ({
      id: payment.id,
      name: payment.name,
      kind: payment.kind,
      ownerKey: payment.owner_key,
      ownerName: payment.owner_name || normalizeOwner(payment.owner_key),
      amountMinor: payment.amount_cents,
      currency: payment.currency,
      dueDate: payment.due_date,
      recurrence: payment.recurrence || "monthly",
      accountKey: payment.account_key || null,
      categoryKey: payment.category_key || null,
      note: payment.note || null,
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
      counterpartyKey: transaction.counterparty_key || undefined,
      counterpartyName: transaction.counterparty || undefined,
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
    attention: {
      total: raw.attention?.duplicate_reviews?.length ?? 0,
      duplicates: (raw.attention?.duplicate_reviews ?? []).map((review) => ({
        token: review.token,
        createdAt: review.created_at ?? null,
        requesterKey: review.requester_key ?? "",
        requesterName: review.requester_name ?? "Участник",
        reviewerKey: review.reviewer_key ?? "",
        reviewerName: review.reviewer_name ?? "Участник",
        transaction: {
          title: review.transaction?.title ?? "Операция",
          detail: review.transaction?.detail ?? null,
          kind: review.transaction?.kind ?? "expense",
          amountMinor: review.transaction?.amount_cents ?? 0,
          currency: review.transaction?.currency ?? raw.currency,
          date: review.transaction?.date ?? null,
        },
        existing: {
          transactionId: review.existing?.transaction_id == null ? null : String(review.existing.transaction_id),
          title: review.existing?.title ?? "Похожая операция",
          amountMinor: review.existing?.amount_cents ?? 0,
          date: review.existing?.date ?? null,
        },
      })),
      reminders: (raw.attention?.reminders ?? []).map((reminder) => ({
        id: reminder.id,
        kind: reminder.kind,
        name: reminder.name,
        detail: reminder.detail,
        dueDate: reminder.due_date,
        amountMinor: reminder.amount_cents,
        currency: reminder.currency,
        ownerKey: reminder.owner_key,
        ownerName: reminder.owner_name,
        operationKind: reminder.operation_kind,
        accountKey: reminder.account_key ?? null,
        categoryKey: reminder.category_key ?? null,
      })),
    },
    reconciliation: {
      periodLabel: `${dateLabel(raw.reconciliation.period_start)} - ${dateLabel(raw.reconciliation.period_end)}`,
      status: "complete",
      completedParticipants: raw.people?.length ?? 0,
      totalParticipants: raw.people?.length ?? 0,
      openIssues: raw.attention?.duplicate_reviews?.length ?? 0,
      nextAction: raw.reconciliation.automatic
        ? `Учтено подтверждённых операций за 7 дней: ${raw.reconciliation.confirmed_transaction_count ?? 0}.`
        : "В итог попадают только подтверждённые операции.",
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
    monthlyCategoryBudgets: [],
    plan: demoDashboard.plan ? {
      ...demoDashboard.plan,
      budgetMinor: demoDashboard.plan.mandatoryExpenseMinor ?? 0,
      expenseMinor: demoDashboard.plan.mandatoryExpenseMinor ?? 0,
      categoryBudgetMinor: 0,
    } : undefined,
    transactions,
    attention: {
      total: 0,
      duplicates: [],
      reminders: [],
    },
    reconciliation: {
      ...demoDashboard.reconciliation,
      periodLabel: `${shortDate(startDate)} - ${shortDate(endDate)}`,
      status: "complete",
      completedParticipants: 2,
      openIssues: 0,
      nextAction: "Учтены только подтверждённые операции за выбранный период.",
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
