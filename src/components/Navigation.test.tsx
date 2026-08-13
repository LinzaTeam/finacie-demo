import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomNavigation } from "./Navigation";

describe("BottomNavigation", () => {
  it("keeps the create action central and exposes every remaining section from the mobile menu", () => {
    const onNewOperation = vi.fn();
    const onSearch = vi.fn();
    render(<BottomNavigation activeRoute="overview" onNewOperation={onNewOperation} onSearch={onSearch} />);

    fireEvent.click(screen.getByRole("button", { name: "Новая операция" }));
    expect(onNewOperation).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Ещё" }));
    expect(screen.getByRole("dialog", { name: "Все разделы" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "План" })).toHaveAttribute("href", "#/plan");
    expect(screen.getByRole("link", { name: "Цели" })).toHaveAttribute("href", "#/goals");
    expect(screen.getByRole("link", { name: "Финздоровье" })).toHaveAttribute("href", "#/health");
    expect(screen.getByRole("link", { name: "Счета" })).toHaveAttribute("href", "#/accounts");
    expect(screen.getByRole("link", { name: "Обязательства" })).toHaveAttribute("href", "#/obligations");
    expect(screen.getByRole("link", { name: "Контроль" })).toHaveAttribute("href", "#/attention");
    expect(screen.getByRole("link", { name: "Автосверка" })).toHaveAttribute("href", "#/reconciliation");
    expect(screen.getByRole("link", { name: "Справочник" })).toHaveAttribute("href", "#/guide");
    expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("href", "#/settings");

    fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("keeps the simple mode focused on recording and control", () => {
    render(<BottomNavigation activeRoute="overview" onNewOperation={vi.fn()} onSearch={vi.fn()} simpleMode />);

    expect(screen.getByRole("link", { name: "Сегодня" })).toHaveAttribute("href", "#/overview");
    expect(screen.getByRole("link", { name: "Операции" })).toHaveAttribute("href", "#/operations");
    expect(screen.getByRole("link", { name: "Контроль" })).toHaveAttribute("href", "#/attention");
    expect(screen.queryByRole("link", { name: "Аналитика" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ещё" }));
    expect(screen.getByRole("link", { name: "Настроить" })).toHaveAttribute("href", "#/settings");
    expect(screen.queryByRole("button", { name: "Поиск" })).not.toBeInTheDocument();
  });
});
