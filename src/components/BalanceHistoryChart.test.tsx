import { render, screen } from "@testing-library/react";
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
    expect(series[0]).toMatchObject({ date: "2026-08-01", balanceMinor: 140_000_00 });
    expect(series.at(-1)).toMatchObject({ date: "2026-08-12", balanceMinor: 148_000_00 });
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
  });
});
