import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentCsrfToken, getOrCreateSession } from "./session";

describe("web session", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("restores the CSRF token when an existing cookie session is reopened", async () => {
    const restoredToken = "c".repeat(64);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      user: { key: "person-1", name: "Участник 1", auth_method: "telegram_browser_pairing" },
      capabilities: { read: true, write: true, demo: false },
      csrf_token: restoredToken,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    const session = await getOrCreateSession();

    expect(session?.csrfToken).toBe(restoredToken);
    expect(currentCsrfToken()).toBe(restoredToken);
  });
});
