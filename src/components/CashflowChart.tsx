import { useId } from "react";
import { formatCompactMoney, formatMoney, formatShortDate } from "../lib/format";
import type { DashboardData } from "../types";

type CashflowChartProps = {
  points: DashboardData["cashflow"];
  currency: string;
};

const WIDTH = 760;
const HEIGHT = 240;
const PAD_X = 24;
const PAD_Y = 24;

function makePolyline(values: number[], maxValue: number): string {
  const usableWidth = WIDTH - PAD_X * 2;
  const usableHeight = HEIGHT - PAD_Y * 2;
  return values
    .map((value, index) => {
      const x = PAD_X + (index / Math.max(values.length - 1, 1)) * usableWidth;
      const y = HEIGHT - PAD_Y - (value / Math.max(maxValue, 1)) * usableHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

export function CashflowChart({ points, currency }: CashflowChartProps) {
  const titleId = useId();
  const descriptionId = useId();
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [point.incomeMinor, point.expenseMinor]),
  );
  const incomePoints = makePolyline(
    points.map((point) => point.incomeMinor),
    maxValue,
  );
  const expensePoints = makePolyline(
    points.map((point) => point.expenseMinor),
    maxValue,
  );
  const totalIncome = points.reduce((sum, point) => sum + point.incomeMinor, 0);
  const totalExpense = points.reduce((sum, point) => sum + point.expenseMinor, 0);

  return (
    <div className="cashflow-visual">
      <div className="chart-legend" aria-hidden="true">
        <span><i className="legend-line legend-income" />Доходы</span>
        <span><i className="legend-line legend-expense" />Расходы</span>
      </div>

      <svg
        className="cashflow-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        preserveAspectRatio="none"
      >
        <title id={titleId}>Динамика доходов и расходов за 30 дней</title>
        <desc id={descriptionId}>
          Всего доходов {formatMoney(totalIncome, currency)}, расходов {formatMoney(totalExpense, currency)}.
        </desc>
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={PAD_Y + (HEIGHT - PAD_Y * 2) * fraction}
            y2={PAD_Y + (HEIGHT - PAD_Y * 2) * fraction}
            className="chart-grid-line"
          />
        ))}
        <polyline points={incomePoints} className="chart-line chart-line-income" />
        <polyline points={expensePoints} className="chart-line chart-line-expense" />
      </svg>

      <div className="chart-axis" aria-hidden="true">
        <span>{points[0] ? formatShortDate(points[0].date) : ""}</span>
        <span>{formatCompactMoney(maxValue, currency)}</span>
        <span>{points.at(-1) ? formatShortDate(points.at(-1)!.date) : ""}</span>
      </div>

      <details className="chart-data">
        <summary>Показать данные графика</summary>
        <div className="table-scroll" tabIndex={0} aria-label="Таблица данных cashflow">
          <table>
            <thead>
              <tr><th>Дата</th><th>Доходы</th><th>Расходы</th></tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date}>
                  <td>{formatShortDate(point.date)}</td>
                  <td>{formatMoney(point.incomeMinor, currency)}</td>
                  <td>{formatMoney(point.expenseMinor, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
