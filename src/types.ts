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
  };
  cashflow: Array<{
    date: string;
    incomeMinor: number;
    expenseMinor: number;
  }>;
  categories: Array<{
    id: string;
    label: string;
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
  }>;
  obligations: Array<{
    id: string;
    name: string;
    owner: string;
    debtMinor: number;
    currency: CurrencyCode;
    minimumPaymentMinor: number | null;
    dueDate: string | null;
    availableCreditMinor: number | null;
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
  }>;
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
      Array.isArray(data.cashflow) &&
      Array.isArray(data.categories) &&
      Array.isArray(data.accounts) &&
      Array.isArray(data.obligations) &&
      Array.isArray(data.transactions),
  );
}
