import type { CSSProperties } from "react";
import { BarChart3, CircleDot, LineChart, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAnalytics } from "../api/analytics";
import { IconGlyph } from "../components/IconGlyph";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { formatMoney, formatSignedMoney } from "../lib/format";
import type { AnalyticsData } from "../types";
import type { FinancePageProps } from "./types";

export function AnalyticsPage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser,
  selectedPeriod, onPeriodChange,
}: FinancePageProps) {
  const [scope, setScope] = useState<"month" | "year">("month");
  const [person, setPerson] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    getAnalytics(data, source, selectedPeriod, scope, person, controller.signal)
      .then((value) => { setAnalytics(value); setStatus("ready"); })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [data, person, scope, selectedPeriod, source]);

  return <main className="app-page" id="page-content" tabIndex={-1}>
    <PageHeader title="Аналитика" subtitle="Доходы и расходы вместе и по каждому участнику" periodLabel={data.meta.periodLabel}
      theme={theme} onThemeToggle={onThemeToggle} onNewOperation={onNewOperation} onSearch={onSearch}
      activeUser={activeUser} selectedPeriod={selectedPeriod} onPeriodChange={onPeriodChange} />
    <DataNotices source={source} fx={data.meta.fx} />
    <section className="analytics-filters">
      <div className="segmented-control" aria-label="Глубина аналитики">
        <button className={scope === "month" ? "segment-active" : ""} type="button" onClick={() => setScope("month")}>По дням</button>
        <button className={scope === "year" ? "segment-active" : ""} type="button" onClick={() => setScope("year")}>По месяцам</button>
      </div>
      <label className="person-filter"><span>Участник</span><select value={person ?? "all"} onChange={(event) => setPerson(event.target.value === "all" ? null : event.target.value)}><option value="all">Все вместе</option>{data.people.map((item) => <option value={item.key} key={item.key}>{item.name}</option>)}</select></label>
    </section>
    {status === "loading" ? <div className="panel analytics-loading">Собираю аналитику…</div> : null}
    {status === "error" ? <div className="panel analytics-loading">Не удалось загрузить аналитику.</div> : null}
    {status === "ready" && analytics ? <AnalyticsContent value={analytics} /> : null}
  </main>;
}

