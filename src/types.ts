export type CurrencyCode = "RUB" | "USD" | "EUR" | string;

export type Money = {
  amountMinor: number;
  currency: CurrencyCode;
};

export type FxStatus = "complete" | "partial";

export type DashboardData = {
  meta: {
    generatedAt: string;
    periodLabel: string;
    timezone: string;
    fx: {
      status: FxStatus;
      missingCurrencies: CurrencyCode[];
      updatedAt: string | null;
      source?: string | null;
      effectiveDate?: string | null;
      rates?: Array<{ currency: CurrencyCode; rubPerUnit: number }>;
    };
  };
  availableMoney: Money & {
    changeMinor: number;
    changeLabel: string;
  };
  month: {
    incomeMinor: number;
    expenseMinor: number;
    currency: CurrencyCode;
  };
  plan?: {
    budgetMinor: number;
    currency: CurrencyCode;
    incomeMinor?: number;
    expenseMinor?: number;
    mandatoryExpenseMinor?: number;
    categoryBudgetMinor?: number;
  };
  monthlyCategoryBudgets: Array<{
    period: string;
    personKey: string;
    personName: string;
    categoryKey: string;
    amountMinor: number;
    currency: CurrencyCode;
  }>;
  cashflow: Array<{
    date: string;
    incomeMinor: number;
    expenseMinor: number;
  }>;
  categories: Array<{
    id: string;
    label: string;
    iconKey: string;
    color: string;
    amountMinor: number;
    currency: CurrencyCode;
    share: number;
  }>;
  accounts: Array<{
    id: string;
    name: string;
    group: "operating" | "savings" | "cash";
    balanceMinor: number;
    currency: CurrencyCode;
    convertedBalanceMinor: number | null;
    updatedAt: string;
    ownerKey: string;
    ownerName: string;
    iconKey: string;
    color: string;
    avatarDataUrl: string | null;
  }>;
  obligations: Array<{
    id: string;
    name: string;
    owner: string;
    ownerKey?: string;
    source?: "credit_card" | "manual";
    debtMinor: number;
    currency: CurrencyCode;
    minimumPaymentMinor: number | null;
    dueDate: string | null;
    creditLimitMinor: number | null;
    availableCreditMinor: number | null;
    recurrence?: "once" | "monthly";
    accountKey?: string | null;
    note?: string | null;
  }>;
  plannedPayments: Array<{
    id: string;
    name: string;
    kind: "income" | "expense";
    ownerKey: string;
    ownerName: string;
    amountMinor: number;
    currency: CurrencyCode;
    dueDate: string;
    recurrence: "once" | "monthly";
    accountKey: string | null;
    categoryKey: string | null;
    note: string | null;
  }>;
  transactions: Array<{
    id: string;
    occurredAt: string;
    title: string;
    detail: string;
    kind: "income" | "expense" | "transfer";
    amountMinor: number;
    currency: CurrencyCode;
    status: "confirmed" | "pending_review";
    actorKey?: string;
    actorName?: string;
    subjectKey?: string;
    subjectName?: string;
    categoryKey?: string;
    counterpartyKey?: string;
    counterpartyName?: string;
  }>;
  people: Array<{
    key: string;
    name: string;
    avatarDataUrl: string | null;
    accentColor: string;
  }>;
  goals: Array<{
    id: string;
    ownerKey: string | null;
    ownerName: string;
    name: string;
    targetMinor: number;
    currentMinor: number;
    currency: CurrencyCode;
    targetDate: string | null;
    iconKey: string;
    color: string;
  }>;
  attention: {
    total: number;
    duplicates: Array<{
      token: string;
      createdAt: string | null;
      requesterKey: string;
      requesterName: string;
      reviewerKey: string;
      reviewerName: string;
      transaction: {
        title: string;
        detail: string | null;
        kind: "income" | "expense";
        amountMinor: number;
        currency: CurrencyCode;
        date: string | null;
      };
      existing: {
        transactionId: string | null;
        title: string;
        amountMinor: number;
        date: string | null;
      };
    }>;
    reminders: Array<{
      id: string;
      kind: "planned_payment" | "obligation";
      name: string;
      detail: string;
      dueDate: string;
      amountMinor: number;
      currency: CurrencyCode;
      ownerKey: string;
      ownerName: string;
      operationKind: "income" | "expense";
      accountKey: string | null;
      categoryKey: string | null;
    }>;
  };
  reconciliation: {
    periodLabel: string;
    status: "complete" | "in_progress" | "attention";
    completedParticipants: number;
    totalParticipants: number;
    openIssues: number;
    nextAction: string;
  };
};

export function isDashboardData(value: unknown): value is DashboardData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<DashboardData>;
  return Boolean(
    data.meta &&
      data.availableMoney &&
      data.month &&
      data.reconciliation &&
      data.attention &&
      Array.isArray(data.cashflow) &&
      Array.isArray(data.categories) &&
      Array.isArray(data.accounts) &&
      Array.isArray(data.obligations) &&
      Array.isArray(data.plannedPayments) &&
      Array.isArray(data.monthlyCategoryBudgets) &&
      Array.isArray(data.transactions) &&
      Array.isArray(data.people) &&
      Array.isArray(data.goals),
  );
}

export type AnalyticsData = {
  periodStart: string;
  periodEnd: string;
  scope: "month" | "year";
  currency: CurrencyCode;
  partial: boolean;
  totals: { incomeMinor: number; expenseMinor: number; netMinor: number };
  people: Array<{
    key: string;
    name: string;
    avatarDataUrl: string | null;
    accentColor: string;
    incomeMinor: number;
    expenseMinor: number;
  }>;
  series: Array<{ bucket: string; incomeMinor: number; expenseMinor: number }>;
  categories: Array<{
    key: string;
    name: string;
    iconKey: string;
    color: string;
    amountMinor: number;
    people: Array<{ key: string; name: string; amountMinor: number }>;
  }>;
  counterparties: Array<{
    key: string;
    name: string;
    entityType: "company" | "person" | "merchant" | "platform" | "other";
    incomeMinor: number;
    expenseMinor: number;
    netMinor: number;
    transactionCount: number;
    lastSeen: string;
  }>;
};
