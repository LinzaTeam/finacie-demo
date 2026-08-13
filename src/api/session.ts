export type WebSession = {
  user: {
    key: string;
    name: string;
    telegram_id?: number;
    auth_method?: string;
    avatar_data_url?: string | null;
    accent_color?: string;
  };
  capabilities: {
    read: boolean;
    write: boolean;
    demo: boolean;
  };
  csrfToken: string | null;
};

export type AuthConfig = {
  telegram_auth_enabled: boolean;
  browser_pairing_enabled: boolean;
  telegram_bot_username: string | null;
  telegram_login_url: string | null;
  public_url: string | null;
};

export type BrowserLoginChallenge = {
  challenge_token: string;
  code: string;
  expires_in: number;
};

export class SessionApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "SessionApiError";
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

const CSRF_STORAGE_KEY = "financier-csrf";

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const devUser = import.meta.env.VITE_FINANCE_DEV_USER;
  if (devUser) headers["X-Finance-Dev-User"] = devUser;
  return headers;
}

async function readSession(signal?: AbortSignal): Promise<WebSession> {
  const response = await fetch("/api/v1/session", {
    headers: requestHeaders(),
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) throw new SessionApiError(response.status, `Session API returned ${response.status}`);
  const payload = await response.json() as Omit<WebSession, "csrfToken">;
  return {
    ...payload,
    csrfToken: window.sessionStorage.getItem(CSRF_STORAGE_KEY),
  };
}

export async function getOrCreateSession(signal?: AbortSignal): Promise<WebSession | null> {
  try {
    return await readSession(signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    if (!(error instanceof SessionApiError) || error.status !== 401) throw error;
  }

  const telegram = window.Telegram?.WebApp;
  const initData = telegram?.initData?.trim();
  if (!initData) return null;
  telegram?.ready?.();
  telegram?.expand?.();
  const response = await fetch("/api/v1/auth/telegram", {
    method: "POST",
    headers: { ...requestHeaders(), "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ init_data: initData }),
    signal,
  });
  if (!response.ok) {
    let detail = `Telegram login returned ${response.status}`;
    try {
      const payload = await response.json() as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      // The status code still gives the UI a safe fallback message.
    }
    throw new SessionApiError(response.status, detail);
  }
  const login = await response.json() as {
    user: WebSession["user"];
    csrf_token: string;
  };
  window.sessionStorage.setItem(CSRF_STORAGE_KEY, login.csrf_token);
  return readSession(signal);
}

export async function getAuthConfig(signal?: AbortSignal): Promise<AuthConfig> {
  const response = await fetch("/api/v1/auth/config", {
    headers: requestHeaders(),
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) throw new SessionApiError(response.status, `Auth config returned ${response.status}`);
  return response.json() as Promise<AuthConfig>;
}

export async function startBrowserLogin(signal?: AbortSignal): Promise<BrowserLoginChallenge> {
  const response = await fetch("/api/v1/auth/browser/start", {
    method: "POST",
    headers: { ...requestHeaders(), "Content-Type": "application/json" },
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) throw new SessionApiError(response.status, "Не удалось получить код входа");
  return response.json() as Promise<BrowserLoginChallenge>;
}

export async function pollBrowserLogin(
  challengeToken: string,
  signal?: AbortSignal,
): Promise<"pending" | WebSession> {
  const response = await fetch("/api/v1/auth/browser/poll", {
    method: "POST",
    headers: { ...requestHeaders(), "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ challenge_token: challengeToken }),
    signal,
  });
  if (!response.ok) {
    let detail = "Код входа больше недоступен";
    try {
      detail = (await response.json() as { detail?: string }).detail || detail;
    } catch {
      // The fallback is safe and actionable without server internals.
    }
    throw new SessionApiError(response.status, detail);
  }
  const payload = await response.json() as {
    status: "pending" | "authenticated";
    csrf_token?: string;
  };
  if (payload.status === "pending") return "pending";
  if (payload.csrf_token) window.sessionStorage.setItem(CSRF_STORAGE_KEY, payload.csrf_token);
  return readSession(signal);
}

export async function logoutSession(signal?: AbortSignal): Promise<void> {
  const csrfToken = currentCsrfToken();
  const response = await fetch("/api/v1/auth/logout", {
    method: "POST",
    headers: {
      ...requestHeaders(),
      ...(csrfToken ? { "X-Finance-CSRF": csrfToken } : {}),
    },
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) throw new SessionApiError(response.status, `Logout returned ${response.status}`);
  window.sessionStorage.removeItem(CSRF_STORAGE_KEY);
}

export function currentCsrfToken(): string | null {
  return window.sessionStorage.getItem(CSRF_STORAGE_KEY);
}

export const demoSession: WebSession = {
  user: { key: "person-1", name: "Участник 1", accent_color: "#364C84" },
  capabilities: { read: true, write: true, demo: true },
  csrfToken: null,
};
