import { CalendarClock, CreditCard, UserRound } from "lucide-react";
import { DataNotices, PageHeader } from "../components/PageChrome";
import { formatMoney, formatShortDate } from "../lib/format";
import type { FinancePageProps } from "./types";

export function ObligationsPage({
  data,
  source,
  theme,
  onThemeToggle,
  onNewOperation,
  onSearch,
  activeUser,
}: FinancePageProps) {
  const total = data.obligations.reduce((sum, item) => sum + item.debtMinor, 0);

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Обязательства"
        subtitle="Долги и ближайшие платежи отдельно от доступных денег"
        periodLabel={data.meta.periodLabel}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation}
        onSearch={onSearch}
        activeUser={activeUser}
      />
      <DataNotices source={source} fx={data.meta.fx} />

      <section className="obligations-hero">
        <span>Общая задолженность</span>
        <strong>{formatMoney(total, data.availableMoney.currency)}</strong>
        <p>Эта сумма никогда не прибавляется к доступным деньгам.</p>
      </section>

      <section className="obligation-grid">
        {data.obligations.map((obligation, index) => (
          <article className={`obligation-card obligation-card-${(index % 3) + 1}`} key={obligation.id}>
            <span className="obligation-card-icon" aria-hidden="true"><CreditCard size={22} strokeWidth={1.7} /></span>
            <div className="obligation-card-title">
              <h2>{obligation.name}</h2>
              <span><UserRound size={14} strokeWidth={1.8} aria-hidden="true" />{obligation.owner}</span>
            </div>
            <strong className="obligation-debt">{formatMoney(obligation.debtMinor, obligation.currency)}</strong>
            <dl>
              {obligation.minimumPaymentMinor ? (
                <div><dt>Минимальный платёж</dt><dd>{formatMoney(obligation.minimumPaymentMinor, obligation.currency)}</dd></div>
              ) : null}
              {obligation.dueDate ? (
                <div><dt><CalendarClock size={14} strokeWidth={1.8} aria-hidden="true" />Срок</dt><dd>{formatShortDate(obligation.dueDate)}</dd></div>
              ) : null}
              {obligation.availableCreditMinor != null ? (
                <div><dt>Доступный лимит</dt><dd>{formatMoney(obligation.availableCreditMinor, obligation.currency)}</dd></div>
              ) : null}
            </dl>
          </article>
        ))}
      </section>
    </main>
  );
}
