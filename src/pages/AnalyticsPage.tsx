import type { CSSProperties } from "react";
import { BarChart3, CircleDot, LineChart, TrendingUp } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { getAnalytics, type AnalyticsRange } from "../api/analytics";
import { IconGlyph } from "../components/IconGlyph";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { formatMoney, formatSignedMoney } from "../lib/format";
import type { AnalyticsData } from "../types";
import type { FinancePageProps } from "./types";

type AnalyticsRangePreset = "auto" | "month" | "quarter" | "year" | "custom";

export function AnalyticsPage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser,
  selectedPeriod, onPeriodChange,
}: FinancePageProps) {
  const [scope, setScope] = useState<AnalyticsData["scope"]>("month");
  const [person, setPerson] = useState<string | null>(null);
  const [rangePreset, setRangePreset] = useState<AnalyticsRangePreset>("auto");
  const [customRange, setCustomRange] = useState<AnalyticsRange>(() => monthRange(selectedPeriod));
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const selectedRange = useMemo(
    () => rangePreset === "auto" ? null : resolveRange(rangePreset, scope, selectedPeriod, data, customRange),
    [customRange, data, rangePreset, scope, selectedPeriod],
  );
  const displayedRange = selectedRange ?? resolveRange("auto", scope, selectedPeriod, data, customRange);
  const rangeError = rangePreset === "custom" ? validateRange(customRange) : null;
  useEffect(() => {
    const controller = new AbortController();
    if (rangeError) {
      setAnalytics(null);
      setStatus("error");
      return () => controller.abort();
    }
    setStatus("loading");
    getAnalytics(data, source, selectedPeriod, scope, person, selectedRange, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setAnalytics(value);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [data, person, rangeError, scope, selectedPeriod, selectedRange, source]);

  return <main className="app-page" id="page-content" tabIndex={-1}>
    <PageHeader title="Аналитика" subtitle="Доходы и расходы вместе и по каждому участнику" periodLabel={data.meta.periodLabel} fx={data.meta.fx} attentionCount={data.attention.total}
      theme={theme} onThemeToggle={onThemeToggle} onNewOperation={onNewOperation} onSearch={onSearch}
      activeUser={activeUser} selectedPeriod={selectedPeriod} onPeriodChange={onPeriodChange} />
    <DataNotices source={source} fx={data.meta.fx} />
    <section className="analytics-filters">
      <div className="analytics-filter-main">
        <div className="segmented-control" aria-label="Глубина аналитики">
          <button className={scope === "month" ? "segment-active" : ""} type="button" onClick={() => setScope("month")}>По дням</button>
          <button className={scope === "year" ? "segment-active" : ""} type="button" onClick={() => setScope("year")}>По месяцам</button>
          <button className={scope === "years" ? "segment-active" : ""} type="button" onClick={() => setScope("years")}>По годам</button>
        </div>
        <label className="analytics-range-filter">
          <span>Отрезок</span>
          <select value={rangePreset} onChange={(event) => setRangePreset(event.target.value as AnalyticsRangePreset)} aria-label="Отрезок аналитики">
            <option value="auto">По разбивке</option>
            <option value="month">Выбранный месяц</option>
            <option value="quarter">Последние 3 месяца</option>
            <option value="year">Выбранный год</option>
            <option value="custom">Свои даты</option>
          </select>
        </label>
        {rangePreset === "custom" ? (
          <div className="analytics-date-range" aria-label="Произвольный отрезок">
            <label><span>С</span><input aria-label="Дата начала" type="date" value={customRange.start} onChange={(event) => setCustomRange((current) => ({ ...current, start: event.target.value }))} /></label>
            <span className="analytics-date-separator">—</span>
            <label><span>По</span><input aria-label="Дата окончания" type="date" value={customRange.end} onChange={(event) => setCustomRange((current) => ({ ...current, end: event.target.value }))} /></label>
          </div>
        ) : <span className="analytics-range-preview">{formatRangeLabel(displayedRange)}</span>}
      </div>
      <label className="person-filter"><span>Участник</span><select className="person-filter-select" value={person ?? "all"} onChange={(event) => setPerson(event.target.value === "all" ? null : event.target.value)}><option value="all">Все вместе</option>{data.people.map((item) => <option value={item.key} key={item.key}>{item.name}</option>)}</select></label>
    </section>
    {status === "loading" ? <div className="panel analytics-loading">Собираю аналитику…</div> : null}
    {status === "error" ? <div className="panel analytics-loading">{rangeError ?? "Не удалось загрузить аналитику."}</div> : null}
    {status === "ready" && analytics ? <AnalyticsContent value={analytics} /> : null}
  </main>;
}

function monthRange(period: string): AnalyticsRange {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start: `${period}-01`, end: lastDay };
}

function yearRange(period: string): AnalyticsRange {
  const year = period.slice(0, 4);
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

function historyRange(data: FinancePageProps["data"], period: string): AnalyticsRange {
  const selectedYear = Number(period.slice(0, 4));
  const firstYear = Math.min(
    selectedYear,
    ...data.transactions
      .map((transaction) => Number(transaction.occurredAt.slice(0, 4)))
      .filter((year) => Number.isFinite(year) && year <= selectedYear),
  );
  return { start: `${firstYear}-01-01`, end: `${selectedYear}-12-31` };
}

function resolveRange(
  preset: AnalyticsRangePreset,
  scope: AnalyticsData["scope"],
  period: string,
  data: FinancePageProps["data"],
  customRange: AnalyticsRange,
): AnalyticsRange {
  if (preset === "custom") return customRange;
  if (preset === "month") return monthRange(period);
  if (preset === "year") return yearRange(period);
  if (preset === "quarter") {
    const month = new Date(`${period}-01T12:00:00+03:00`);
    month.setMonth(month.getMonth() - 2);
    return { start: month.toISOString().slice(0, 7) + "-01", end: monthRange(period).end };
  }
  if (scope === "year") return yearRange(period);
  if (scope === "years") return historyRange(data, period);
  return monthRange(period);
}

function validateRange(range: AnalyticsRange): string | null {
  if (!range.start || !range.end) return "Укажите обе даты для аналитики.";
  if (range.start > range.end) return "Дата начала не может быть позже даты окончания.";
  return null;
}

function formatRangeLabel(range: AnalyticsRange): string {
  const formatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(new Date(`${range.start}T12:00:00+03:00`))} — ${formatter.format(new Date(`${range.end}T12:00:00+03:00`))}`;
}

function AnalyticsContent({ value }: { value: AnalyticsData }) {
  const lineTitle = {
    month: "Динамика по дням",
    year: "Динамика по месяцам",
    years: "Динамика по годам",
  }[value.scope];
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
      <article className="panel analytics-panel analytics-line-panel"><SectionTitle title={lineTitle} action={<LineChart size={18} />} /><FlowLineChart value={value} /></article>
      <article className="panel analytics-panel"><SectionTitle title="Вклад участников" action={<BarChart3 size={18} />} /><PeopleBars value={value} /></article>
      <article className="panel analytics-panel"><SectionTitle title="Доходы по людям" action={<CircleDot size={18} />} /><PeopleDonut value={value} mode="income" /></article>
      <article className="panel analytics-panel"><SectionTitle title="Расходы по людям" action={<CircleDot size={18} />} /><PeopleDonut value={value} mode="expense" /></article>
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

function PeopleDonut({ value, mode }: { value: AnalyticsData; mode: "income" | "expense" }) {
  const rows = value.people
    .map((person) => ({ ...person, amountMinor: mode === "income" ? person.incomeMinor : person.expenseMinor }))
    .filter((person) => person.amountMinor > 0);
  const total = rows.reduce((sum, person) => sum + person.amountMinor, 0);
  let cursor = 0;
  const gradient = rows.map((person) => {
    const start = cursor;
    cursor += (person.amountMinor / Math.max(1, total)) * 100;
    return `${person.accentColor} ${start}% ${cursor}%`;
  }).join(",");
  return rows.length ? <div className="analytics-pie-layout people-donut-layout">
    <div className="analytics-pie people-pie" style={{ background: `conic-gradient(${gradient})` }} aria-label={`${mode === "income" ? "Доходы" : "Расходы"} по участникам`}>
      <span><strong>{formatMoney(total, value.currency)}</strong><small>всего</small></span>
    </div>
    <div className="pie-legend people-pie-legend">{rows.map((person) => <div key={person.key}><span style={{ background: person.accentColor }} /><strong>{person.name}</strong><small>{formatMoney(person.amountMinor, value.currency)} · {Math.round((person.amountMinor / total) * 100)}%</small></div>)}</div>
  </div> : <p className="counterparty-empty">За выбранный период данных пока нет.</p>;
}

function formatFlowBucket(bucket: string, scope: AnalyticsData["scope"]): string {
  if (scope === "years") return `${bucket} год`;
  if (scope === "year") {
    return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" })
      .format(new Date(`${bucket}-01T12:00:00+03:00`));
  }
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${bucket}T12:00:00+03:00`));
}

