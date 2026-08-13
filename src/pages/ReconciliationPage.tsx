import { Check, CheckCircle2, ClipboardCheck, UserRound } from "lucide-react";
import { DataNotices, PageHeader } from "../components/PageChrome";
import { routeHref } from "../routes";
import type { FinancePageProps } from "./types";

export function ReconciliationPage({
  data,
  source,
  theme,
  onThemeToggle,
  onNewOperation,
  onSearch,
  activeUser,
  selectedPeriod,
  onPeriodChange,
}: FinancePageProps) {
  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Автосверка"
        subtitle="Расчёты строятся только по подтверждённым операциям"
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

      <section className="reconciliation-hero reconciliation-complete">
        <span className="reconciliation-icon" aria-hidden="true"><Check size={27} strokeWidth={2} /></span>
        <span>Автоматический режим</span>
        <h2>Ручная сдача дня не нужна</h2>
        <p>{data.reconciliation.nextAction}</p>
      </section>

      <section className="reconciliation-grid">
        <div className="panel participant-panel">
          <h2>Кто может вносить операции</h2>
          {data.people.map((person) => (
            <div className="participant-row" key={person.key}>
              <span aria-hidden="true"><UserRound size={18} strokeWidth={1.8} /></span>
              <strong>{person.name}</strong>
              <small>Автор и участник операции фиксируются в журнале</small>
              <CheckCircle2 size={19} strokeWidth={1.9} aria-label="Учёт включён" />
            </div>
          ))}
        </div>

        <dl className="panel reconciliation-stats">
          <div><dt>Период</dt><dd>{data.reconciliation.periodLabel}</dd></div>
          <div><dt>Правило</dt><dd>Только подтверждённое</dd></div>
          <div><dt>Внимание</dt><dd>{data.attention.total}</dd></div>
        </dl>
      </section>

      <a className="reconciliation-control-link" href={routeHref("attention")}>
        <ClipboardCheck size={19} strokeWidth={1.8} aria-hidden="true" />
        <span><strong>Открыть контроль</strong><small>Там подтверждаются дубли и отображаются ближайшие платежи.</small></span>
      </a>
    </main>
  );
}