function AnalyticsContent({ value }: { value: AnalyticsData }) {
  const pie = useMemo(() => {
    const total = value.categories.reduce((sum, item) => sum + item.amountMinor, 0) || 1;
    let cursor = 0;
    const segments = value.categories.map((item) => {
      const start = cursor;
      cursor += (item.amountMinor / total) * 100;
      return `${item.color} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${segments.length ? segments.join(",") : "#D0D9F5 0 100%"})`;
  }, [value.categories]);
  return <>
    <section className="analytics-summary" aria-label="Итоги аналитики">
      <div><span>Доход</span><strong className="amount-income">+{formatMoney(value.totals.incomeMinor, value.currency)}</strong></div>
      <div><span>Расход</span><strong>{formatMoney(value.totals.expenseMinor, value.currency)}</strong></div>
      <div><span>Результат</span><strong className={value.totals.netMinor >= 0 ? "amount-income" : "amount-negative"}>{formatSignedMoney(value.totals.netMinor, value.currency)}</strong></div>
    </section>
    <section className="analytics-grid">
      <article className="panel analytics-panel analytics-line-panel"><SectionTitle title={value.scope === "year" ? "Динамика по месяцам" : "Динамика по дням"} action={<LineChart size={18} />} /><FlowLineChart value={value} /></article>
      <article className="panel analytics-panel"><SectionTitle title="Вклад участников" action={<BarChart3 size={18} />} /><PeopleBars value={value} /></article>
      <article className="panel analytics-panel"><SectionTitle title="Категории расходов" action={<CircleDot size={18} />} /><div className="analytics-pie-layout"><div className="analytics-pie" style={{ background: pie }}><span><strong>{value.categories.length}</strong><small>категорий</small></span></div><div className="pie-legend">{value.categories.slice(0, 7).map((category) => <div key={category.key}><span style={{ background: category.color }} /><strong>{category.name}</strong><small>{formatMoney(category.amountMinor, value.currency)}</small></div>)}</div></div></article>
      <article className="panel analytics-panel analytics-category-people"><SectionTitle title="Категории по участникам" /><div className="category-people-list">{value.categories.map((category) => <div className="category-people-row" key={category.key}><span className="category-preview" style={{ background: category.color }}><IconGlyph name={category.iconKey} size={17} /></span><strong>{category.name}</strong><div>{category.people.length ? category.people.map((person) => <span key={person.key}>{person.name}<b>{formatMoney(person.amountMinor, value.currency)}</b></span>) : <span>Нет данных</span>}</div><b>{formatMoney(category.amountMinor, value.currency)}</b></div>)}</div></article>
      <article className="panel analytics-panel analytics-counterparties"><SectionTitle title="Контрагенты и источники" action={<TrendingUp size={18} />} /><CounterpartyRanking value={value} /></article>
    </section>
  </>;
}

function CounterpartyRanking({ value }: { value: AnalyticsData }) {
  const income = [...value.counterparties]
    .filter((item) => item.incomeMinor > 0)
    .sort((left, right) => right.incomeMinor - left.incomeMinor)
    .slice(0, 6);
  const expenses = [...value.counterparties]
    .filter((item) => item.expenseMinor > 0)
    .sort((left, right) => right.expenseMinor - left.expenseMinor)
    .slice(0, 6);
  const list = (items: typeof income, mode: "income" | "expense") => items.length ? (
    <ol className="counterparty-ranking-list">
      {items.map((item, index) => <li key={item.key}>
        <span>{index + 1}</span>
        <div><strong>{item.name}</strong><small>{item.transactionCount} {operationWord(item.transactionCount)}, последняя {new Date(`${item.lastSeen}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</small></div>
        <b className={mode === "income" ? "amount-income" : ""}>{mode === "income" ? "+" : ""}{formatMoney(mode === "income" ? item.incomeMinor : item.expenseMinor, value.currency)}</b>
      </li>)}
    </ol>
  ) : <p className="counterparty-empty">Пока нет подтверждённых операций с контрагентами.</p>;
  return <div className="counterparty-ranking-columns">
    <section><h3>Кто приносит доход</h3>{list(income, "income")}</section>
    <section><h3>Кому уходит больше всего</h3>{list(expenses, "expense")}</section>
  </div>;
}

function operationWord(count: number): string {
  const tens = count % 100;
  const units = count % 10;
  if (units === 1 && tens !== 11) return "операция";
  if (units >= 2 && units <= 4 && (tens < 12 || tens > 14)) return "операции";
  return "операций";
}

function PeopleBars({ value }: { value: AnalyticsData }) {
  const max = Math.max(1, ...value.people.flatMap((person) => [person.incomeMinor, person.expenseMinor]));
  return <div className="people-bars">{value.people.map((person) => <div className="person-bar-row" key={person.key}><span className="mini-avatar" style={{ background: person.accentColor }}>{person.avatarDataUrl ? <img src={person.avatarDataUrl} alt="" /> : person.name.slice(0, 1)}</span><strong>{person.name}</strong><div className="bar-pair"><span className="income-bar" style={{ "--bar": `${(person.incomeMinor / max) * 100}%` } as CSSProperties}><i /></span><span className="expense-bar" style={{ "--bar": `${(person.expenseMinor / max) * 100}%` } as CSSProperties}><i /></span></div><small><b>+{formatMoney(person.incomeMinor, value.currency)}</b><b>{formatMoney(person.expenseMinor, value.currency)}</b></small></div>)}</div>;
}

function FlowLineChart({ value }: { value: AnalyticsData }) {
  const width = 720; const height = 230; const pad = 18;
  const points = value.series.length ? value.series : [{ bucket: "", incomeMinor: 0, expenseMinor: 0 }];
  const max = Math.max(1, ...points.flatMap((point) => [point.incomeMinor, point.expenseMinor]));
  const line = (key: "incomeMinor" | "expenseMinor") => points.map((point, index) => {
    const x = pad + (index / Math.max(1, points.length - 1)) * (width - pad * 2);
    const y = height - pad - (point[key] / max) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return <div className="flow-line-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Линейная диаграмма доходов и расходов"><g className="chart-grid-lines">{[0, 1, 2, 3, 4].map((row) => <line x1={pad} y1={pad + row * ((height - pad * 2) / 4)} x2={width - pad} y2={pad + row * ((height - pad * 2) / 4)} key={row} />)}</g><polyline className="income-line" points={line("incomeMinor")} /><polyline className="expense-line" points={line("expenseMinor")} /></svg><div className="chart-legend"><span><i className="income-dot" />Доход</span><span><i className="expense-dot" />Расход</span></div></div>;
}
