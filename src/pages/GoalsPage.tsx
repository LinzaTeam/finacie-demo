import type { CSSProperties, FormEvent } from "react";
import { ArrowRightLeft, CalendarDays, CalendarRange, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { deleteGoal, saveGoal, topUpGoal } from "../api/customization";
import { IconGlyph, iconPalette } from "../components/IconGlyph";
import { DataNotices, PageHeader } from "../components/PageChrome";
import { formatMoney } from "../lib/format";
import type { DashboardData } from "../types";
import type { FinancePageProps } from "./types";

const palette = ["#364C84", "#95B1EE", "#D0D9F5", "#E7F1AB", "#D99A9A", "#C7A9D8"];
type Goal = DashboardData["goals"][number];
type GoalTopUp = {
  amountMinor: number;
  accountFrom: string;
  accountTo: string;
  personKey: string;
};

function moneyInputToMinor(value: string): number {
  const parsed = Number(value.replaceAll(" ", "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
}

export function savingPace(
  goal: Goal,
  now = new Date(),
): { dailyMinor: number; monthlyMinor: number; status: "active" | "complete" | "overdue" } | null {
  if (!goal.targetDate) return null;
  const remainingMinor = Math.max(0, goal.targetMinor - goal.currentMinor);
  if (remainingMinor === 0) return { dailyMinor: 0, monthlyMinor: 0, status: "complete" };

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(`${goal.targetDate}T12:00:00`);
  const daysLeft = Math.floor((target.getTime() - today.getTime()) / 86_400_000) + 1;
  if (daysLeft <= 0) return { dailyMinor: 0, monthlyMinor: 0, status: "overdue" };

  const dailyMinor = Math.ceil(remainingMinor / daysLeft);
  return {
    dailyMinor,
    monthlyMinor: Math.ceil(remainingMinor * 30.4375 / daysLeft),
    status: "active",
  };
}

function preferredSourceAccount(accounts: DashboardData["accounts"], personKey: string, currency: string): string {
  return accounts.find((account) => account.ownerKey === personKey && account.currency === currency && account.group === "operating")?.id
    || accounts.find((account) => account.ownerKey === personKey && account.currency === currency)?.id
    || "";
}

function preferredTargetAccount(accounts: DashboardData["accounts"], sourceAccount: string, currency: string): string {
  return accounts.find((account) => account.id !== sourceAccount && account.currency === currency && account.group === "savings")?.id
    || accounts.find((account) => account.id !== sourceAccount && account.currency === currency)?.id
    || "";
}

export function GoalsPage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser,
  selectedPeriod, onPeriodChange, activeUserKey, canWrite = true, onDataChange, onRefresh,
}: FinancePageProps) {
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const [topUp, setTopUp] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);
  const saved = data.goals.reduce((sum, goal) => sum + goal.currentMinor, 0);
  const target = data.goals.reduce((sum, goal) => sum + goal.targetMinor, 0);

  const updateDemo = (goal: Goal) => {
    const exists = data.goals.some((item) => item.id === goal.id);
    onDataChange?.({ ...data, goals: exists ? data.goals.map((item) => item.id === goal.id ? goal : item) : [...data.goals, goal] });
  };

  const applyDemoTopUp = (goal: Goal, topUpInput: GoalTopUp) => {
    const sourceAccount = data.accounts.find((account) => account.id === topUpInput.accountFrom);
    const targetAccount = data.accounts.find((account) => account.id === topUpInput.accountTo);
    const subject = data.people.find((person) => person.key === topUpInput.personKey);
    if (!sourceAccount || !targetAccount || !subject) throw new Error("Выберите участника и два счёта для перевода");
    if (sourceAccount.balanceMinor < topUpInput.amountMinor) throw new Error("На счёте недостаточно денег для пополнения");

    const availableDelta = sourceAccount.group === "operating" && targetAccount.group !== "operating"
      ? -topUpInput.amountMinor
      : sourceAccount.group !== "operating" && targetAccount.group === "operating"
        ? topUpInput.amountMinor
        : 0;
    const occurredAt = new Date().toISOString();
    onDataChange?.({
      ...data,
      availableMoney: { ...data.availableMoney, amountMinor: data.availableMoney.amountMinor + availableDelta },
      accounts: data.accounts.map((account) => {
        if (account.id === sourceAccount.id) return { ...account, balanceMinor: account.balanceMinor - topUpInput.amountMinor };
        if (account.id === targetAccount.id) return { ...account, balanceMinor: account.balanceMinor + topUpInput.amountMinor };
        return account;
      }),
      goals: data.goals.map((item) => item.id === goal.id ? { ...item, currentMinor: item.currentMinor + topUpInput.amountMinor } : item),
      transactions: [{
        id: `demo-goal-top-up-${Date.now()}`,
        occurredAt,
        title: `Пополнение цели «${goal.name}»`,
        detail: `${sourceAccount.name} → ${targetAccount.name}`,
        kind: "transfer",
        amountMinor: topUpInput.amountMinor,
        currency: goal.currency,
        status: "confirmed",
        actorKey: activeUserKey,
        actorName: activeUser,
        subjectKey: subject.key,
        subjectName: subject.name,
      }, ...data.transactions],
    });
  };

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Цели"
        subtitle={data.goals.length > 0 ? `Собрано ${formatMoney(saved, data.availableMoney.currency)} из ${formatMoney(target, data.availableMoney.currency)}` : "Накопления на важные планы"}
        periodLabel={data.meta.periodLabel} fx={data.meta.fx} attentionCount={data.attention.total} theme={theme} onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation} onSearch={onSearch} activeUser={activeUser}
        selectedPeriod={selectedPeriod} onPeriodChange={onPeriodChange}
      />
      <DataNotices source={source} fx={data.meta.fx} />

      <div className="product-page-toolbar">
        <div><strong>{data.goals.length} целей</strong><span>Темп обновляется каждый день до выбранной даты</span></div>
      </div>

      <section className="goals-grid" aria-label="Цели">
        {data.goals.map((goal, index) => {
          const progress = Math.min(100, Math.round((goal.currentMinor / goal.targetMinor) * 100));
          const pace = savingPace(goal);
          const style = { "--progress": `${progress * 3.6}deg`, "--goal-color": goal.color } as CSSProperties;
          return (
            <article className={`goal-card goal-card-${(index % 3) + 1}`} style={style} key={goal.id}>
              <button className="goal-card-main" type="button" onClick={() => setEditing(goal)} aria-label={`Настроить цель «${goal.name}»`}>
                <div className="goal-ring" style={style}>
                  <span><IconGlyph name={goal.iconKey} size={28} strokeWidth={1.7} aria-hidden="true" /></span>
                </div>
                <span className="goal-percent">{progress}%</span>
                <h2>{goal.name}</h2>
                <strong>{formatMoney(goal.currentMinor, goal.currency)}</strong>
                <small>из {formatMoney(goal.targetMinor, goal.currency)}</small>
                <span className="goal-owner">{goal.ownerName}</span>
                {pace?.status === "active" ? (
                  <span className="goal-pace" aria-label={`Нужно откладывать ${formatMoney(pace.dailyMinor, goal.currency)} в день или ${formatMoney(pace.monthlyMinor, goal.currency)} в месяц`}>
                    <span className="goal-deadline"><CalendarDays size={14} aria-hidden="true" />{formatMoney(pace.dailyMinor, goal.currency)} в день</span>
                    <span className="goal-deadline"><CalendarRange size={14} aria-hidden="true" />{formatMoney(pace.monthlyMinor, goal.currency)} в месяц</span>
                  </span>
                ) : pace?.status === "complete" ? <span className="goal-deadline">Цель достигнута</span>
                  : pace?.status === "overdue" ? <span className="goal-deadline">Срок завершён</span>
                    : <span className="goal-deadline">Без срока</span>}
              </button>
              <button className="goal-topup-button" type="button" onClick={() => setTopUp(goal)} disabled={!canWrite}>
                <ArrowRightLeft size={16} aria-hidden="true" />Пополнить
              </button>
            </article>
          );
        })}
        <button className="goal-card goal-create-card" type="button" onClick={() => setEditing("new")} aria-label="Создать новую цель" disabled={!canWrite}>
          <span className="goal-create-icon" aria-hidden="true"><Plus size={30} strokeWidth={1.8} /></span>
          <h2>{data.goals.length ? "Новая цель" : "Создать первую цель"}</h2>
          <p>Укажите сумму и срок. Темп накопления посчитаем автоматически.</p>
        </button>
      </section>

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

      {topUp ? (
        <GoalTopUpDialog
          goal={topUp}
          accounts={data.accounts}
          people={data.people}
          activeUserKey={activeUserKey || data.people[0]?.key || ""}
          saving={saving}
          onClose={() => setTopUp(null)}
          onSave={async (topUpInput) => {
            setSaving(true);
            try {
              if (source === "demo") applyDemoTopUp(topUp, topUpInput);
              else await topUpGoal(topUp.id, {
                amount_cents: topUpInput.amountMinor,
                account_from: topUpInput.accountFrom,
                account_to: topUpInput.accountTo,
                person_key: topUpInput.personKey,
              });
              setTopUp(null);
              if (source === "api") onRefresh?.();
            } finally { setSaving(false); }
          }}
        />
      ) : null}
    </main>
  );
}

