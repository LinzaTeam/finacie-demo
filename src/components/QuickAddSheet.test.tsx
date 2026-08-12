import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { parseOperation, QuickAddSheet } from "./QuickAddSheet";

const accounts = [
  {
    id: "tbank",
    name: "Т-Банк",
    group: "operating" as const,
    balanceMinor: 1_000_00,
    currency: "RUB",
    convertedBalanceMinor: 1_000_00,
    updatedAt: "2026-08-12T12:00:00+03:00",
  },
];

describe("natural operation input", () => {
  it("parses an expense with amount and account", () => {
    expect(parseOperation("Кофе 420 с Т-Банк", accounts)).toEqual({
      title: "Кофе",
      detail: "Оплата, Т-Банк",
      amountMinor: 42_000,
      kind: "expense",
    });
  });

  it("recognizes income", () => {
    expect(parseOperation("Доход 35000", accounts)).toMatchObject({
      amountMinor: 3_500_000,
      kind: "income",
    });
  });

  it("submits once with Enter and closes the dialog", () => {
    const onAdd = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <QuickAddSheet
          open={open}
          source="demo"
          accounts={accounts}
          currency="RUB"
          onClose={() => setOpen(false)}
          onAdd={onAdd}
        />
      );
    }

    render(<Harness />);
    const input = screen.getByLabelText("Напишите как есть");
    fireEvent.change(input, { target: { value: "Кофе 420 с Т-Банк" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "Новая операция" })).not.toBeInTheDocument();
  });
});
