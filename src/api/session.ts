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
  if (!response.ok) throw new Error(`Session API returned ${response.status}`);
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
  if (!response.ok) throw new Error(`Telegram login returned ${response.status}`);
  const login = await response.json() as {
    user: WebSession["user"];
    csrf_token: string;
  };
  window.sessionStorage.setItem(CSRF_STORAGE_KEY, login.csrf_token);
  return readSession(signal);
}

export function currentCsrfToken(): string | null {
  return window.sessionStorage.getItem(CSRF_STORAGE_KEY);
}

export const demoSession: WebSession = {
  user: { key: "person-1", name: "Участник 1", accent_color: "#364C84" },
  capabilities: { read: true, write: true, demo: true },
  csrfToken: null,
};