function GoalTopUpDialog({ goal, accounts, people, activeUserKey, saving, onClose, onSave }: {
  goal: Goal;
  accounts: DashboardData["accounts"];
  people: DashboardData["people"];
  activeUserKey: string;
  saving: boolean;
  onClose: () => void;
  onSave: (topUp: GoalTopUp) => Promise<void>;
}) {
  const initialPersonKey = activeUserKey || goal.ownerKey || people[0]?.key || "";
  const initialSourceAccount = preferredSourceAccount(accounts, initialPersonKey, goal.currency);
  const [amount, setAmount] = useState("");
  const [personKey, setPersonKey] = useState(initialPersonKey);
  const [accountFrom, setAccountFrom] = useState(initialSourceAccount);
  const [accountTo, setAccountTo] = useState(preferredTargetAccount(accounts, initialSourceAccount, goal.currency));
  const [error, setError] = useState<string | null>(null);
  const sourceAccounts = accounts.filter((account) => account.ownerKey === personKey && account.currency === goal.currency);
  const targetAccounts = accounts.filter((account) => account.id !== accountFrom && account.currency === goal.currency);
  const sourceAccount = accounts.find((account) => account.id === accountFrom);
  const amountMinor = moneyInputToMinor(amount);
  const insufficientFunds = Boolean(sourceAccount && amountMinor > sourceAccount.balanceMinor);
  const canSubmit = amountMinor > 0 && Boolean(accountFrom) && Boolean(accountTo) && !insufficientFunds && !saving;

  const choosePerson = (nextPersonKey: string) => {
    const nextSource = preferredSourceAccount(accounts, nextPersonKey, goal.currency);
    setPersonKey(nextPersonKey);
    setAccountFrom(nextSource);
    setAccountTo(preferredTargetAccount(accounts, nextSource, goal.currency));
    setError(null);
  };

  const chooseSource = (nextSource: string) => {
    setAccountFrom(nextSource);
    setAccountTo((currentTarget) => currentTarget && currentTarget !== nextSource
      ? currentTarget
      : preferredTargetAccount(accounts, nextSource, goal.currency));
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    void onSave({ amountMinor, accountFrom, accountTo, personKey }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Не удалось пополнить цель. Повторите ещё раз.");
    });
  };

  return (
    <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="product-dialog product-dialog-compact goal-topup-dialog" onSubmit={submit}>
        <header><div><h2>Пополнить цель</h2><p>Переведём деньги между счетами и сразу обновим «{goal.name}».</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть"><X size={18} /></button></header>
        <label><span>Сумма пополнения, {goal.currency === "RUB" ? "₽" : goal.currency}</span><input inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setError(null); }} placeholder="0" autoFocus /></label>
        {people.length > 1 ? <label><span>Кто пополняет</span><select value={personKey} onChange={(event) => choosePerson(event.target.value)}>{people.map((person) => <option value={person.key} key={person.key}>{person.name}</option>)}</select></label> : null}
        <div className="form-split">
          <label><span>С какого счёта</span><select value={accountFrom} onChange={(event) => chooseSource(event.target.value)}>{sourceAccounts.length ? sourceAccounts.map((account) => <option value={account.id} key={account.id}>{account.name} · {formatMoney(account.balanceMinor, account.currency)}</option>) : <option value="">Нет счёта в {goal.currency}</option>}</select></label>
          <label><span>На какой счёт</span><select value={accountTo} onChange={(event) => { setAccountTo(event.target.value); setError(null); }}>{targetAccounts.length ? targetAccounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>) : <option value="">Нет подходящего счёта</option>}</select></label>
        </div>
        <p className="goal-topup-note"><ArrowRightLeft size={15} aria-hidden="true" />Это перевод между своими счетами: доходы и расходы не исказятся.</p>
        {insufficientFunds ? <p className="goal-topup-error" role="alert">На выбранном счёте недостаточно денег.</p> : null}
        {error ? <p className="goal-topup-error" role="alert">{error}</p> : null}
        <footer><button className="quiet-button" type="button" onClick={onClose} disabled={saving}>Отмена</button><button className="primary-button" type="submit" disabled={!canSubmit}><ArrowRightLeft size={16} />{saving ? "Перевожу" : "Перевести и пополнить"}</button></footer>
      </form>
    </div>
  );
}

