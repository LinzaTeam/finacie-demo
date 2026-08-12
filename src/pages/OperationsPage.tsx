import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { TransactionRow } from "../components/FinanceRows";
import { DataNotices, PageHeader } from "../components/PageChrome";
import { formatMoney, formatSignedMoney } from "../lib/format";
import type { DashboardData } from "../types";
import type { FinancePageProps } from "./types";

type KindFilter = "all" | DashboardData["transactions"][number]["kind"];

function longDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}

export function OperationsPage({ data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser }: FinancePageProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const net = data.month.incomeMinor - data.month.expenseMinor;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    return data.transactions.filter((transaction) => {
      const matchesKind = kind === "all" || transaction.kind === kind;
      const matchesQuery =
        !normalized ||
        `${transaction.title} ${transaction.detail}`.toLocaleLowerCase("ru-RU").includes(normalized);
      return matchesKind && matchesQuery;
    });
  }, [data.transactions, kind, query]);
  const groups = useMemo(() => {
    const result = new Map<string, DashboardData["transactions"]>();
    filtered.forEach((transaction) => {
      const key = transaction.occurredAt.slice(0, 10);
      result.set(key, [...(result.get(key) ?? []), transaction]);
    });
    return Array.from(result.entries());
  }, [filtered]);

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Операции"
        subtitle="Доходы, расходы и переводы в одной ленте"
        periodLabel={data.meta.periodLabel}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation}
        onSearch={onSearch}
        activeUser={activeUser}
      />
      <DataNotices source={source} fx={data.meta.fx} />

      <section className="operation-summary" aria-label="Итоги периода">
        <div><span>Расходы</span><strong>{formatMoney(data.month.expenseMinor, data.month.currency)}</strong></div>
        <div><span>Доходы</span><strong className="amount-income">+{formatMoney(data.month.incomeMinor, data.month.currency)}</strong></div>
        <div><span>Чистый поток</span><strong className={net >= 0 ? "amount-income" : "amount-negative"}>{formatSignedMoney(net, data.month.currency)}</strong></div>
      </section>

      <section className="operation-tools" aria-label="Поиск и фильтры">
        <label className="search-control">
          <span className="sr-only">Поиск операций</span>
          <Search size={18} strokeWidth={1.8} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию или деталям"
          />
        </label>
        <div className="segmented-control" aria-label="Тип операции">
          {([
            ["all", "Все"],
            ["expense", "Расходы"],
            ["income", "Доходы"],
            ["transfer", "Переводы"],
          ] as const).map(([value, label]) => (
            <button
              className={kind === value ? "segment-active" : ""}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              key={value}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="operations-feed" aria-live="polite">
        {groups.length > 0 ? groups.map(([date, transactions]) => (
          <div className="operation-day" key={date}>
            <h2>{longDate(`${date}T12:00:00+03:00`)}</h2>
            <div className="finance-list">
              {transactions.map((transaction) => (
                <TransactionRow transaction={transaction} showDate={false} key={transaction.id} />
              ))}
            </div>
          </div>
        )) : (
          <div className="inline-empty">По выбранным фильтрам операций нет.</div>
        )}
      </section>
    </main>
  );
}
