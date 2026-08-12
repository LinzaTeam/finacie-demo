import { currentCsrfToken } from "./session";

export type TransactionCommand = {
  op_date: string;
  kind: "card_payment" | "transfer_to_person" | "own_transfer" | "income";
  amount_cents: number;
  person_key?: string;
  account_from?: string;
  account_to?: string;
  category?: string;
  category_custom?: string;
  expense_owner?: string;
  source?: string;
  counterparty?: string;
  counterparty_key?: string;
  counterparty_type?: "company" | "person" | "merchant" | "platform" | "other";
  counterparty_recognition_source?: "explicit" | "history" | "import";
  counterparty_confidence?: number;
  note?: string;
};

export type OperationPreview = {
  title: string;
  amount_cents: number;
  kind: TransactionCommand["kind"];
  account_from: string | null;
  account_to: string | null;
  category: string | null;
  source: string | null;
  counterparty_key: string | null;
  counterparty: string | null;
  counterparty_type: "company" | "person" | "merchant" | "platform" | "other";
  learned_from_history: boolean;
  confidence: number;
  reasons: string[];
};

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const devUser = import.meta.env.VITE_FINANCE_DEV_USER;
  if (devUser) headers["X-Finance-Dev-User"] = devUser;
  return headers;
}

export async function previewTransaction(
  text: string,
  personKey: string,
  signal?: AbortSignal,
): Promise<OperationPreview> {
  const response = await fetch("/api/v1/transactions/preview", {
    method: "POST",
    headers: requestHeaders(),
    credentials: "same-origin",
    body: JSON.stringify({ text, person_key: personKey }),
    signal,
  });
  if (!response.ok) throw new Error(`Transaction preview returned ${response.status}`);
  return response.json() as Promise<OperationPreview>;
}

export async function createTransaction(command: TransactionCommand): Promise<void> {
  const headers: Record<string, string> = {
    ...requestHeaders(),
    "Idempotency-Key": `web:${crypto.randomUUID()}`,
  };
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
