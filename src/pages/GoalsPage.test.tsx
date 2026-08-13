import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoDashboard } from "../data/demo";
import { GoalsPage, savingPace } from "./GoalsPage";

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
  };
}

describe("goals page", () => {
  it("raises the daily and monthly saving pace as the deadline comes closer", () => {
    const goal = {
      ...demoDashboard.goals[0],
      currentMinor: 0,
      targetMinor: 300_000,
      targetDate: "2026-09-10",
    };

    const atMonthStart = savingPace(goal, new Date("2026-08-01T12:00:00"));
    const laterInMonth = savingPace(goal, new Date("2026-08-21T12:00:00"));

    expect(atMonthStart?.status).toBe("active");
    expect(laterInMonth?.dailyMinor).toBeGreaterThan(atMonthStart?.dailyMinor ?? 0);
    expect(laterInMonth?.monthlyMinor).toBeGreaterThan(atMonthStart?.monthlyMinor ?? 0);
  });

  it("moves money between demo accounts and adds it to the selected goal", () => {
    const onDataChange = vi.fn();
    render(<GoalsPage {...pageProps()} onDataChange={onDataChange} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Пополнить" })[0]);
    fireEvent.change(screen.getByLabelText(/Сумма пополнения/), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Перевести и пополнить" }));

    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      goals: expect.arrayContaining([expect.objectContaining({ id: "trip", currentMinor: 84_100_00 })]),
      accounts: expect.arrayContaining([
        expect.objectContaining({ id: "tbank", balanceMinor: 64_400_00 }),
        expect.objectContaining({ id: "alfa_savings", balanceMinor: 25_100_00 }),
      ]),
      transactions: expect.arrayContaining([expect.objectContaining({
        title: "Пополнение цели «Отпуск»",
        amountMinor: 10_000,
        kind: "transfer",
      })]),
    }));
  });
});
