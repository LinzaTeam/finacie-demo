import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BugReportDialog } from "./BugReportDialog";

describe("BugReportDialog", () => {
  it("keeps demo reports local and explains why they cannot be submitted", () => {
    render(
      <BugReportDialog
        open
        source="demo"
        canWrite
        onClose={vi.fn()}
        onSubmitted={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Что не так?"), { target: { value: "Кнопка выглядит неправильно" } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить отчёт" }));

    expect(screen.getByRole("alert")).toHaveTextContent("В демо-профиле отчёты не отправляются");
  });
});
