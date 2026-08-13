import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoDashboard } from "../data/demo";
import { GuidePage } from "./GuidePage";

describe("GuidePage", () => {
  it("finds a practical answer across FAQ keywords", () => {
    render(
      <GuidePage
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

    fireEvent.change(screen.getByLabelText("Поиск по справочнику"), { target: { value: "аватар банка" } });

    expect(screen.getByText("Как настроить счёт, название или аватар?")).toBeInTheDocument();
    expect(screen.queryByText("Как пополнить цель?")).not.toBeInTheDocument();
  });
});
