import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoDashboard } from "../data/demo";
import { PlanPage } from "./PlanPage";

describe("plan page", () => {
  it("does not invent a remaining budget when no plan is configured", () => {
    const data = { ...demoDashboard, plan: undefined };

    render(
      <PlanPage
        data={data}
        source="api"
        theme="light"
        onThemeToggle={vi.fn()}
        onNewOperation={vi.fn()}
        onSearch={vi.fn()}
      />,
    );

    expect(screen.getByText("Лимит не задан")).toBeInTheDocument();
    expect(screen.getByText("Задайте месячный бюджет, чтобы видеть остаток")).toBeInTheDocument();
  });

  it("shows category spending without invented category limits", () => {
    render(
      <PlanPage
        data={demoDashboard}
        source="demo"
        theme="light"
        onThemeToggle={vi.fn()}
        onNewOperation={vi.fn()}
        onSearch={vi.fn()}
      />,
    );

    expect(screen.queryAllByText(/^из /)).toHaveLength(0);
    expect(screen.getAllByText("потрачено").length).toBe(demoDashboard.categories.length);
  });
});
