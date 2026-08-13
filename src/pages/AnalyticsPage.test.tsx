import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoDashboard } from "../data/demo";
import type { AnalyticsData } from "../types";
import { AnalyticsPage, FlowLineChart } from "./AnalyticsPage";

describe("analytics page", () => {
  it("shows household totals and supports participant and year filters", async () => {
    render(
      <AnalyticsPage
        data={demoDashboard}
        source="demo"
        theme="light"
        onThemeToggle={vi.fn()}
        onNewOperation={vi.fn()}
        onSearch={vi.fn()}
        activeUser="Участник 1"
        selectedPeriod="2026-08"
        onPeriodChange={vi.fn()}
      />,
    );
    expect(await screen.findByText("Вклад участников")).toBeInTheDocument();
    expect(screen.getByLabelText("Участник")).toHaveClass("person-filter-select");
    fireEvent.change(screen.getByLabelText("Отрезок аналитики"), { target: { value: "custom" } });
    expect(screen.getByLabelText("Дата начала")).toHaveValue("2026-08-01");
    expect(screen.getByLabelText("Дата окончания")).toHaveValue("2026-08-31");
    fireEvent.change(screen.getByLabelText("Дата начала"), { target: { value: "2026-08-20" } });
    fireEvent.change(screen.getByLabelText("Дата окончания"), { target: { value: "2026-08-10" } });
    expect(await screen.findByText("Дата начала не может быть позже даты окончания.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Дата окончания"), { target: { value: "2026-08-31" } });
    fireEvent.change(screen.getByLabelText("Участник"), { target: { value: "person-2" } });
    fireEvent.click(screen.getByRole("button", { name: "По месяцам" }));
    await waitFor(() => {
      expect(screen.getByText("Динамика по месяцам")).toBeInTheDocument();
      expect(screen.getAllByText("Участник 2").length).toBeGreaterThan(1);
    });
    fireEvent.click(screen.getByRole("button", { name: "По годам" }));
    expect(await screen.findByText("Динамика по годам")).toBeInTheDocument();
  });

  it("shows the selected period and signed change on hover or keyboard focus", () => {
    const value: AnalyticsData = {
      periodStart: "2026-08-12",
      periodEnd: "2026-08-13",
      scope: "month",
      currency: "RUB",
      partial: false,
      totals: { incomeMinor: 250_000, expenseMinor: 200_000, netMinor: 50_000 },
      people: [],
      categories: [],
      counterparties: [],
      series: [
        { bucket: "2026-08-12", incomeMinor: 150_000, expenseMinor: 0 },
        { bucket: "2026-08-13", incomeMinor: 100_000, expenseMinor: 200_000 },
      ],
    };
    const { container } = render(<FlowLineChart value={value} />);
    const chart = screen.getByRole("img", { name: /Доходы и расходы по дням/ });

    fireEvent.focus(chart);
    let tooltip = container.querySelector(".flow-chart-tooltip");
    expect(tooltip).not.toBeNull();
    expect(within(tooltip as HTMLElement).getByText(/13 августа 2026/)).toBeInTheDocument();
    expect(within(tooltip as HTMLElement).getByText("−1 000 ₽")).toHaveClass("negative");

    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    tooltip = container.querySelector(".flow-chart-tooltip");
    expect(within(tooltip as HTMLElement).getByText(/12 августа 2026/)).toBeInTheDocument();
    expect(tooltip?.querySelector(".flow-chart-tooltip-net dd")).toHaveTextContent("+1 500 ₽");
    expect(tooltip?.querySelector(".flow-chart-tooltip-net dd")).toHaveClass("positive");
  });
});
