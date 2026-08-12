import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PeriodPicker } from "./PeriodPicker";

describe("PeriodPicker", () => {
  it("opens the month grid and selects an earlier month", () => {
    const onChange = vi.fn();
    render(<PeriodPicker value="2026-08" label="Август 2026" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Выбрать период. Сейчас Август 2026" }));
    expect(screen.getByRole("dialog", { name: "Выбор месяца" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Июл" }));
    expect(onChange).toHaveBeenCalledWith("2026-07");
    expect(screen.queryByRole("dialog", { name: "Выбор месяца" })).not.toBeInTheDocument();
  });
});
