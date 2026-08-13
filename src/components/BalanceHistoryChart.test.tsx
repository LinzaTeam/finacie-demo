import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BalanceHistoryChart, buildBalanceSeries } from "./BalanceHistoryChart";

describe("BalanceHistoryChart", () => {
  const points = [
    { date: "2026-08-03", incomeMinor: 60_000_00, expenseMinor: 16_000_00 },
    { date: "2026-08-07", incomeMinor: 0, expenseMinor: 22_000_00 },
    { date: "2026-08-12", incomeMinor: 0, expenseMinor: 14_000_00 },
  ];

  it("reconstructs a daily balance line ending at the current balance", () => {
    const series = buildBalanceSeries(148_000_00, "2026-08-12T12:00:00+03:00", "2026-08", points);

    expect(series).toHaveLength(12);
    expect(series[0]).toMatchObject({ date: "2026-08-01", balanceMinor: 140_000_00, changeMinor: 0 });
    expect(series[2]).toMatchObject({ date: "2026-08-03", balanceMinor: 184_000_00, changeMinor: 44_000_00 });
    expect(series.at(-1)).toMatchObject({ date: "2026-08-12", balanceMinor: 148_000_00, changeMinor: -14_000_00 });
  });

  it("exposes the chart and current-day marker to assistive technology", () => {
    const { container } = render(
      <BalanceHistoryChart
        currentBalanceMinor={148_000_00}
        currency="RUB"
        generatedAt="2026-08-12T12:00:00+03:00"
        period="2026-08"
        periodLabel="Август 2026"
        points={points}
      />,
    );

    expect(screen.getByRole("img", { name: /Баланс по дням за Август 2026/ })).toBeInTheDocument();
    expect(container.querySelector(".balance-chart-current-point")).toBeInTheDocument();
    expect(container.querySelectorAll(".balance-chart-y-label")).toHaveLength(4);
    expect(Number(container.querySelector(".balance-chart-y-label")?.getAttribute("x"))).toBeGreaterThanOrEqual(60);
  });

  it("shows a daily balance and change on focus and supports arrow-key navigation", () => {
    render(
      <BalanceHistoryChart
        currentBalanceMinor={148_000_00}
        currency="RUB"
        generatedAt="2026-08-12T12:00:00+03:00"
        period="2026-08"
        periodLabel="Август 2026"
        points={points}
      />,
    );

    const chart = screen.getByRole("img", { name: /Баланс по дням за Август 2026/ });
    fireEvent.focus(chart);
    expect(screen.getByText(/12 августа 2026/, { selector: "time" })).toBeInTheDocument();
    expect(screen.getByText(/14.000.*за день/, { selector: ".balance-chart-tooltip span" })).toBeInTheDocument();

    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(screen.getByText(/11 августа 2026/, { selector: "time" })).toBeInTheDocument();
    expect(screen.getByText("Без изменений за день", { selector: ".balance-chart-tooltip span" })).toBeInTheDocument();
  });
});
