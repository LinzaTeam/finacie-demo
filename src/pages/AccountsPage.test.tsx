import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoDashboard } from "../data/demo";
import { totalBalanceMinor } from "../lib/accountBalances";
import { formatMoney } from "../lib/format";
import { AccountsPage } from "./AccountsPage";

function pageProps() {
  return {
    data: demoDashboard,
    source: "demo" as const,
    theme: "light" as const,
    onThemeToggle: vi.fn(),
    onNewOperation: vi.fn(),
    onSearch: vi.fn(),
    activeUser: "Участник 1",
    activeUserKey: "person-1",
    selectedPeriod: "2026-08",
    onPeriodChange: vi.fn(),
    canWrite: true,
  };
}

describe("accounts page", () => {
  beforeEach(() => window.localStorage.clear());

  it("includes savings in the total by default and can hide them", () => {
    const { container } = render(<AccountsPage {...pageProps()} />);

    const balance = container.querySelector(".accounts-hero-total strong");
    expect(balance).toHaveTextContent(formatMoney(totalBalanceMinor(demoDashboard), "RUB").replaceAll("\u00a0", " "));
    const toggle = screen.getByRole("checkbox", { name: "Без накопительных" });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);
    expect(balance).toHaveTextContent(formatMoney(demoDashboard.availableMoney.amountMinor, "RUB").replaceAll("\u00a0", " "));
    expect(window.localStorage.getItem("financier-hide-savings-in-total")).toBe("true");
  });

  it("creates a savings account from the savings group", async () => {
    const onDataChange = vi.fn();
    render(<AccountsPage {...pageProps()} onDataChange={onDataChange} />);
    const savingsPanel = screen.getByRole("heading", { name: "Сбережения" }).closest(".account-group-panel");
    expect(savingsPanel).not.toBeNull();

    fireEvent.click(within(savingsPanel as HTMLElement).getByRole("button", { name: "Добавить" }));
    expect(screen.getByRole("heading", { name: "Новый накопительный счёт" })).toBeInTheDocument();
    expect(screen.getByLabelText("Тип счёта")).toHaveValue("savings");
    fireEvent.change(screen.getByLabelText("Название"), { target: { value: "Резерв на налоги" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      accounts: expect.arrayContaining([expect.objectContaining({
        name: "Резерв на налоги",
        group: "savings",
      })]),
    })));
  });
});
