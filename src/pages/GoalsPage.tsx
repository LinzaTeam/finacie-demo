import type { CSSProperties } from "react";
import { Laptop, Plane, ShieldCheck } from "lucide-react";
import { DataNotices, PageHeader } from "../components/PageChrome";
import { formatMoney } from "../lib/format";
import type { FinancePageProps } from "./types";

const demoGoals = [
  { id: "trip", name: "Отпуск", savedMinor: 84_000_00, targetMinor: 140_000_00, icon: Plane },
  { id: "laptop", name: "Новый MacBook", savedMinor: 96_500_00, targetMinor: 180_000_00, icon: Laptop },
  { id: "reserve", name: "Подушка", savedMinor: 42_000_00, targetMinor: 300_000_00, icon: ShieldCheck },
] as const;

export function GoalsPage({
  data,
  source,
  theme,
  onThemeToggle,
  onNewOperation,
  onSearch,
  activeUser,
}: FinancePageProps) {
  const goals = source === "demo" ? demoGoals : [];
  const saved = goals.reduce((sum, goal) => sum + goal.savedMinor, 0);
  const target = goals.reduce((sum, goal) => sum + goal.targetMinor, 0);

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Цели"
        subtitle={goals.length > 0 ? `Собрано ${formatMoney(saved, data.availableMoney.currency)} из ${formatMoney(target, data.availableMoney.currency)}` : "Накопления на важные планы"}
        periodLabel={data.meta.periodLabel}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation}
        onSearch={onSearch}
        activeUser={activeUser}
      />
      <DataNotices source={source} fx={data.meta.fx} />

      {goals.length > 0 ? (
        <section className="goals-grid">
          {goals.map((goal, index) => {
            const progress = Math.min(100, Math.round((goal.savedMinor / goal.targetMinor) * 100));
            const style = { "--progress": `${progress * 3.6}deg` } as CSSProperties;
            const Icon = goal.icon;
            return (
              <article className={`goal-card goal-card-${index + 1}`} key={goal.id}>
                <div className="goal-ring" style={style}>
                  <span><Icon size={28} strokeWidth={1.7} aria-hidden="true" /></span>
                </div>
                <span className="goal-percent">{progress}%</span>
                <h2>{goal.name}</h2>
                <strong>{formatMoney(goal.savedMinor, data.availableMoney.currency)}</strong>
                <small>из {formatMoney(goal.targetMinor, data.availableMoney.currency)}</small>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-product-state">
          <FlagEmptyIcon />
          <h2>Целей пока нет</h2>
          <p>Добавление целей появится после подключения записи в финансовую базу.</p>
        </section>
      )}
    </main>
  );
}

function FlagEmptyIcon() {
  return <span className="empty-state-icon" aria-hidden="true"><ShieldCheck size={25} strokeWidth={1.8} /></span>;
}