function GoalDialog({ goal, people, activeUserKey, saving, onClose, onSave, onDelete }: {
  goal: Goal | null;
  people: DashboardData["people"];
  activeUserKey: string;
  saving: boolean;
  onClose: () => void;
  onSave: (goal: Goal) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? String(goal.targetMinor / 100) : "");
  const [current, setCurrent] = useState(goal ? String(goal.currentMinor / 100) : "0");
  const [owner, setOwner] = useState<string | null>(goal?.ownerKey ?? activeUserKey);
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [icon, setIcon] = useState(goal?.iconKey ?? "flag");
  const [color, setColor] = useState(goal?.color ?? palette[0]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const targetMinor = moneyInputToMinor(target);
    const currentMinor = moneyInputToMinor(current);
    if (!name.trim() || targetMinor <= 0) return;
    const person = people.find((item) => item.key === owner);
    void onSave({
      id: goal?.id ?? `goal-${Date.now()}`,
      ownerKey: owner,
      ownerName: person?.name || "Общая цель",
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
        <div className="form-split"><label><span>Владелец</span><select value={owner ?? ""} onChange={(event) => setOwner(event.target.value || null)}><option value="">Общая цель</option>{people.map((person) => <option value={person.key} key={person.key}>{person.name}</option>)}</select></label><label><span>Желаемая дата</span><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label></div>
        <fieldset className="icon-palette"><legend>Иконка</legend>{iconPalette.slice(0, 16).map((key) => <button className={icon === key ? "palette-active" : ""} type="button" onClick={() => setIcon(key)} aria-label={key} key={key}><IconGlyph name={key} size={18} /></button>)}</fieldset>
        <fieldset className="color-palette"><legend>Цвет</legend>{palette.map((value) => <button className={color === value ? "palette-active" : ""} style={{ background: value }} type="button" onClick={() => setColor(value)} aria-label={`Цвет ${value}`} key={value} />)}</fieldset>
        <footer>{onDelete ? <button className="danger-button" type="button" onClick={() => void onDelete()} disabled={saving}><Trash2 size={16} />Удалить</button> : <span />}<button className="primary-button" type="submit" disabled={saving}>{saving ? "Сохраняю" : "Сохранить"}</button></footer>
      </form>
    </div>
  );
}
