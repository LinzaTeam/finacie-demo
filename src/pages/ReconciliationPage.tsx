import { Check, CheckCircle2, CircleAlert, UserRound } from "lucide-react";
import { DataNotices, PageHeader } from "../components/PageChrome";
import type { FinancePageProps } from "./types";

export function ReconciliationPage({
  data,
  source,
  theme,
  onThemeToggle,
  onNewOperation,
  onSearch,
  activeUser,
}: FinancePageProps) {
  const complete = data.reconciliation.status === "complete";

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Сверка"
        subtitle="Общая проверка дней, дублей и остатков"
        periodLabel={data.reconciliation.periodLabel}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation}
        onSearch={onSearch}
        activeUser={activeUser}
      />
      <DataNotices source={source} fx={data.meta.fx} />

      <section className={complete ? "reconciliation-hero reconciliation-complete" : "reconciliation-hero reconciliation-attention"}>
        <span className="reconciliation-icon" aria-hidden="true">
          {complete ? <Check size={27} strokeWidth={2} /> : <CircleAlert size={27} strokeWidth={1.8} />}
        </span>
        <span>Сверка недели</span>
        <h2>{complete ? "Всё сошлось" : "Есть что проверить"}</h2>
        <p>{data.reconciliation.nextAction}</p>
      </section>

      <section className="reconciliation-grid">
        <div className="panel participant-panel">
          <h2>Участники</h2>
          {["Участник 1", "Участник 2"].map((name, index) => {
            const done = index < data.reconciliation.completedParticipants;
            return (
              <div className="participant-row" key={name}>
                <span aria-hidden="true"><UserRound size={18} strokeWidth={1.8} /></span>
                <strong>{name}</strong>
                <small>{done ? "Период подтверждён" : "Требуется проверка"}</small>
                {done ? <CheckCircle2 size={19} strokeWidth={1.9} aria-label="Готово" /> : <CircleAlert size={19} strokeWidth={1.8} aria-label="Нужна проверка" />}
              </div>
            );
          })}
        </div>

        <dl className="panel reconciliation-stats">
          <div><dt>Период</dt><dd>{data.reconciliation.periodLabel}</dd></div>
          <div><dt>Подтверждено</dt><dd>{data.reconciliation.completedParticipants} из {data.reconciliation.totalParticipants}</dd></div>
          <div><dt>Открытые вопросы</dt><dd>{data.reconciliation.openIssues}</dd></div>
        </dl>
      </section>
    </main>
  );
}
