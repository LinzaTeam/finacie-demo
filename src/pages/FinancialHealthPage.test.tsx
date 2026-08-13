import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoDashboard } from "../data/demo";
import { FinancialHealthPage } from "./FinancialHealthPage";

describe("financial health page", () => {
  it("shows the score, scenarios, risk map, and analysis sections", () => {
    render(
      <FinancialHealthPage
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

    expect(screen.getByRole("heading", { name: "Финансовое здоровье" })).toBeInTheDocument();
    expect(screen.getByText("Прогноз на 90 дней")).toBeInTheDocument();
    expect(screen.getByText("Карта рисков")).toBeInTheDocument();
    expect(screen.getByText("Горизонтальный анализ")).toBeInTheDocument();
    expect(screen.getByText("Вертикальный анализ")).toBeInTheDocument();
  });
});
