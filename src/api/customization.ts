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
  owner_person_key: string;
  name: string;
  target_cents: number;
  current_cents: number;
  currency: string;
  target_date: string | null;
  icon_key: string;
  color: string;
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
