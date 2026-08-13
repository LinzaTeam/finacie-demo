import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoDashboard } from "../data/demo";
import { FinancialHealthPage } from "./FinancialHealthPage";

describe("financial health page", () => {
  it("shows the score, scenarios, risk map, and analysis sections", () => {
    const riskData = {
      ...demoDashboard,
      availableMoney: { ...demoDashboard.availableMoney, amountMinor: 1_000_00 },
    };
    render(
      <FinancialHealthPage
        data={riskData}
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

    expect(screen.getByRole("heading", { name: "Финансовое здоровье" })).toBeInTheDocument();
    expect(screen.getByText("Прогноз на 90 дней")).toBeInTheDocument();
    expect(screen.getByText("Карта рисков")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Короткий резерв ликвидности: вероятность 5, ущерб 4, оценка 20/ })).toHaveTextContent("Резерв20");
    expect(screen.getByRole("link", { name: /Высокая долговая нагрузка: вероятность 3, ущерб 4, оценка 12/ })).toHaveTextContent("Долг12");
    expect(screen.getByText("Вероятность 5 × ущерб 4 = 20")).toBeInTheDocument();
    expect(screen.getByText("Вероятность 3 × ущерб 4 = 12")).toBeInTheDocument();
    expect(screen.getByText("Горизонтальный анализ")).toBeInTheDocument();
    expect(screen.getByText("Вертикальный анализ")).toBeInTheDocument();
  });
});
