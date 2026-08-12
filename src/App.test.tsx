import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./api/dashboard", () => ({ getDashboard: vi.fn() }));

import { App } from "./App";
import { getDashboard } from "./api/dashboard";
import { demoDashboard } from "./data/demo";

describe("app overlays", () => {
  beforeEach(() => {
    vi.mocked(getDashboard).mockResolvedValue({ data: demoDashboard, source: "demo" });
    window.history.replaceState(null, "", "#/overview");
    document.body.style.overflow = "";
  });

  it("replaces QuickAdd with global search on Ctrl+K and restores scrolling", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Новая операция" }));
    expect(screen.getByRole("dialog", { name: "Новая операция" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Новая операция" })).not.toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "Найдите что угодно" })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Найдите что угодно" })).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe("");
    });
  });
});
