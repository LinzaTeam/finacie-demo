import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
} from "lucide-react";
import { AccountRow, TransactionRow } from "../components/FinanceRows";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { formatDateTime, formatMoney, formatShortDate, formatSignedMoney } from "../lib/format";
import { routeHref } from "../routes";
import type { FinancePageProps } from "./types";

export function OverviewPage({ data, source, theme, onThemeToggle, onNewOperation, onSearch }: FinancePageProps) {
  const baseCurrency = data.availableMoney.currency;
  const nearestPayment = [...data.obligations]
    .filter((item) => item.dueDate && item.minimumPaymentMinor)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0];
  const obligationsTotal = data.obligations.reduce((sum, item) => sum + item.debtMinor, 0);
  const generatedAt = new Date(data.meta.generatedAt);
  const monthEnd = new Date(generatedAt.getFullYear(), generatedAt.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const elapsedDays = Math.max(1, generatedAt.getDate());
  const remainingDays = Math.max(1, daysInMonth - elapsedDays + 1);
  const dailyPace = Math.round(data.month.expenseMinor / elapsedDays);
  const dailyAllowance = Math.max(1, Math.round(data.availableMoney.amountMinor / remainingDays));
  const paceShare = Math.min(100, Math.round((dailyPace / dailyAllowance) * 100));
  const monthEndLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(monthEnd);

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Сегодня"
        subtitle={`Данные на ${formatDateTime(data.meta.generatedAt)}`}
        periodLabel={data.meta.periodLabel}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation}
        onSearch={onSearch}
      />
      <DataNotices source={source} fx={data.meta.fx} />

      <section className="balance-hero" aria-labelledby="available-money-title">
        <div className="balance-primary">
          <span id="available-money-title">Свободно до {monthEndLabel}</span>
          <strong>{formatMoney(data.availableMoney.amountMinor, baseCurrency)}</strong>
          <p>Учтено {data.transactions.filter((item) => item.kind === "expense").length} расходов на {formatMoney(data.month.expenseMinor, data.month.currency)}</p>
          <span className={data.availableMoney.changeMinor >= 0 ? "balance-delta positive" : "balance-delta negative"}>
            <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
            {formatSignedMoney(data.availableMoney.changeMinor, baseCurrency)} {data.availableMoney.changeLabel}
          </span>
          <div className="month-timeline" aria-label="Платежи до конца месяца">
            <span className="timeline-line" />
            {data.obligations.filter((item) => item.dueDate).slice(0, 3).map((item, index) => (
              <span className={`timeline-event timeline-event-${index + 1}`} title={`${item.name}: ${formatShortDate(item.dueDate!)}`} key={item.id} />
            ))}
            <small>сегодня</small>
            <small>{monthEndLabel}</small>
          </div>
        </div>

        <div className="pace-panel" aria-label="Дневной темп расходов">
          <span>Дневной темп</span>
          <strong>{formatMoney(dailyPace, data.month.currency)} <small>из {formatMoney(dailyAllowance, data.month.currency)}</small></strong>
          <div className="pace-line" aria-hidden="true"><i style={{ width: `${paceShare}%` }} /></div>
          <p>{dailyPace <= dailyAllowance ? "В ориентире" : "Темп выше ориентира"}. Осталось {remainingDays} дней.</p>
        </div>
      </section>

      <section className="overview-grid">
        <div className="panel recent-panel">
          <SectionTitle
            title="Последние операции"
            action={<a className="text-link" href={routeHref("operations")}>Все <ArrowRight size={15} aria-hidden="true" /></a>}
          />
          <div className="finance-list">
            {data.transactions.slice(0, 5).map((transaction) => (
              <TransactionRow transaction={transaction} key={transaction.id} />
            ))}
          </div>
        </div>

        <div className="panel accounts-preview">
          <SectionTitle
            title="Счета"
            action={<a className="text-link" href={routeHref("accounts")}>Все <ArrowRight size={15} aria-hidden="true" /></a>}
          />
          <div className="finance-list">
            {data.accounts.slice(0, 4).map((account) => (
              <AccountRow account={account} key={account.id} />
            ))}
          </div>
        </div>
      </section>

      <a className="obligation-summary" href={routeHref("obligations")}>
        <span className="obligation-symbol" aria-hidden="true"><Clock3 size={21} strokeWidth={1.8} /></span>
        <span>
          <small>Обязательства</small>
          <strong>{formatMoney(obligationsTotal, baseCurrency)}</strong>
        </span>
        <span className="obligation-next">
          {nearestPayment ? (
            <>
              <small>Ближайший платёж</small>
              <strong>{formatMoney(nearestPayment.minimumPaymentMinor!, nearestPayment.currency)} до {formatShortDate(nearestPayment.dueDate!)}</strong>
            </>
          ) : (
            <small>Ближайших платежей нет</small>
          )}
        </span>
        <ArrowRight size={19} strokeWidth={1.8} aria-hidden="true" />
      </a>
    </main>
  );
}
