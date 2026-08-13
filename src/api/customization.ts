import { currentCsrfToken } from "./session";

function writeHeaders(idempotent = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (idempotent) headers["Idempotency-Key"] = `web:${crypto.randomUUID()}`;
  const devUser = import.meta.env.VITE_FINANCE_DEV_USER;
  if (devUser) headers["X-Finance-Dev-User"] = devUser;
  const csrf = currentCsrfToken();
  if (csrf) headers["X-Finance-CSRF"] = csrf;
  return headers;
}

async function writeJson(path: string, method: string, body?: unknown, idempotent = false): Promise<void> {
  const response = await fetch(path, {
    method,
    headers: writeHeaders(idempotent),
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || `API returned ${response.status}`);
  }
}

async function readJson<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const devUser = import.meta.env.VITE_FINANCE_DEV_USER;
  if (devUser) headers["X-Finance-Dev-User"] = devUser;
  const response = await fetch(path, { headers, credentials: "same-origin" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || `API returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export type ProfileInput = {
  display_name: string;
  avatar_data_url: string | null;
  accent_color: string;
};

export type AccountInput = {
  name: string;
  owner_person_key: string;
  group: "operating" | "savings" | "cash";
  currency: string;
  icon_key: string;
  color: string;
  avatar_data_url: string | null;
};

export type GoalInput = {
  owner_person_key: string | null;
  name: string;
  target_cents: number;
  current_cents: number;
  currency: string;
  target_date: string | null;
  icon_key: string;
  color: string;
};

export type GoalTopUpInput = {
  amount_cents: number;
  account_from: string;
  account_to: string;
  person_key: string;
};

export type PlannedPaymentInput = {
  name: string;
  kind: "income" | "expense";
  owner_person_key: string;
  amount_cents: number;
  currency: string;
  due_date: string;
  recurrence: "once" | "monthly";
  account_key: string | null;
  category_key: string | null;
  note: string | null;
};

export type ManualObligationInput = {
  name: string;
  owner_person_key: string;
  debt_cents: number;
  currency: string;
  min_payment_cents: number | null;
  due_date: string | null;
  recurrence: "once" | "monthly";
  account_key: string | null;
  note: string | null;
};

export type MonthlyCategoryBudgetEntry = {
  person_key: string;
  category_key: string;
  amount_cents: number;
};

export type BugReportStatus = "new" | "in_progress" | "fixed";

export type BugReport = {
  report_id: number;
  author_person_key: string;
  author_name: string;
  message: string;
  screenshots: string[];
  status: BugReportStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export function saveProfile(personKey: string, input: ProfileInput): Promise<void> {
  return writeJson(`/api/v1/profiles/${encodeURIComponent(personKey)}`, "PATCH", input);
}

export function saveAccount(accountKey: string, input: AccountInput): Promise<void> {
  return writeJson(`/api/v1/accounts/${encodeURIComponent(accountKey)}`, "PUT", input);
}

export function adjustBalance(
  accountKey: string,
  balanceCents: number,
  personKey: string,
  note?: string,
): Promise<void> {
  return writeJson(
    `/api/v1/accounts/${encodeURIComponent(accountKey)}/balance-adjustments`,
    "POST",
    { balance_cents: balanceCents, person_key: personKey, note },
    true,
  );
}

export function saveCategory(categoryKey: string, iconKey: string, color: string): Promise<void> {
  return writeJson(`/api/v1/categories/${encodeURIComponent(categoryKey)}`, "PUT", {
    label_override: null,
    icon_key: iconKey,
    color,
  });
}

export function saveGoal(goalId: string, input: GoalInput): Promise<void> {
  return writeJson(`/api/v1/goals/${encodeURIComponent(goalId)}`, "PUT", input);
}

export function deleteGoal(goalId: string): Promise<void> {
  return writeJson(`/api/v1/goals/${encodeURIComponent(goalId)}`, "DELETE");
}

export function topUpGoal(goalId: string, input: GoalTopUpInput): Promise<void> {
  return writeJson(
    `/api/v1/goals/${encodeURIComponent(goalId)}/top-ups`,
    "POST",
    input,
    true,
  );
}

export function savePlannedPayment(paymentId: string, input: PlannedPaymentInput): Promise<void> {
  return writeJson(`/api/v1/planned-payments/${encodeURIComponent(paymentId)}`, "PUT", input);
}

export function deletePlannedPayment(paymentId: string): Promise<void> {
  return writeJson(`/api/v1/planned-payments/${encodeURIComponent(paymentId)}`, "DELETE");
}

export function saveMonthlyCategoryBudgetPlan(
  period: string,
  budgets: MonthlyCategoryBudgetEntry[],
): Promise<void> {
  return writeJson(`/api/v1/monthly-budgets/${encodeURIComponent(period)}`, "PUT", { budgets });
}

export function saveManualObligation(obligationId: string, input: ManualObligationInput): Promise<void> {
  return writeJson(`/api/v1/obligations/${encodeURIComponent(obligationId)}`, "PUT", input);
}

export function deleteManualObligation(obligationId: string): Promise<void> {
  return writeJson(`/api/v1/obligations/${encodeURIComponent(obligationId)}`, "DELETE");
}

export async function getBugReports(status?: BugReportStatus): Promise<BugReport[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const payload = await readJson<{ items: BugReport[] }>(`/api/v1/bug-reports${query}`);
  return payload.items;
}

export async function createBugReport(input: {
  message: string;
  screenshots: string[];
}): Promise<BugReport> {
  const response = await fetch("/api/v1/bug-reports", {
    method: "POST",
    headers: writeHeaders(),
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || `API returned ${response.status}`);
  }
  return response.json() as Promise<BugReport>;
}

export async function updateBugReportStatus(
  reportId: number,
  status: BugReportStatus,
): Promise<BugReport> {
  const response = await fetch(`/api/v1/bug-reports/${reportId}`, {
    method: "PATCH",
    headers: writeHeaders(),
    credentials: "same-origin",
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || `API returned ${response.status}`);
  }
  return response.json() as Promise<BugReport>;
}
