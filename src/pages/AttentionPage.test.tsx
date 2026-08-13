import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoDashboard } from "../data/demo";
import { AttentionPage } from "./AttentionPage";

describe("attention page", () => {
  it("keeps a duplicate review separate from planned reminders", () => {
    const onDataChange = vi.fn();
    const onNewOperation = vi.fn();
    render(
      <AttentionPage
        data={demoDashboard}
        source="demo"
        theme="dark"
        onThemeToggle={vi.fn()}
        onNewOperation={onNewOperation}
        onSearch={vi.fn()}
        activeUser="Участник 2"
        activeUserKey="person-2"
        canWrite
        selectedPeriod="2026-08"
        onPeriodChange={vi.fn()}
        onDataChange={onDataChange}
      />,
    );

    expect(screen.getByText("Проверка дублей")).toBeInTheDocument();
    expect(screen.getByText("Ближайшие напоминания")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Это не дубль" }));
    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      attention: expect.objectContaining({ total: 2, duplicates: [] }),
    }));

    fireEvent.click(screen.getAllByRole("button", { name: "Внести операцию" })[0]);
    expect(onNewOperation).toHaveBeenCalledTimes(1);
  });
});
