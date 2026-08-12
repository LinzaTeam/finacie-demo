import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoDashboard } from "../data/demo";
import { AnalyticsPage } from "./AnalyticsPage";

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
    fireEvent.change(screen.getByLabelText("Участник"), { target: { value: "person-2" } });
    fireEvent.click(screen.getByRole("button", { name: "По месяцам" }));
    await waitFor(() => {
      expect(screen.getByText("Динамика по месяцам")).toBeInTheDocument();
      expect(screen.getAllByText("Участник 2").length).toBeGreaterThan(1);
    });
  });
});
