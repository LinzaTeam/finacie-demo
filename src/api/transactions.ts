import { currentCsrfToken } from "./session";

export type TransactionCommand = {
  op_date: string;
  kind: "card_payment" | "income";
  amount_cents: number;
  account_from?: string;
  account_to?: string;
  category?: string;
  category_custom?: string;
  expense_owner?: string;
  note?: string;
};

export async function createTransaction(command: TransactionCommand): Promise<void> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Idempotency-Key": `web:${crypto.randomUUID()}`,
  };
  const devUser = import.meta.env.VITE_FINANCE_DEV_USER;
  if (devUser) headers["X-Finance-Dev-User"] = devUser;
  const csrf = currentCsrfToken();
  if (csrf) headers["X-Finance-CSRF"] = csrf;
  const response = await fetch("/api/v1/transactions", {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: JSON.stringify(command),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || `Transaction API returned ${response.status}`);
  }
}
