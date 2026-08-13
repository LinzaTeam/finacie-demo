import { useId } from "react";
import { formatMoney } from "../lib/format";
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
};

const WIDTH = 680;
const HEIGHT = 176;
const PLOT_LEFT = 54;
const PLOT_RIGHT = 10;
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
  const netByDate = new Map<string, number>();

  points
    .filter((point) => point.date.startsWith(activePeriod))
    .forEach((point) => {
      netByDate.set(point.date, (netByDate.get(point.date) ?? 0) + point.incomeMinor - point.expenseMinor);
    });

  const netForPeriod = [...netByDate.values()].reduce((sum, value) => sum + value, 0);
  let balance = currentBalanceMinor - netForPeriod;

  return Array.from({ length: asOfDay }, (_, index) => {
    const date = `${activePeriod}-${String(index + 1).padStart(2, "0")}`;
    balance += netByDate.get(date) ?? 0;
    return { date, balanceMinor: balance };
  });
}

export function BalanceHistoryChart({ currentBalanceMinor, currency, generatedAt, period, periodLabel, points }: BalanceHistoryChartProps) {
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

  return (
    <figure className="balance-history-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <title id={titleId}>Баланс по дням за {periodLabel}</title>
        <desc id={descriptionId}>Баланс изменился с {formatMoney(series[0].balanceMinor, currency)} до {formatMoney(currentBalanceMinor, currency)} на {currentDay}. Минимум {formatMoney(lowest, currency)}, максимум {formatMoney(highest, currency)}. Линия строится по проведённым операциям выбранного периода.</desc>
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
        <line className="balance-chart-now-line" x1={toX(series.length - 1)} x2={toX(series.length - 1)} y1={PLOT_TOP} y2={HEIGHT - PLOT_BOTTOM} />
        <circle className="balance-chart-current-point" cx={toX(series.length - 1)} cy={toY(current.balanceMinor)} r="4.4" />
        <text className="balance-chart-now-label" x={toX(series.length - 1)} y={PLOT_TOP + 9} textAnchor="end">сейчас</text>
        {labelIndexes.map((index) => (
          <text className="balance-chart-x-label" key={series[index].date} x={toX(index)} y={HEIGHT - 6} textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"}>
            {Number(series[index].date.slice(-2))}
          </text>
        ))}
      </svg>
    </figure>
  );
}
