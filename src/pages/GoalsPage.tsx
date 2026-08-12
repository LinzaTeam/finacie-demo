import type { CSSProperties, FormEvent } from "react";
import { CalendarDays, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { deleteGoal, saveGoal } from "../api/customization";
import { IconGlyph, iconPalette } from "../components/IconGlyph";
import { DataNotices, PageHeader } from "../components/PageChrome";
import { formatMoney } from "../lib/format";
import type { DashboardData } from "../types";
import type { FinancePageProps } from "./types";

const palette = ["#364C84", "#95B1EE", "#D0D9F5", "#E7F1AB", "#D99A9A", "#C7A9D8"];

function dailySaving(goal: DashboardData["goals"][number]): number | null {
  if (!goal.targetDate) return null;
  const days = Math.ceil((new Date(`${goal.targetDate}T12:00:00`).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 0;
  return Math.max(0, Math.ceil((goal.targetMinor - goal.currentMinor) / days));
}

export function GoalsPage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser,
  selectedPeriod, onPeriodChange, activeUserKey, canWrite = true, onDataChange, onRefresh,
}: FinancePageProps) {
  const [editing, setEditing] = useState<DashboardData["goals"][number] | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const saved = data.goals.reduce((sum, goal) => sum + goal.currentMinor, 0);
  const target = data.goals.reduce((sum, goal) => sum + goal.targetMinor, 0);

  const updateDemo = (goal: DashboardData["goals"][number]) => {
    const exists = data.goals.some((item) => item.id === goal.id);
    onDataChange?.({ ...data, goals: exists ? data.goals.map((item) => item.id === goal.id ? goal : item) : [...data.goals, goal] });
  };

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Цели"
        subtitle={data.goals.length > 0 ? `Собрано ${formatMoney(saved, data.availableMoney.currency)} из ${formatMoney(target, data.availableMoney.currency)}` : "Накопления на важные планы"}
        periodLabel={data.meta.periodLabel} theme={theme} onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation} onSearch={onSearch} activeUser={activeUser}
        selectedPeriod={selectedPeriod} onPeriodChange={onPeriodChange}
      />
      <DataNotices source={source} fx={data.meta.fx} />

      <div className="product-page-toolbar">
        <div><strong>{data.goals.length} целей</strong><span>Срок можно оставить открытым</span></div>
        <button className="primary-button" type="button" onClick={() => setEditing("new")}>
          <Plus size={17} aria-hidden="true" /> Новая цель
        </button>
      </div>

      {data.goals.length > 0 ? (
        <section className="goals-grid">
          {data.goals.map((goal, index) => {
            const progress = Math.min(100, Math.round((goal.currentMinor / goal.targetMinor) * 100));
            const perDay = dailySaving(goal);
            const style = { "--progress": `${progress * 3.6}deg`, "--goal-color": goal.color } as CSSProperties;
            return (
              <button className={`goal-card goal-card-${(index % 3) + 1}`} style={style} type="button" onClick={() => setEditing(goal)} key={goal.id}>
                <div className="goal-ring" style={style}>
                  <span><IconGlyph name={goal.iconKey} size={28} strokeWidth={1.7} aria-hidden="true" /></span>
                </div>
                <span className="goal-percent">{progress}%</span>
                <h2>{goal.name}</h2>
                <strong>{formatMoney(goal.currentMinor, goal.currency)}</strong>
                <small>из {formatMoney(goal.targetMinor, goal.currency)}</small>
                <span className="goal-owner">{goal.ownerName}</span>
                {goal.targetDate ? (
                  <span className="goal-deadline"><CalendarDays size={14} aria-hidden="true" />
                    {perDay === 0 ? "Срок завершён" : `${formatMoney(perDay ?? 0, goal.currency)} в день`}
                  </span>
                ) : <span className="goal-deadline">Без срока</span>}
              </button>
            );
          })}
        </section>
      ) : (
        <section className="empty-product-state">
          <span className="empty-state-icon" aria-hidden="true"><IconGlyph name="flag" size={25} strokeWidth={1.8} /></span>
          <h2>Целей пока нет</h2>
          <p>Создайте цель, укажите сумму и при желании дату. Приложение рассчитает темп накопления.</p>
        </section>
      )}

      {editing ? (
        <GoalDialog
          goal={editing === "new" ? null : editing}
          people={data.people}
          activeUserKey={activeUserKey || data.people[0]?.key || ""}
          saving={saving}
          onClose={() => setEditing(null)}
          onDelete={editing === "new" ? undefined : async () => {
            setSaving(true);
            try {
              if (source === "demo") onDataChange?.({ ...data, goals: data.goals.filter((goal) => goal.id !== editing.id) });
              else await deleteGoal(editing.id);
              setEditing(null);
              if (source === "api") onRefresh?.();
            } finally { setSaving(false); }
          }}
          onSave={async (goal) => {
            if (!canWrite) return;
            setSaving(true);
            try {
              if (source === "demo") updateDemo(goal);
              else await saveGoal(goal.id, {
                owner_person_key: goal.ownerKey,
                name: goal.name,
                target_cents: goal.targetMinor,
                current_cents: goal.currentMinor,
                currency: goal.currency,
                target_date: goal.targetDate,
                icon_key: goal.iconKey,
                color: goal.color,
              });
              setEditing(null);
              if (source === "api") onRefresh?.();
            } finally { setSaving(false); }
          }}
        />
      ) : null}
    </main>
  );
}

