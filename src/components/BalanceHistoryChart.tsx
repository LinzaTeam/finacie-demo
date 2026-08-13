import { useId, useState } from "react";
import type { CSSProperties } from "react";
import { formatMoney, formatSignedMoney } from "../lib/format";
import type { DashboardData } from "../types";

type BalanceHistoryChartProps = {
  currentBalanceMinor: number;
  currency: string;
  generatedAt: string;
  period: string;
  periodLabel: string;
  points: DashboardData["cashflow"];
};

type BalancePoint = {
  date: string;
  balanceMinor: number;
  incomeMinor: number;
  expenseMinor: number;
  changeMinor: number;
};

const WIDTH = 680;
const HEIGHT = 176;
const PLOT_LEFT = 72;
const PLOT_RIGHT = 12;
const PLOT_TOP = 14;
const PLOT_BOTTOM = 30;

function validPeriod(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function daysInPeriod(period: string): number {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function formatAxis(amountMinor: number, currency: string): string {
  const amount = amountMinor / 100;
  const sign = amount < 0 ? "−" : "";
  const value = Math.abs(amount);
  const compact = value >= 10_000 ? Math.round(value / 1_000) : Math.round(value / 100) / 10;
  const unit = value >= 10_000 ? "тыс." : "тыс.";
  const currencySign = currency === "RUB" ? "₽" : currency;
  return `${sign}${compact} ${unit} ${currencySign}`;
}

function niceScale(values: number[]) {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const range = Math.max(rawMax - rawMin, Math.max(Math.abs(rawMax), 1) * 0.16);
  const roughStep = range / 3;
  const power = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const normalized = roughStep / power;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power;
  const min = Math.floor((rawMin - range * 0.12) / step) * step;
  const max = Math.ceil((rawMax + range * 0.12) / step) * step;
  return { min, max: Math.max(max, min + step), step };
}

export function buildBalanceSeries(
  currentBalanceMinor: number,
  generatedAt: string,
  period: string,
  points: DashboardData["cashflow"],
): BalancePoint[] {
  const activePeriod = validPeriod(period) ? period : generatedAt.slice(0, 7);
  const dayCount = daysInPeriod(activePeriod);
  const asOfDay = generatedAt.slice(0, 7) === activePeriod
    ? Math.max(1, Math.min(dayCount, Number(generatedAt.slice(8, 10))))
    : dayCount;
  const cashflowByDate = new Map<string, { incomeMinor: number; expenseMinor: number }>();

  points
    .filter((point) => point.date.startsWith(activePeriod))
    .forEach((point) => {
      const current = cashflowByDate.get(point.date) ?? { incomeMinor: 0, expenseMinor: 0 };
      cashflowByDate.set(point.date, {
        incomeMinor: current.incomeMinor + point.incomeMinor,
        expenseMinor: current.expenseMinor + point.expenseMinor,
      });
    });

  const netForPeriod = [...cashflowByDate.values()]
    .reduce((sum, point) => sum + point.incomeMinor - point.expenseMinor, 0);
  let balance = currentBalanceMinor - netForPeriod;

  return Array.from({ length: asOfDay }, (_, index) => {
    const date = `${activePeriod}-${String(index + 1).padStart(2, "0")}`;
    const cashflow = cashflowByDate.get(date) ?? { incomeMinor: 0, expenseMinor: 0 };
    const changeMinor = cashflow.incomeMinor - cashflow.expenseMinor;
    balance += changeMinor;
    return { date, balanceMinor: balance, ...cashflow, changeMinor };
  });
}

export function BalanceHistoryChart({ currentBalanceMinor, currency, generatedAt, period, periodLabel, points }: BalanceHistoryChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const gradientId = useId();
  const series = buildBalanceSeries(currentBalanceMinor, generatedAt, period, points);
  const scale = niceScale(series.map((point) => point.balanceMinor));
  const plotWidth = WIDTH - PLOT_LEFT - PLOT_RIGHT;
  const plotHeight = HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const toX = (index: number) => PLOT_LEFT + (index / Math.max(series.length - 1, 1)) * plotWidth;
  const toY = (value: number) => PLOT_TOP + ((scale.max - value) / (scale.max - scale.min)) * plotHeight;
  const linePath = series.map((point, index) => `${index === 0 ? "M" : "L"}${toX(index)} ${toY(point.balanceMinor)}`).join(" ");
  const areaPath = `${linePath} L ${toX(series.length - 1)} ${HEIGHT - PLOT_BOTTOM} L ${toX(0)} ${HEIGHT - PLOT_BOTTOM} Z`;
  const ticks = Array.from({ length: 4 }, (_, index) => scale.min + scale.step * index);
  const current = series.at(-1)!;
  const lowest = Math.min(...series.map((point) => point.balanceMinor));
  const highest = Math.max(...series.map((point) => point.balanceMinor));
  const labelIndexes = Array.from(new Set([0, Math.round((series.length - 1) / 2), series.length - 1]));
  const currentDay = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(`${current.date}T12:00:00+03:00`));
  const activePoint = activeIndex === null ? null : series[activeIndex];
  const activeX = activeIndex === null ? 0 : toX(activeIndex);
  const activeY = activePoint === null ? 0 : toY(activePoint.balanceMinor);
  const activeDate = activePoint === null ? "" : new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${activePoint.date}T12:00:00+03:00`));
  const activeChange = activePoint?.changeMinor ?? 0;
  const activePointLabel = activePoint === null
    ? ""
    : `${activeDate}: баланс ${formatMoney(activePoint.balanceMinor, currency)}. Пополнено ${formatMoney(activePoint.incomeMinor, currency)}. Потрачено ${formatMoney(activePoint.expenseMinor, currency)}. Разница ${formatSignedMoney(activeChange, currency)}.`;
  const tooltipStyle = activePoint === null ? undefined : ({
    "--balance-tooltip-x": `${(activeX / WIDTH) * 100}%`,
    "--balance-tooltip-y": `${(activeY / HEIGHT) * 100}%`,
  } as CSSProperties);

  const selectNearestPoint = (clientX: number, bounds: DOMRect) => {
    if (bounds.width <= 0) return;
    const svgX = ((clientX - bounds.left) / bounds.width) * WIDTH;
    const ratio = Math.min(1, Math.max(0, (svgX - PLOT_LEFT) / plotWidth));
    setActiveIndex(Math.round(ratio * Math.max(series.length - 1, 0)));
  };

  return (
    <figure className="balance-history-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        tabIndex={0}
        onBlur={() => setActiveIndex(null)}
        onFocus={() => setActiveIndex(series.length - 1)}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          setActiveIndex((index) => {
            if (event.key === "Home") return 0;
            if (event.key === "End") return series.length - 1;
            const currentIndex = index ?? series.length - 1;
            return event.key === "ArrowLeft"
              ? Math.max(0, currentIndex - 1)
              : Math.min(series.length - 1, currentIndex + 1);
          });
        }}
        onPointerDown={(event) => selectNearestPoint(event.clientX, event.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setActiveIndex(null)}
        onPointerMove={(event) => selectNearestPoint(event.clientX, event.currentTarget.getBoundingClientRect())}
      >
        <title id={titleId}>Баланс по дням за {periodLabel}</title>
        <desc id={descriptionId}>Баланс изменился с {formatMoney(series[0].balanceMinor, currency)} до {formatMoney(currentBalanceMinor, currency)} на {currentDay}. Минимум {formatMoney(lowest, currency)}, максимум {formatMoney(highest, currency)}. Линия строится по проведённым операциям выбранного периода. Наведите указатель на график или используйте стрелки влево и вправо, чтобы посмотреть баланс по дням.</desc>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--sky)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--sky)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <text className="balance-chart-axis-title" x={PLOT_LEFT} y="10">Баланс, тыс.</text>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="balance-chart-grid" x1={PLOT_LEFT} x2={WIDTH - PLOT_RIGHT} y1={toY(tick)} y2={toY(tick)} />
            <text className="balance-chart-y-label" x={PLOT_LEFT - 8} y={toY(tick) + 3} textAnchor="end">{formatAxis(tick, currency)}</text>
          </g>
        ))}
        <path className="balance-chart-area" d={areaPath} fill={`url(#${gradientId})`} />
        <path className="balance-chart-line" d={linePath} />
        {activePoint ? (
          <>
            <line className="balance-chart-active-line" x1={activeX} x2={activeX} y1={PLOT_TOP} y2={HEIGHT - PLOT_BOTTOM} />
            <circle className="balance-chart-active-point" cx={activeX} cy={activeY} r="4.4" />
          </>
        ) : null}
        <line className="balance-chart-now-line" x1={toX(series.length - 1)} x2={toX(series.length - 1)} y1={PLOT_TOP} y2={HEIGHT - PLOT_BOTTOM} />
        <circle className="balance-chart-current-point" cx={toX(series.length - 1)} cy={toY(current.balanceMinor)} r="4.4" />
        <text className="balance-chart-now-label" x={toX(series.length - 1)} y={PLOT_TOP + 9} textAnchor="end">сейчас</text>
        {labelIndexes.map((index) => (
          <text className="balance-chart-x-label" key={series[index].date} x={toX(index)} y={HEIGHT - 6} textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"}>
            {Number(series[index].date.slice(-2))}
          </text>
        ))}
      </svg>
      {activePoint ? (
        <div
          className="balance-chart-tooltip"
          data-align={activeIndex === 0 ? "start" : activeIndex === series.length - 1 ? "end" : "center"}
          data-placement={activeY < PLOT_TOP + 84 ? "below" : "above"}
          style={tooltipStyle}
          aria-hidden="true"
        >
          <time dateTime={activePoint.date}>{activeDate}</time>
          <strong>{formatMoney(activePoint.balanceMinor, currency)}</strong>
          <dl>
            <div><dt>Пополнено</dt><dd className={activePoint.incomeMinor > 0 ? "positive" : "neutral"}>{formatSignedMoney(activePoint.incomeMinor, currency)}</dd></div>
            <div><dt>Потрачено</dt><dd className={activePoint.expenseMinor > 0 ? "negative" : "neutral"}>{formatSignedMoney(-activePoint.expenseMinor, currency)}</dd></div>
            <div className="balance-chart-tooltip-net"><dt>Разница</dt><dd className={activeChange > 0 ? "positive" : activeChange < 0 ? "negative" : "neutral"}>{formatSignedMoney(activeChange, currency)}</dd></div>
          </dl>
        </div>
      ) : null}
      <span className="sr-only" aria-live="polite">{activePointLabel}</span>
    </figure>
  );
}
