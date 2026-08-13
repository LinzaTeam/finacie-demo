import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TransactionRow } from "./FinanceRows";
import { demoDashboard } from "../data/demo";

describe("TransactionRow", () => {
  it("keeps a review status attached to the operation copy, not between its date and amount", () => {
    const transaction = {
      ...demoDashboard.transactions[0],
      status: "pending_review" as const,
    };
    const { container } = render(<TransactionRow transaction={transaction} />);

    const row = container.querySelector(".transaction-row");
    const copy = container.querySelector(".transaction-copy");
    const status = screen.getByRole("link", { name: "Возможный дубль" });
    const value = container.querySelector<HTMLElement>(".transaction-value");

    expect(copy).toContainElement(status);
    expect(status).toHaveAttribute("href", "#/attention");
    expect(row).toContainElement(value);
    expect(value).toContainElement(screen.getByText("12 авг."));
  });
});
