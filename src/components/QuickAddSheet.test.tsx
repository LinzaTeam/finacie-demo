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
  {
    id: "alfa",
    name: "Альфа Банк (основной счет)",
    group: "operating" as const,
    balanceMinor: 2_000_00,
    currency: "RUB",
    convertedBalanceMinor: 2_000_00,
    updatedAt: "2026-08-12T12:00:00+03:00",
    ownerKey: "person-2",
    ownerName: "Участник 2",
    iconKey: "landmark",
    color: "#364C84",
    avatarDataUrl: null,
  },
];
const people = [
  { key: "person-1", name: "Участник 1", avatarDataUrl: null, accentColor: "#364C84" },
  { key: "person-2", name: "Участник 2", avatarDataUrl: null, accentColor: "#95B1EE" },
];
const categories = [
  { id: "coffee", label: "Кафе", iconKey: "coffee", color: "#E7C06D", amountMinor: 0, currency: "RUB", share: 0 },
  { id: "other", label: "Другое", iconKey: "shapes", color: "#D0D9F5", amountMinor: 0, currency: "RUB", share: 0 },
];

describe("natural operation input", () => {
  it("parses an expense with amount and account", () => {
    expect(parseOperation("Кофе 420 с Т-Банк", accounts)).toMatchObject({
      title: "Кофе",
      detail: "Списание, Т-Банк",
      amountMinor: 42_000,
      kind: "expense",
      transactionKind: "card_payment",
      accountFromId: "tbank",
      categoryKey: "coffee",
    });
  });

  it("recognizes income", () => {
    expect(parseOperation("Доход 35000", accounts)).toMatchObject({
      amountMinor: 3_500_000,
      kind: "income",
    });
  });

  it("recognizes a company receipt as income with its counterparty", () => {
    expect(parseOperation("поступление компании TAPE 140000 на Альфа", accounts)).toMatchObject({
      amountMinor: 14_000_000,
      kind: "income",
      transactionKind: "income",
      accountToId: "alfa",
      sourceKey: "tape",
      counterpartyName: "TAPE",
      counterpartyType: "company",
    });
  });

  it("understands typos, synonyms, and reordered words", () => {
    expect(parseOperation("140000 на:Алфа от кампании TAPE постпуление", accounts)).toMatchObject({
      amountMinor: 14_000_000,
      transactionKind: "income",
      accountToId: "alfa",
      sourceKey: "tape",
      counterpartyName: "TAPE",
      counterpartyType: "company",
      confidence: 0.84,
    });
  });

  it("recognizes categories from the full bot catalogue", () => {
    expect(parseOperation("такси 420 с Т-Банк", accounts)).toMatchObject({ categoryKey: "transport" });
    expect(parseOperation("Lamoda 350 с Т-Банк", accounts)).toMatchObject({ categoryKey: "clothes" });
    expect(parseOperation("подписка Иви 299 с Т-Банк", accounts)).toMatchObject({ categoryKey: "subscriptions" });
    expect(parseOperation("корм для котов 750 с Т-Банк", accounts)).toMatchObject({ categoryKey: "cats" });
  });

  it("accepts tags and explicit keys in any order", () => {
    expect(parseOperation("category:coffee from:tbank 420 #expense", accounts)).toMatchObject({
      transactionKind: "card_payment",
      accountFromId: "tbank",
      categoryKey: "coffee",
    });
    expect(parseOperation("to:alfa 10000 from:tbank #transfer", accounts)).toMatchObject({
      transactionKind: "own_transfer",
      accountFromId: "tbank",
      accountToId: "alfa",
    });
    expect(parseOperation("source:tape counterparty:TAPE account:alfa 50000 #income", accounts)).toMatchObject({
      transactionKind: "income",
      accountToId: "alfa",
      sourceKey: "tape",
      counterpartyName: "TAPE",
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
          categories={categories}
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
        categories={categories}
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
    fireEvent.change(screen.getByLabelText("Напишите как есть"), { target: { value: "Кофе 420 с Т-Банк" } });
    fireEvent.click(screen.getByRole("button", { name: "Готово" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ subjectKey: "person-2" })));
  });

  it("keeps every reviewed field inside the stable two-column row layout", () => {
    render(
      <QuickAddSheet
        open
        source="demo"
        accounts={accounts}
        categories={categories}
        currency="RUB"
        canWrite
        actorName="Участник 1"
        actorKey="person-1"
        people={people}
        onClose={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Напишите как есть"), { target: { value: "поступление т-банк 1000" } });

    for (const label of ["Сумма", "Тип", "Контрагент или человек", "Счёт зачисления", "Источник дохода", "Почему так"]) {
      expect(screen.getByText(label).closest(".operation-review-row")).not.toBeNull();
    }
  });
});
