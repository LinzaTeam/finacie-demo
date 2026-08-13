import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoDashboard } from "../data/demo";
import { PlanPage } from "./PlanPage";

describe("plan page", () => {
  it("keeps an empty planning state explicit", () => {
    const data = { ...demoDashboard, plan: undefined };

    render(
      <PlanPage
        data={data}
        source="api"
        theme="light"
        onThemeToggle={vi.fn()}
        onNewOperation={vi.fn()}
        onSearch={vi.fn()}
        activeUser="Демо-профиль"
        selectedPeriod="2026-08"
        onPeriodChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Не задан")).toBeInTheDocument();
    expect(screen.getByText("Добавьте обязательные платежи и лимиты по категориям")).toBeInTheDocument();
  });

  it("shows categories and planned payments separately", () => {
    render(
      <PlanPage
        data={demoDashboard}
        source="demo"
        theme="light"
        onThemeToggle={vi.fn()}
        onNewOperation={vi.fn()}
        onSearch={vi.fn()}
        activeUser="Демо-профиль"
        selectedPeriod="2026-08"
        onPeriodChange={vi.fn()}
      />,
    );

    expect(screen.getByText("План и факт по категориям")).toBeInTheDocument();
    expect(screen.getAllByText(/из .*₽/).length).toBe(demoDashboard.categories.length);
    expect(screen.getByText("Облачный сервис")).toBeInTheDocument();
  });

  it("adds a planned payment to the caller data in demo mode", () => {
    const onDataChange = vi.fn();
    render(
      <PlanPage
        data={demoDashboard}
        source="demo"
        theme="light"
        onThemeToggle={vi.fn()}
        onNewOperation={vi.fn()}
        onSearch={vi.fn()}
        activeUser="Участник 1"
        activeUserKey="person-1"
        selectedPeriod="2026-08"
        onPeriodChange={vi.fn()}
        onDataChange={onDataChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Платёж или доход" }));
    fireEvent.change(screen.getByLabelText("Название"), { target: { value: "Страховка" } });
    fireEvent.change(screen.getByLabelText("Сумма, ₽"), { target: { value: "1250" } });
    fireEvent.change(screen.getByLabelText("Дата"), { target: { value: "2026-08-28" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      plannedPayments: expect.arrayContaining([expect.objectContaining({ name: "Страховка", amountMinor: 125_000 })]),
    }));
  });

  it("saves a participant's category limits as one monthly plan in demo mode", () => {
    const onDataChange = vi.fn();
    render(
      <PlanPage
        data={demoDashboard}
        source="demo"
        theme="light"
        onThemeToggle={vi.fn()}
        onNewOperation={vi.fn()}
        onSearch={vi.fn()}
        activeUser="Участник 1"
        activeUserKey="person-1"
        selectedPeriod="2026-08"
        onPeriodChange={vi.fn()}
        onDataChange={onDataChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Запланировать месяц" }));
    expect(screen.getByRole("dialog", { name: "Запланировать месяц" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Лимит Продукты"), { target: { value: "24500" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить план" }));

    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      monthlyCategoryBudgets: expect.arrayContaining([
        expect.objectContaining({ personKey: "person-1", categoryKey: "groceries", amountMinor: 2_450_000 }),
      ]),
    }));
  });
});
