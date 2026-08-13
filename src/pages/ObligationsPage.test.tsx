import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoDashboard } from "../data/demo";
import { ObligationsPage } from "./ObligationsPage";

const manualObligation = {
  id: "manual:lease",
  name: "Рассрочка за технику",
  owner: "Участник 1",
  ownerKey: "person-1",
  source: "manual" as const,
  debtMinor: 48_000_00,
  currency: "RUB",
  minimumPaymentMinor: 4_000_00,
  dueDate: "2026-08-20",
  creditLimitMinor: null,
  availableCreditMinor: null,
  recurrence: "monthly" as const,
  accountKey: "tbank",
  note: "Оплатить до даты",
};

const cardObligation = {
  id: "credit:tbank",
  name: "Кредитная карта Т-Банк",
  owner: "Участник 1",
  ownerKey: "person-1",
  source: "credit_card" as const,
  debtMinor: 24_500_00,
  currency: "RUB",
  minimumPaymentMinor: 3_500_00,
  dueDate: "2026-08-22",
  creditLimitMinor: 100_000_00,
  availableCreditMinor: 75_500_00,
  recurrence: "monthly" as const,
  accountKey: "tbank",
  note: null,
};

function pageProps(canWrite = true, source: "demo" | "api" = "demo") {
  return {
    data: { ...demoDashboard, obligations: [manualObligation, cardObligation] },
    source,
    theme: "light" as const,
    onThemeToggle: vi.fn(),
    onNewOperation: vi.fn(),
    onSearch: vi.fn(),
    activeUser: "Участник 1",
    activeUserKey: "person-1",
    selectedPeriod: "2026-08",
    onPeriodChange: vi.fn(),
    canWrite,
  };
}

describe("obligations page", () => {
  it("creates and edits a manual obligation in the current demo session", () => {
    const onDataChange = vi.fn();
    render(<ObligationsPage {...pageProps()} onDataChange={onDataChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Настроить обязательство Рассрочка за технику" }));
    fireEvent.change(screen.getByLabelText("Текущий долг, ₽"), { target: { value: "47500" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      obligations: expect.arrayContaining([expect.objectContaining({
        id: "manual:lease",
        debtMinor: 47_500_00,
        ownerKey: "person-1",
      })]),
    }));
  });

  it("lets an authenticated participant record an obligation for the other participant", () => {
    const onDataChange = vi.fn();
    render(<ObligationsPage {...pageProps()} onDataChange={onDataChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Новое обязательство" }));
    fireEvent.change(screen.getByLabelText("Название"), { target: { value: "Рассрочка за ноутбук" } });
    fireEvent.change(screen.getByLabelText("Чьё обязательство"), { target: { value: "person-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      obligations: expect.arrayContaining([expect.objectContaining({
        name: "Рассрочка за ноутбук",
        owner: "Участник 2",
        ownerKey: "person-2",
      })]),
    }));
  });

  it("configures a linked credit card directly from the obligation card", () => {
    const onDataChange = vi.fn();
    render(<ObligationsPage {...pageProps()} onDataChange={onDataChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Настроить обязательство Кредитная карта Т-Банк" }));
    fireEvent.change(screen.getByLabelText("Текущий долг карты, ₽"), { target: { value: "26000" } });
    fireEvent.change(screen.getByLabelText("Кредитный лимит, ₽"), { target: { value: "110000" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      obligations: expect.arrayContaining([expect.objectContaining({
        id: "credit:tbank",
        debtMinor: 26_000_00,
        creditLimitMinor: 110_000_00,
        availableCreditMinor: 84_000_00,
      })]),
    }));
  });

  it("disables all obligation writes in read-only mode", () => {
    render(<ObligationsPage {...pageProps(false, "api")} />);

    expect(screen.getByRole("button", { name: "Новое обязательство" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Настроить обязательство Рассрочка за технику" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Настроить обязательство Кредитная карта Т-Банк" })).toBeDisabled();
  });

  it("shows a direct, confirmed deletion flow for demo obligations", () => {
    const onDataChange = vi.fn();
    render(<ObligationsPage {...pageProps()} onDataChange={onDataChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Удалить обязательство Рассрочка за технику" }));
    const dialog = screen.getByRole("dialog", { name: "Удалить обязательство?" });
    expect(dialog).toHaveTextContent("будет убрано из демо до обновления страницы");

    fireEvent.click(within(dialog).getByRole("button", { name: "Удалить" }));
    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      obligations: [cardObligation],
    }));
  });
});
