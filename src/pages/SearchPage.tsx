import { ClipboardCheck, ReceiptText, Search, Settings, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { AccountRow, TransactionRow } from "../components/FinanceRows";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { routeHref } from "../routes";
import type { FinancePageProps } from "./types";

export function SearchPage({
  data,
  source,
  theme,
  onThemeToggle,
  onNewOperation,
  onSearch,
  activeUser,
  selectedPeriod,
  onPeriodChange,
}: FinancePageProps) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("ru-RU");
  const results = useMemo(() => ({
    transactions: normalized
      ? data.transactions.filter((item) => `${item.title} ${item.detail}`.toLocaleLowerCase("ru-RU").includes(normalized))
      : [],
    accounts: normalized
      ? data.accounts.filter((item) => item.name.toLocaleLowerCase("ru-RU").includes(normalized))
      : [],
  }), [data.accounts, data.transactions, normalized]);
  const resultCount = results.transactions.length + results.accounts.length;

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Поиск"
        subtitle="Операции и счета в одном месте"
        periodLabel={data.meta.periodLabel}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation}
        onSearch={onSearch}
        activeUser={activeUser}
        selectedPeriod={selectedPeriod}
        onPeriodChange={onPeriodChange}
      />
      <DataNotices source={source} fx={data.meta.fx} />

      <section className="search-surface">
        <label className="global-search">
          <Search size={21} strokeWidth={1.8} aria-hidden="true" />
          <span className="sr-only">Поиск по всем данным</span>
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например: кофе, продукты или название счёта"
          />
          <kbd>⌘ K</kbd>
        </label>

        {!normalized ? (
          <div className="search-prompt">
            <Search size={25} strokeWidth={1.7} aria-hidden="true" />
            <h2>Найдите одной строкой</h2>
            <p>Поиск проверит названия, категории, детали и счета.</p>
            <nav className="search-shortcuts" aria-label="Другие разделы">
              <a href={routeHref("accounts")}><WalletCards size={16} aria-hidden="true" />Счета</a>
              <a href={routeHref("obligations")}><ReceiptText size={16} aria-hidden="true" />Обязательства</a>
              <a href={routeHref("reconciliation")}><ClipboardCheck size={16} aria-hidden="true" />Сверка</a>
              <a href={routeHref("settings")}><Settings size={16} aria-hidden="true" />Настройки</a>
            </nav>
          </div>
        ) : resultCount === 0 ? (
          <div className="inline-empty">Ничего не найдено. Попробуйте другой запрос.</div>
        ) : (
          <div className="search-results" aria-live="polite">
            {results.transactions.length > 0 ? (
              <section>
                <SectionTitle title={`Операции: ${results.transactions.length}`} />
                <div className="finance-list">
                  {results.transactions.map((transaction) => <TransactionRow transaction={transaction} key={transaction.id} />)}
                </div>
              </section>
            ) : null}
            {results.accounts.length > 0 ? (
              <section>
                <SectionTitle title={`Счета: ${results.accounts.length}`} />
                <div className="finance-list">
                  {results.accounts.map((account) => <AccountRow account={account} key={account.id} />)}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
