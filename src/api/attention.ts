import { currentCsrfToken } from "./session";

export async function resolveDuplicateReview(
  token: string,
  decision: "approved" | "rejected",
): Promise<void> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const csrf = currentCsrfToken();
  if (csrf) headers["X-Finance-CSRF"] = csrf;
  const devUser = import.meta.env.VITE_FINANCE_DEV_USER;
  if (devUser) headers["X-Finance-Dev-User"] = devUser;

  const response = await fetch(`/api/v1/attention/duplicates/${encodeURIComponent(token)}`, {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: JSON.stringify({ decision }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || `Duplicate review API returned ${response.status}`);
  }
}
