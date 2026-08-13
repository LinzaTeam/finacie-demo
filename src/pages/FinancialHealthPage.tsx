import type { CSSProperties } from "react";
import { ArrowRight, BarChart3, CalendarClock, CircleGauge, ShieldAlert, Sparkles } from "lucide-react";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { formatMoney, formatSignedMoney } from "../lib/format";
import { deriveFinancialHealth, type HealthRisk } from "../lib/financialHealth";
import { routeHref } from "../routes";
import type { FinancePageProps } from "./types";

export function FinancialHealthPage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser, selectedPeriod, onPeriodChange,
}: FinancePageProps) {
  const health = deriveFinancialHealth(data);
  const currency = data.availableMoney.currency;

  return <main className="app-page health-page" id="page-content" tabIndex={-1}>
    <PageHeader
      title="Финансовое здоровье"
      subtitle="Экспериментальная управленческая оценка по текущим данным семьи"
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

    <section className="health-score-panel" aria-labelledby="health-score-title">
      <div className="health-score-copy">
        <span className="health-experiment-label"><Sparkles size={15} aria-hidden="true" /> Экстра · тестовая функция</span>
        <h2 id="health-score-title">{health.emoji} {health.title}</h2>
        <p>{health.summary}</p>
        <a className="text-link" href="#health-method">Как считаем <ArrowRight size={15} aria-hidden="true" /></a>
      </div>
      <div className="health-score-mark" style={{ "--score": `${health.score * 10}%` } as CSSProperties} aria-label={`Оценка финансового здоровья ${health.score} из 10`}>
        <strong>{health.score}</strong><span>из 10</span>
      </div>
      <div className="health-score-context">
        <span>Ближайшие обязательства</span>
        <strong>{formatMoney(health.upcomingCommitmentsMinor, currency)}</strong>
        <small>на следующие 30 дней</small>
      </div>
    </section>

    <section className="health-workspace" aria-label="Финансовая оценка и прогноз">
      <article className="panel health-metrics-panel">
        <SectionTitle title="Из чего сложилась оценка" action={<CircleGauge size={18} aria-hidden="true" />} />
        <div className="health-metric-list">
          {health.metrics.map((metric) => <div className="health-metric-row" key={metric.key}>
            <div><strong>{metric.label}</strong><small>{metric.detail}</small></div>
            <div className="health-metric-value"><b>{metric.value}</b><span className={`health-metric-points health-metric-${metric.tone}`}>{metric.points}/{metric.maxPoints}</span></div>
          </div>)}
        </div>
      </article>

      <article className="panel health-forecast-panel">
        <SectionTitle title="Прогноз на 90 дней" action={<CalendarClock size={18} aria-hidden="true" />} />
        <p className="health-panel-intro">Три сценария используют текущий дневной поток и известные будущие платежи. Это ориентир для разговора о плане, не гарантия.</p>
        <div className="health-scenario-list">
          <ForecastRow label="Осторожный" description="55% текущего темпа" value={health.forecast.cautiousMinor} currency={currency} tone="cautious" />
          <ForecastRow label="Базовый" description="Текущий темп" value={health.forecast.baseMinor} currency={currency} tone="base" />
          <ForecastRow label="Оптимистичный" description="120% текущего темпа" value={health.forecast.optimisticMinor} currency={currency} tone="optimistic" />
        </div>
        <dl className="health-forecast-details">
          <div><dt>Известные поступления</dt><dd className="amount-income">+{formatMoney(health.knownIncomeMinor, currency)}</dd></div>
          <div><dt>Известные платежи</dt><dd>{formatMoney(health.knownExpenseMinor, currency)}</dd></div>
          <div><dt>Темп за день</dt><dd className={health.forecast.dailyNetMinor >= 0 ? "amount-income" : "amount-negative"}>{formatRoundedSignedMoney(health.forecast.dailyNetMinor, currency)}</dd></div>
        </dl>
      </article>

      <article className="panel health-risk-panel">
        <SectionTitle title="Карта рисков" action={<ShieldAlert size={18} aria-hidden="true" />} />
        <p className="health-panel-intro">Вероятность × ущерб по шкале 1–5. Красная зона требует действия, жёлтая — плана и владельца.</p>
        <RiskMatrix risks={health.risks} />
        <ol className="health-risk-list">
          {health.risks.map((risk) => <li key={risk.id}>
            <span className={`health-risk-badge health-risk-${risk.tone}`}>{risk.score}</span>
            <div><strong>{risk.title}</strong><small>{risk.detail}</small><em>{risk.action}</em></div>
          </li>)}
        </ol>
      </article>
    </section>

    <section className="health-analysis-grid" aria-label="Горизонтальный и вертикальный анализ">
      <article className="panel health-analysis-panel">
        <SectionTitle title="Горизонтальный анализ" action={<BarChart3 size={18} aria-hidden="true" />} />
        <p className="health-panel-intro">Сравнение свободных денег с началом выбранного периода.</p>
        <dl className="health-horizontal-values">
          <div><dt>Начало периода</dt><dd>{formatMoney(health.horizontal.previousMinor, currency)}</dd></div>
          <div><dt>Сейчас</dt><dd>{formatMoney(health.horizontal.currentMinor, currency)}</dd></div>
          <div><dt>Изменение</dt><dd className={health.horizontal.changeMinor >= 0 ? "amount-income" : "amount-negative"}>{formatSignedMoney(health.horizontal.changeMinor, currency)}{health.horizontal.changePercent !== null ? ` · ${health.horizontal.changePercent >= 0 ? "+" : ""}${health.horizontal.changePercent.toFixed(1)}%` : ""}</dd></div>
        </dl>
      </article>
      <article className="panel health-analysis-panel">
        <SectionTitle title="Вертикальный анализ" action={<CircleGauge size={18} aria-hidden="true" />} />
        <p className="health-panel-intro">Структура ликвидных средств по рабочим счетам, накоплениям и наличным.</p>
        <div className="health-asset-mix">
          {health.assetMix.map((item) => <div className="health-asset-row" key={item.key}>
            <div><strong>{item.label}</strong><span>{formatMoney(item.amountMinor, currency)}</span></div>
            <div className="health-asset-track" aria-label={`${item.label}: ${item.share}%`}><i style={{ width: `${item.share}%` }} /></div>
            <b>{item.share}%</b>
          </div>)}
        </div>
      </article>
    </section>

    <section className="panel health-method-panel" id="health-method">
      <SectionTitle title="Методика и границы расчёта" />
      <div>
        <p>Оценка объединяет резерв, чистый поток, покрытие ближайших платежей, план/факт, сверку и полноту данных. Нормативы — ориентиры для первичной диагностики: они не заменяют договоры, налоговый расчёт или консультацию специалиста.</p>
        <ul>
          {health.insights.map((item) => <li key={item}>{item}</li>)}
          <li>Для бизнес‑метрик вроде маржинальности, точки безубыточности и ROI понадобятся отдельные статьи выручки, переменных и постоянных расходов.</li>
        </ul>
      </div>
      <a className="text-link" href={routeHref("plan")}>Проверить план <ArrowRight size={15} aria-hidden="true" /></a>
    </section>
  </main>;
}