function GoalDialog({ goal, people, activeUserKey, saving, onClose, onSave, onDelete }: {
  goal: DashboardData["goals"][number] | null;
  people: DashboardData["people"];
  activeUserKey: string;
  saving: boolean;
  onClose: () => void;
  onSave: (goal: DashboardData["goals"][number]) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? String(goal.targetMinor / 100) : "");
  const [current, setCurrent] = useState(goal ? String(goal.currentMinor / 100) : "0");
  const [owner, setOwner] = useState(goal?.ownerKey ?? activeUserKey);
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [icon, setIcon] = useState(goal?.iconKey ?? "flag");
  const [color, setColor] = useState(goal?.color ?? palette[0]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const targetMinor = Math.round(Number(target.replace(",", ".")) * 100);
    const currentMinor = Math.round(Number(current.replace(",", ".")) * 100);
    if (!name.trim() || !Number.isFinite(targetMinor) || targetMinor <= 0 || currentMinor < 0) return;
    const person = people.find((item) => item.key === owner);
    void onSave({
      id: goal?.id ?? `goal-${Date.now()}`,
      ownerKey: owner,
      ownerName: person?.name || owner,
      name: name.trim(),
      targetMinor,
      currentMinor,
      currency: goal?.currency ?? "RUB",
      targetDate: targetDate || null,
      iconKey: icon,
      color,
    });
  };

  return (
    <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="product-dialog" onSubmit={submit}>
        <header><div><h2>{goal ? "Настроить цель" : "Новая цель"}</h2><p>Сумму можно обновлять по мере накопления.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть"><X size={18} /></button></header>
        <label><span>Название</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Отпуск" autoFocus /></label>
        <div className="form-split"><label><span>Нужно накопить, ₽</span><input inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} /></label><label><span>Уже накоплено, ₽</span><input inputMode="decimal" value={current} onChange={(event) => setCurrent(event.target.value)} /></label></div>
        <div className="form-split"><label><span>Владелец</span><select value={owner} onChange={(event) => setOwner(event.target.value)}>{people.map((person) => <option value={person.key} key={person.key}>{person.name}</option>)}</select></label><label><span>Желаемая дата</span><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label></div>
        <fieldset className="icon-palette"><legend>Иконка</legend>{iconPalette.slice(0, 16).map((key) => <button className={icon === key ? "palette-active" : ""} type="button" onClick={() => setIcon(key)} aria-label={key} key={key}><IconGlyph name={key} size={18} /></button>)}</fieldset>
        <fieldset className="color-palette"><legend>Цвет</legend>{palette.map((value) => <button className={color === value ? "palette-active" : ""} style={{ background: value }} type="button" onClick={() => setColor(value)} aria-label={`Цвет ${value}`} key={value} />)}</fieldset>
        <footer>{onDelete ? <button className="danger-button" type="button" onClick={() => void onDelete()} disabled={saving}><Trash2 size={16} />Удалить</button> : <span />}<button className="primary-button" type="submit" disabled={saving}>{saving ? "Сохраняю" : "Сохранить"}</button></footer>
      </form>
    </div>
  );
}
