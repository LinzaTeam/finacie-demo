import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    ownerKey: "person-1",
    ownerName: "Участник 1",
    iconKey: "landmark",
    color: "#95B1EE",
    avatarDataUrl: null,
  },
];
const people = [
  { key: "person-1", name: "Участник 1", avatarDataUrl: null, accentColor: "#364C84" },
  { key: "person-2", name: "Участник 2", avatarDataUrl: null, accentColor: "#95B1EE" },
];

describe("natural operation input", () => {
  it("parses an expense with amount and account", () => {
    expect(parseOperation("Кофе 420 с Т-Банк", accounts)).toEqual({
      title: "Кофе",
      detail: "Оплата, Т-Банк",
      amountMinor: 42_000,
      kind: "expense",
      accountId: "tbank",
    });
  });

  it("recognizes income", () => {
    expect(parseOperation("Доход 35000", accounts)).toMatchObject({
      amountMinor: 3_500_000,
      kind: "income",
    });
  });

  it("submits once with Enter and closes the dialog", async () => {
    const onAdd = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <QuickAddSheet
          open={open}
          source="demo"
          accounts={accounts}
          currency="RUB"
          canWrite
          actorName="Демо-профиль"
          actorKey="person-1"
          people={people}
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
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Новая операция" })).not.toBeInTheDocument();
    });
  });

  it("keeps the author and operation subject separate", async () => {
    const onAdd = vi.fn();
    render(
      <QuickAddSheet
        open
        source="demo"
        accounts={accounts}
        currency="RUB"
        canWrite
        actorName="Участник 1"
        actorKey="person-1"
        people={people}
        onClose={vi.fn()}
        onAdd={onAdd}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Участник 2/ }));
    fireEvent.change(screen.getByLabelText("Напишите как есть"), { target: { value: "Кофе 420" } });
    fireEvent.click(screen.getByRole("button", { name: "Готово" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ subjectKey: "person-2" })));
  });
});