function ForecastRow({ label, description, value, currency, tone }: { label: string; description: string; value: number; currency: string; tone: string }) {
  return <div className={`health-scenario health-scenario-${tone}`}>
    <div><strong>{label}</strong><small>{description}</small></div>
    <b className={value >= 0 ? "amount-income" : "amount-negative"}>{formatRoundedMoney(value, currency)}</b>
  </div>;
}

function formatRoundedMoney(value: number, currency: string): string {
  return formatMoney(Math.round(value / 100) * 100, currency);
}

function formatRoundedSignedMoney(value: number, currency: string): string {
  return formatSignedMoney(Math.round(value / 100) * 100, currency);
}

function RiskMatrix({ risks }: { risks: HealthRisk[] }) {
  return <div className="health-risk-map-wrap">
    <span className="health-risk-axis health-risk-axis-y">Ущерб</span>
    <div className="health-risk-map" role="img" aria-label="Матрица рисков: вероятность по горизонтали, ущерб по вертикали">
      {[5, 4, 3, 2, 1].flatMap((impact) => [1, 2, 3, 4, 5].map((probability) => {
        const active = risks.find((risk) => risk.probability === probability && risk.impact === impact);
        const score = probability * impact;
        const tone = score >= 15 ? "red" : score >= 7 ? "yellow" : "green";
        return <span className={`health-risk-cell health-risk-cell-${tone}`} key={`${probability}-${impact}`} title={`Вероятность ${probability}, ущерб ${impact}`}>
          {active ? <b aria-label={`${active.title}: ${active.score} баллов`}>{active.score}</b> : null}
        </span>;
      }))}
    </div>
    <div className="health-risk-axis-x"><span>Вероятность</span><small>1</small><small>2</small><small>3</small><small>4</small><small>5</small></div>
  </div>;
}
