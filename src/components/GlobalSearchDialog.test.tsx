import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoDashboard } from "../data/demo";
import { GlobalSearchDialog } from "./GlobalSearchDialog";

describe("global search dialog", () => {
  it("finds accounts and closes with Escape", () => {
    const onClose = vi.fn();
    render(<GlobalSearchDialog open data={demoDashboard} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("Поиск по операциям, счетам и обязательствам"), {
      target: { value: "Т-Банк" },
    });

    expect(screen.getAllByText("Т-Банк").length).toBeGreaterThan(0);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