function formatFlowAxisBucket(bucket: string, scope: AnalyticsData["scope"]): string {
  if (scope === "years") return bucket;
  if (scope === "year") {
    return new Intl.DateTimeFormat("ru-RU", { month: "short" })
      .format(new Date(`${bucket}-01T12:00:00+03:00`))
      .replace(".", "");
  }
  return String(Number(bucket.slice(-2)));
}

export function FlowLineChart({ value }: { value: AnalyticsData }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const width = 720; const height = 230; const padX = 18; const padTop = 18; const padBottom = 30;
  const points = value.series.length ? value.series : [{ bucket: "", incomeMinor: 0, expenseMinor: 0 }];
  const max = Math.max(1, ...points.flatMap((point) => [point.incomeMinor, point.expenseMinor]));
  const plotWidth = width - padX * 2;
  const plotHeight = height - padTop - padBottom;
  const toX = (index: number) => padX + (index / Math.max(1, points.length - 1)) * plotWidth;
  const toY = (amountMinor: number) => padTop + ((max - amountMinor) / max) * plotHeight;
  const line = (key: "incomeMinor" | "expenseMinor") => points.map((point, index) => {
    return `${toX(index)},${toY(point[key])}`;
  }).join(" ");
  const labelIndexes = Array.from(new Set([0, Math.round((points.length - 1) / 2), points.length - 1]));
  const activePoint = activeIndex === null ? null : points[activeIndex];
  const activeX = activeIndex === null ? 0 : toX(activeIndex);
  const activeIncomeY = activePoint === null ? 0 : toY(activePoint.incomeMinor);
  const activeExpenseY = activePoint === null ? 0 : toY(activePoint.expenseMinor);
  const activeY = Math.min(activeIncomeY, activeExpenseY);
  const activeDate = activePoint === null ? "" : formatFlowBucket(activePoint.bucket, value.scope);
  const activeChange = activePoint === null ? 0 : activePoint.incomeMinor - activePoint.expenseMinor;
  const activeLabel = activePoint === null ? "" : `${activeDate}: доход ${formatSignedMoney(activePoint.incomeMinor, value.currency)}, расход ${formatSignedMoney(-activePoint.expenseMinor, value.currency)}, изменение ${formatSignedMoney(activeChange, value.currency)}.`;
  const tooltipStyle = activePoint === null ? undefined : ({
    "--flow-tooltip-x": `${(activeX / width) * 100}%`,
    "--flow-tooltip-y": `${(activeY / height) * 100}%`,
  } as CSSProperties);

  const selectNearestPoint = (clientX: number, bounds: DOMRect) => {
    if (bounds.width <= 0) return;
    const svgX = ((clientX - bounds.left) / bounds.width) * width;
    const ratio = Math.min(1, Math.max(0, (svgX - padX) / plotWidth));
    setActiveIndex(Math.round(ratio * Math.max(points.length - 1, 0)));
  };

  return <figure className="flow-line-chart">
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      tabIndex={0}
      onBlur={() => setActiveIndex(null)}
      onFocus={() => setActiveIndex(points.length - 1)}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        setActiveIndex((index) => {
          if (event.key === "Home") return 0;
          if (event.key === "End") return points.length - 1;
          const currentIndex = index ?? points.length - 1;
          return event.key === "ArrowLeft"
            ? Math.max(0, currentIndex - 1)
            : Math.min(points.length - 1, currentIndex + 1);
        });
      }}
      onPointerDown={(event) => selectNearestPoint(event.clientX, event.currentTarget.getBoundingClientRect())}
      onPointerLeave={() => setActiveIndex(null)}
      onPointerMove={(event) => selectNearestPoint(event.clientX, event.currentTarget.getBoundingClientRect())}
    >
      <title id={titleId}>Доходы и расходы {value.scope === "month" ? "по дням" : value.scope === "year" ? "по месяцам" : "по годам"}</title>
      <desc id={descriptionId}>Наведите указатель на график или используйте стрелки влево и вправо, чтобы посмотреть доход, расход и итоговое изменение за период.</desc>
      <g className="chart-grid-lines">{[0, 1, 2, 3, 4].map((row) => <line x1={padX} y1={padTop + row * (plotHeight / 4)} x2={width - padX} y2={padTop + row * (plotHeight / 4)} key={row} />)}</g>
      <polyline className="income-line" points={line("incomeMinor")} />
      <polyline className="expense-line" points={line("expenseMinor")} />
      {points.length === 1 ? <>
        <circle className="flow-chart-single-point flow-chart-income-point" cx={toX(0)} cy={toY(points[0].incomeMinor)} r="3.5" />
        <circle className="flow-chart-single-point flow-chart-expense-point" cx={toX(0)} cy={toY(points[0].expenseMinor)} r="3.5" />
      </> : null}
      {activePoint ? <>
        <line className="flow-chart-active-line" x1={activeX} x2={activeX} y1={padTop} y2={height - padBottom} />
        <circle className="flow-chart-active-point flow-chart-income-point" cx={activeX} cy={activeIncomeY} r="4.4" />
        <circle className="flow-chart-active-point flow-chart-expense-point" cx={activeX} cy={activeExpenseY} r="4.4" />
      </> : null}
      {labelIndexes.map((index) => <text className="flow-chart-x-label" key={`${points[index].bucket}-${index}`} x={toX(index)} y={height - 7} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}>{formatFlowAxisBucket(points[index].bucket, value.scope)}</text>)}
    </svg>
    {activePoint ? <div
      className="flow-chart-tooltip"
      data-align={activeIndex === 0 ? "start" : activeIndex === points.length - 1 ? "end" : "center"}
      data-placement={activeY < padTop + 70 ? "below" : "above"}
      style={tooltipStyle}
      aria-hidden="true"
    >
      <time dateTime={activePoint.bucket}>{activeDate}</time>
      <dl>
        <div><dt>Доход</dt><dd className={activePoint.incomeMinor > 0 ? "positive" : "neutral"}>{formatSignedMoney(activePoint.incomeMinor, value.currency)}</dd></div>
        <div><dt>Расход</dt><dd className={activePoint.expenseMinor > 0 ? "negative" : "neutral"}>{formatSignedMoney(-activePoint.expenseMinor, value.currency)}</dd></div>
        <div className="flow-chart-tooltip-net"><dt>Изменение</dt><dd className={activeChange > 0 ? "positive" : activeChange < 0 ? "negative" : "neutral"}>{formatSignedMoney(activeChange, value.currency)}</dd></div>
      </dl>
    </div> : null}
    <span className="sr-only" aria-live="polite">{activeLabel}</span>
    <figcaption className="chart-legend"><span><i className="income-dot" />Доход</span><span><i className="expense-dot" />Расход</span></figcaption>
  </figure>;
}
