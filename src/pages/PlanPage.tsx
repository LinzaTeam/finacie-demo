import type { CSSProperties } from "react";
import { CalendarClock, CircleDollarSign } from "lucide-react";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { formatMoney, formatShortDate } from "../lib/format";
import type { FinancePageProps } from "./types";

export function PlanPage({
  data,
  source,
  theme,
  onThemeToggle,
  onNewOperation,
  onSearch,
  activeUser,
}: FinancePageProps) {
  const budget = data.plan?.budgetMinor ?? null;
  const remaining = budget == null ? null : Math.max(0, budget - data.month.expenseMinor);
  const usedShare = budget == null ? 0 : Math.min(1, data.month.expenseMinor / Math.max(1, budget));
  const ringStyle = { "--progress": `${Math.round(usedShare * 360)}deg` } as CSSProperties;
  const payments = data.obligations.filter((item) => item.minimumPaymentMinor && item.dueDate);

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="План"
        subtitle="Лимиты, категории и ближайшие платежи"
        periodLabel={data.meta.periodLabel}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation}
        onSearch={onSearch}
        activeUser={activeUser}
      />
      <DataNotices source={source} fx={data.meta.fx} />

      <section className="plan-grid">
        <div className="panel plan-remaining">
          <span>Осталось в плане</span>
          <strong>{remaining == null ? "Лимит не задан" : formatMoney(remaining, data.plan!.currency)}</strong>
          <p>{budget == null ? "Задайте месячный бюджет, чтобы видеть остаток" : "Текущий темп расходов за месяц"}</p>
          <div className="budget-ring" style={ringStyle} aria-label={budget == null ? "Месячный лимит не задан" : `Использовано ${Math.round(usedShare * 100)} процентов`}>
            <span><strong>{budget == null ? "Нет" : `${Math.round(usedShare * 100)}%`}</strong><small>{budget == null ? "без лимита" : "месяца"}</small></span>
          </div>
        </div>

        <div className="panel category-plan">
          <SectionTitle title="Категории" />
          <div className="category-plan-list">
            {data.categories.map((category, index) => {
              const progress = Math.max(8, Math.round(category.share * 100));
              return (
                <div className="category-plan-row" key={category.id}>
                  <span className={`category-symbol category-symbol-${(index % 4) + 1}`} aria-hidden="true" />
                  <span className="category-plan-copy">
                    <strong>{category.label}</strong>
                    <span className="category-line" aria-hidden="true">
                      <i style={{ width: `${progress}%` }} />
                    </span>
                  </span>
                  <span className="category-plan-value">
                    <strong>{formatMoney(category.amountMinor, category.currency)}</strong>
                    <small>потрачено</small>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="upcoming-section">
        <SectionTitle title="Ближайшие платежи" />
        <div className="upcoming-grid">
          {payments.length > 0 ? payments.map((payment, index) => (
            <div className="upcoming-card" key={payment.id}>
              <span className={`payment-icon payment-icon-${(index % 3) + 1}`} aria-hidden="true">
                {index % 2 === 0 ? <CalendarClock size={19} strokeWidth={1.8} /> : <CircleDollarSign size={19} strokeWidth={1.8} />}
              </span>
              <span><strong>{payment.name}</strong><small>{formatShortDate(payment.dueDate!)}</small></span>
              <strong>{formatMoney(payment.minimumPaymentMinor!, payment.currency)}</strong>
            </div>
          )) : <div className="inline-empty">Запланированных платежей нет.</div>}
        </div>
      </section>
    </main>
  );
}
