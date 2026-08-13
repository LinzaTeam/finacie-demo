import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./api/dashboard", () => ({ getDashboard: vi.fn() }));
vi.mock("./api/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/session")>();
  return {
    ...actual,
    getOrCreateSession: vi.fn(),
    getAuthConfig: vi.fn(),
    logoutSession: vi.fn(),
    startBrowserLogin: vi.fn(),
    pollBrowserLogin: vi.fn(),
  };
});
vi.mock("./api/transactions", () => ({ createTransaction: vi.fn() }));

import { App } from "./App";
import { getDashboard } from "./api/dashboard";
import { demoSession, getAuthConfig, getOrCreateSession, startBrowserLogin } from "./api/session";
import { createTransaction } from "./api/transactions";
import { demoDashboard } from "./data/demo";

describe("app overlays", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(getOrCreateSession).mockResolvedValue(demoSession);
    vi.mocked(getDashboard).mockResolvedValue({ data: demoDashboard, source: "demo" });
    window.history.replaceState(null, "", "#/overview");
    document.body.style.overflow = "";
  });

  it("shows the secure Telegram entry instead of loading financial data without a session", async () => {
    vi.mocked(getOrCreateSession).mockResolvedValueOnce(null);
    vi.mocked(getAuthConfig).mockResolvedValueOnce({
      telegram_auth_enabled: true,
      browser_pairing_enabled: true,
      telegram_bot_username: "family_finance_bot",
      telegram_login_url: "https://t.me/family_finance_bot",
      public_url: "https://finance.example.test",
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: /Деньги семьи/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть в Telegram" })).toHaveAttribute(
      "href",
      "https://t.me/family_finance_bot",
    );
    expect(getDashboard).not.toHaveBeenCalled();
  });

  it("gives a desktop browser a one-time command for Telegram confirmation", async () => {
    vi.mocked(getOrCreateSession).mockResolvedValueOnce(null);
    vi.mocked(getAuthConfig).mockResolvedValueOnce({
      telegram_auth_enabled: true,
      browser_pairing_enabled: true,
      telegram_bot_username: "family_finance_bot",
      telegram_login_url: "https://t.me/family_finance_bot",
      public_url: "https://finance.example.test",
    });
    vi.mocked(startBrowserLogin).mockResolvedValue({
      challenge_token: "x".repeat(43),
      code: "AB12-CD34",
      expires_in: 300,
    });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Войти с кодом" }));

    expect(await screen.findByText("/web AB12-CD34")).toBeInTheDocument();
    expect(screen.getByText(/вход завершится автоматически/i)).toBeInTheDocument();
  });

  it("replaces QuickAdd with global search on Ctrl+K and restores scrolling", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Новая операция" }));
    expect(screen.getByRole("dialog", { name: "Новая операция" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Новая операция" })).not.toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "Найдите что угодно" })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Найдите что угодно" })).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe("");
    });
  });

  it("keeps operation writes inside the public demo session", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Новая операция" }));
    fireEvent.change(screen.getByLabelText("Напишите как есть"), {
      target: { value: "Кофе 420 с Т-Банк" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Готово" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Новая операция" })).not.toBeInTheDocument();
    });
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("opens the new-goal dialog from the goals grid card", async () => {
    window.history.replaceState(null, "", "#/goals");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Создать новую цель" }));
    expect(screen.getByPlaceholderText("Например, Отпуск")).toBeInTheDocument();
  });

  it("switches to a focused mode from settings and leaves only daily actions", async () => {
    window.history.replaceState(null, "", "#/settings");
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Режим" }));
    fireEvent.click(screen.getByRole("button", { name: "Включить простой режим" }));

    expect(await screen.findByText("Простой режим включён")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Сегодня" })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "Аналитика" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Открыть полный режим" }));
    expect(await screen.findByRole("button", { name: "Профиль" })).toBeInTheDocument();
  });
});
