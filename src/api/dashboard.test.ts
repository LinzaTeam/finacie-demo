import { describe, expect, it } from "vitest";
import { normalizeDashboard } from "./dashboard";

describe("dashboard normalization", () => {
  it("keeps liabilities outside available money and reports missing FX", () => {
    const result = normalizeDashboard({
      as_of: "2026-08-12",
      currency: "RUB",
      exchange_rates: {
        source: "ЦБ РФ",
        effective_date: "2026-08-13",
        fetched_at: "2026-08-12T21:00:00+00:00",
        items: [
          { currency: "USD", rub_per_unit: "82.9977" },
          { currency: "EUR", rub_per_unit: "95.7793" },
        ],
      },
      totals: { available_cents: 75_000_00, partial: true },
      month: {
        start: "2026-08-01",
        income_cents: 100_000_00,
        expense_cents: 25_000_00,
        net_cents: 75_000_00,
        partial: false,
      },
      cashflow_partial: false,
      categories: [{ name: "Сервисы", amount_cents: 25_000_00 }],
      cashflow: [{ date: "2026-08-12", income_cents: 0, expense_cents: 25_000_00 }],
      accounts: [
        {
          key: "cash_usd",
          name: "Наличные USD",
          group: "cash",
          is_liability: false,
          amount_cents: 100_00,
          currency: "USD",
          rub_cents: null,
          rate_missing: true,
          updated_at: null,
        },
      ],
      obligations: [
        {
          key: "credit",
          name: "Кредитка",
          owner: "participant_2",
          debt_cents: 40_000_00,
          available_credit_cents: 60_000_00,
          min_payment_cents: 5_000_00,
          due_date: "2026-08-22",
        },
      ],
      recent_transactions: [
        {
          id: 1,
          date: "2026-08-12",
          person_name: "Участник",
          kind: "balance_snapshot",
          category: "",
          counterparty: null,
          note: null,
          account_from: null,
          account_to: "Т-Банк",
          amount_cents: 75_000_00,
          currency: "RUB",
        },
      ],
      reconciliation: {
        period_start: "2026-08-06",
        period_end: "2026-08-12",
        missing_count: 0,
        missing: [],
      },
    });

    expect(result.availableMoney.amountMinor).toBe(75_000_00);
    expect(result.obligations[0].debtMinor).toBe(40_000_00);
    expect(result.obligations[0].owner).toBe("Участник");
    expect(result.meta.fx).toMatchObject({ status: "partial", missingCurrencies: ["USD"] });
    expect(result.meta.fx).toMatchObject({
      source: "ЦБ РФ",
      effectiveDate: "2026-08-13",
    });
    expect(result.meta.fx?.rates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ currency: "USD", rubPerUnit: 82.9977 }),
      ]),
    );
    expect(result.transactions[0]).toMatchObject({
      title: "Обновление баланса",
      kind: "transfer",
    });
  });
});
