import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Plus,
} from "lucide-react";
import { BalanceHistoryChart } from "../components/BalanceHistoryChart";
import { AccountRow, TransactionRow } from "../components/FinanceRows";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { formatDateTime, formatMoney, formatShortDate, formatSignedMoney } from "../lib/format";
import { deriveFinancialHealth } from "../lib/financialHealth";
import { routeHref } from "../routes";
import type { FinancePageProps } from "./types";

export function OverviewPage({ data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser, selectedPeriod, onPeriodChange, simpleMode = false }: FinancePageProps) {
  if (simpleMode) {
    return <SimpleOverview
      data={data}
      theme={theme}
      onThemeToggle={onThemeToggle}
      onNewOperation={onNewOperation}
      activeUser={activeUser}
      selectedPeriod={selectedPeriod}
      onPeriodChange={onPeriodChange}
    />;
  }

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
  const plannedIncome = data.plan?.incomeMinor ?? 0;
  const plannedExpense = data.plan?.expenseMinor ?? 0;
  const health = deriveFinancialHealth(data);
  const paymentTimeline = [
    ...data.plannedPayments.map((item) => ({ id: `plan-${item.id}`, name: item.name, dueDate: item.dueDate })),
    ...data.obligations.filter((item) => item.dueDate).map((item) => ({ id: `obligation-${item.id}`, name: item.name, dueDate: item.dueDate || "" })),
  ].sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Сегодня"
        subtitle={`Данные на ${formatDateTime(data.meta.generatedAt)}`}
        periodLabel={data.meta.periodLabel}
        fx={data.meta.fx}
        attentionCount={data.attention.total}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation}
        onSearch={onSearch}
        activeUser={activeUser}
        selectedPeriod={selectedPeriod}
        onPeriodChange={onPeriodChange}
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
            {paymentTimeline.slice(0, 3).map((item, index) => (
              <span className={`timeline-event timeline-event-${index + 1}`} title={`${item.name}: ${formatShortDate(item.dueDate!)}`} key={item.id} />
            ))}
            <small>сегодня</small>
            <small>{monthEndLabel}</small>
          </div>
          <BalanceHistoryChart
            currentBalanceMinor={data.availableMoney.amountMinor}
            currency={baseCurrency}
            generatedAt={data.meta.generatedAt}
            period={selectedPeriod}
            periodLabel={data.meta.periodLabel}
            points={data.cashflow}
          />
        </div>

        <div className="pace-panel" aria-label="Дневной темп расходов">
          <span>Дневной темп</span>
          <strong>{formatMoney(dailyPace, data.month.currency)} <small>из {formatMoney(dailyAllowance, data.month.currency)}</small></strong>
          <div className="pace-line" aria-hidden="true"><i style={{ width: `${paceShare}%` }} /></div>
          <p>{dailyPace <= dailyAllowance ? "В ориентире" : "Темп выше ориентира"}. Осталось {remainingDays} дней.</p>
        </div>
      </section>

      <a className={`health-glance health-glance-${health.score >= 7 ? "steady" : health.score >= 4 ? "attention" : "risk"}`} href={routeHref("health")}>
        <span className="health-glance-emoji" aria-hidden="true">{health.emoji}</span>
        <span><small>Финансовое здоровье</small><strong>{health.title}</strong></span>
        <span className="health-glance-score"><b>{health.score}</b><small>из 10</small></span>
        <span className="health-glance-copy">{health.summary}</span>
        <ArrowRight size={19} strokeWidth={1.8} aria-hidden="true" />
      </a>

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

      <section className="panel plan-fact-card" aria-label="План и факт за выбранный период">
        <SectionTitle title="План и факт" action={<a className="text-link" href={routeHref("plan")}>Настроить <ArrowRight size={15} aria-hidden="true" /></a>} />
        <div className="plan-fact-grid">
          <PlanFactRow label="Доход" actual={data.month.incomeMinor} planned={plannedIncome} currency={baseCurrency} tone="income" />
          <PlanFactRow label="Расход" actual={data.month.expenseMinor} planned={plannedExpense} currency={baseCurrency} tone="expense" />
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

function SimpleOverview({
  data,
  theme,
  onThemeToggle,
  onNewOperation,
  activeUser,
  selectedPeriod,
  onPeriodChange,
}: Pick<FinancePageProps, "data" | "theme" | "onThemeToggle" | "onNewOperation" | "activeUser" | "selectedPeriod" | "onPeriodChange">) {
  const currency = data.availableMoney.currency;
  const net = data.month.incomeMinor - data.month.expenseMinor;

  return (
    <main className="app-page simple-mode-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Сегодня"
        subtitle="Баланс и последние записи"
        periodLabel={data.meta.periodLabel}
        attentionCount={data.attention.total}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation}
        onSearch={() => undefined}
        activeUser={activeUser}
        selectedPeriod={selectedPeriod}
        onPeriodChange={onPeriodChange}
        simpleMode
      />

      <section className="simple-balance panel" aria-labelledby="simple-balance-title">
        <div>
          <span id="simple-balance-title">Доступно сейчас</span>
          <strong>{formatMoney(data.availableMoney.amountMinor, currency)}</strong>
          <p>{net >= 0 ? "За период поступило больше, чем потрачено" : "За период потрачено больше, чем поступило"}</p>
        </div>
        <button className="primary-button simple-add-button" type="button" onClick={onNewOperation}>
          <Plus size={17} strokeWidth={2} aria-hidden="true" />
          Добавить операцию
        </button>
      </section>

      <section className="simple-totals" aria-label="Доходы и расходы за период">
        <div>
          <span>Доходы</span>
          <strong className="amount-income">+{formatMoney(data.month.incomeMinor, data.month.currency)}</strong>
        </div>
        <div>
          <span>Расходы</span>
          <strong>{formatMoney(data.month.expenseMinor, data.month.currency)}</strong>
        </div>
      </section>

      <section className="panel simple-recent-panel">
        <SectionTitle
          title="Последние операции"
          action={<a className="text-link" href={routeHref("operations")}>Все <ArrowRight size={15} aria-hidden="true" /></a>}
        />
        <div className="finance-list">
          {data.transactions.slice(0, 6).map((transaction) => <TransactionRow transaction={transaction} key={transaction.id} />)}
        </div>
      </section>
    </main>
  );
}

function PlanFactRow({ label, actual, planned, currency, tone }: {
  label: string;
  actual: number;
  planned: number;
  currency: string;
  tone: "income" | "expense";
}) {
  const share = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0;
  return <div className={`plan-fact-row plan-fact-${tone}`}>
    <div><strong>{label}</strong><span>Факт {formatMoney(actual, currency)}</span></div>
    <div className="plan-fact-progress" aria-label={planned > 0 ? `${label}: факт ${formatMoney(actual, currency)}, план ${formatMoney(planned, currency)}` : `${label}: план не задан`}><i style={{ width: `${share}%` }} /><b /></div>
    <small>{planned > 0 ? `План ${formatMoney(planned, currency)}` : "План не задан"}</small>
  </div>;
}
