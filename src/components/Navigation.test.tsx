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
    expect(screen.getByRole("link", { name: "Счета" })).toHaveAttribute("href", "#/accounts");
    expect(screen.getByRole("link", { name: "Обязательства" })).toHaveAttribute("href", "#/obligations");
    expect(screen.getByRole("link", { name: "Сверка" })).toHaveAttribute("href", "#/reconciliation");
    expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("href", "#/settings");

    fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});
