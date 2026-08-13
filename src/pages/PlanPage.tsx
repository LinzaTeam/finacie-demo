import type { CSSProperties, FormEvent } from "react";
import { CalendarCheck, CalendarClock, CircleDollarSign, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  deletePlannedPayment,
  saveMonthlyCategoryBudgetPlan,
  savePlannedPayment,
  type MonthlyCategoryBudgetEntry,
} from "../api/customization";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { formatMoney, formatShortDate } from "../lib/format";
import type { DashboardData } from "../types";
import type { FinancePageProps } from "./types";

type Payment = DashboardData["plannedPayments"][number];
type MonthlyBudget = DashboardData["monthlyCategoryBudgets"][number];

export function PlanPage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser,
  selectedPeriod, onPeriodChange, activeUserKey, canWrite = true, onDataChange, onRefresh,
}: FinancePageProps) {
  const [editing, setEditing] = useState<Payment | "new" | null>(null);
  const [planning, setPlanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const plannedExpense = data.plan?.expenseMinor ?? 0;
  const mandatoryExpense = data.plan?.mandatoryExpenseMinor ?? plannedExpense;
  const categoryBudgetExpense = data.plan?.categoryBudgetMinor ?? 0;
  const actualExpense = data.month.expenseMinor;
  const remaining = Math.max(0, plannedExpense - actualExpense);
  const usedShare = plannedExpense > 0 ? Math.min(1, actualExpense / plannedExpense) : 0;
  const ringStyle = { "--progress": `${Math.round(usedShare * 360)}deg` } as CSSProperties;
  const cardPayments = data.obligations
    .filter((item) => item.minimumPaymentMinor && item.dueDate)
    .map((item) => ({
      id: item.id,
      name: item.name,
      kind: "expense" as const,
      ownerKey: "",
      ownerName: item.owner,
      amountMinor: item.minimumPaymentMinor || 0,
      currency: item.currency,
      dueDate: item.dueDate || "",
      recurrence: item.recurrence || "monthly",
      accountKey: item.accountKey || null,
      categoryKey: null,
      note: item.note || null,
      readOnly: true,
    }));
  const payments = [...data.plannedPayments, ...cardPayments].sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  const updateDemo = (payment: Payment) => {
    const exists = data.plannedPayments.some((item) => item.id === payment.id);
    onDataChange?.({
      ...data,
      plannedPayments: exists
        ? data.plannedPayments.map((item) => item.id === payment.id ? payment : item)
        : [...data.plannedPayments, payment],
    });
  };

  const updateDemoBudgetPlan = (personKey: string, entries: MonthlyCategoryBudgetEntry[]) => {
    const person = data.people.find((item) => item.key === personKey);
    const retained = data.monthlyCategoryBudgets.filter((item) => item.personKey !== personKey);
    const updated: MonthlyBudget[] = entries
      .filter((item) => item.amount_cents > 0)
      .map((item) => ({
        period: selectedPeriod,
        personKey,
        personName: person?.name || personKey,
        categoryKey: item.category_key,
        amountMinor: item.amount_cents,
        currency: data.availableMoney.currency,
      }));
    const nextBudgets = [...retained, ...updated];
    const nextCategoryBudget = nextBudgets.reduce((sum, item) => sum + item.amountMinor, 0);
    onDataChange?.({
      ...data,
      monthlyCategoryBudgets: nextBudgets,
      plan: {
        budgetMinor: mandatoryExpense + nextCategoryBudget,
        currency: data.availableMoney.currency,
        incomeMinor: data.plan?.incomeMinor ?? 0,
        expenseMinor: mandatoryExpense + nextCategoryBudget,
        mandatoryExpenseMinor: mandatoryExpense,
        categoryBudgetMinor: nextCategoryBudget,
      },
    });
  };

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="План"
        subtitle="Плановые поступления, расходы и ближайшие платежи"
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

      <div className="product-page-toolbar">
        <div><strong>{payments.length} обязательных платежей</strong><span>Сначала обязательное, затем личные лимиты по категориям</span></div>
        <div className="plan-toolbar-actions">
          <button className="quiet-button" type="button" onClick={() => setEditing("new")} disabled={!canWrite}>
            <Plus size={16} aria-hidden="true" /> Платёж или доход
          </button>
          <button className="primary-button" type="button" onClick={() => setPlanning(true)} disabled={!canWrite}>
            <CalendarCheck size={17} aria-hidden="true" /> Запланировать месяц
          </button>
        </div>
      </div>

      <section className="plan-grid">
        <div className="panel plan-remaining">
          <span>План на месяц</span>
          <strong>{plannedExpense > 0 ? formatMoney(remaining, data.availableMoney.currency) : "Не задан"}</strong>
          <p>{plannedExpense > 0 ? `Обязательное: ${formatMoney(mandatoryExpense, data.month.currency)} · категории: ${formatMoney(categoryBudgetExpense, data.month.currency)}` : "Добавьте обязательные платежи и лимиты по категориям"}</p>
          <div className="budget-ring" style={ringStyle} aria-label={plannedExpense > 0 ? `Исполнено ${Math.round(usedShare * 100)} процентов плана расходов` : "План расходов не задан"}>
            <span><strong>{plannedExpense > 0 ? `${Math.round(usedShare * 100)}%` : "Нет"}</strong><small>{plannedExpense > 0 ? "исполнено" : "плана"}</small></span>
          </div>
        </div>

        <div className="panel category-plan">
          <SectionTitle title="План и факт по категориям" />
          <div className="category-plan-list">
            {data.categories.map((category, index) => {
              const planned = data.monthlyCategoryBudgets
                .filter((budget) => budget.categoryKey === category.id)
                .reduce((sum, budget) => sum + budget.amountMinor, 0);
              const progress = planned > 0
                ? Math.max(4, Math.min(100, Math.round(category.amountMinor / planned * 100)))
                : Math.max(4, Math.round(category.share * 100));
              return (
                <div className="category-plan-row" key={category.id}>
                  <span className={`category-symbol category-symbol-${(index % 4) + 1}`} aria-hidden="true" />
                  <span className="category-plan-copy"><strong>{category.label}</strong><span className="category-line" aria-hidden="true"><i style={{ width: `${progress}%` }} /></span></span>
                  <span className="category-plan-value"><strong>{formatMoney(category.amountMinor, category.currency)}</strong><small>{planned > 0 ? `из ${formatMoney(planned, category.currency)}` : "без лимита"}</small></span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="upcoming-section">
        <SectionTitle title="Ближайшие платежи и обязательства" />
        <div className="upcoming-grid">
          {payments.length > 0 ? payments.map((payment, index) => (
            <button className={`upcoming-card ${"readOnly" in payment ? "upcoming-card-static" : ""}`} type="button" onClick={() => !("readOnly" in payment) && setEditing(payment)} key={`${"readOnly" in payment ? "card" : "plan"}-${payment.id}`}>
              <span className={`payment-icon payment-icon-${(index % 3) + 1}`} aria-hidden="true">{payment.kind === "income" ? <CircleDollarSign size={19} strokeWidth={1.8} /> : <CalendarClock size={19} strokeWidth={1.8} />}</span>
              <span><strong>{payment.name}</strong><small>{payment.kind === "income" ? "Поступление" : "Расход"} · {formatShortDate(payment.dueDate)}</small></span>
              <strong>{payment.kind === "income" ? "+" : ""}{formatMoney(payment.amountMinor, payment.currency)}</strong>
              {!("readOnly" in payment) ? <Pencil size={14} aria-hidden="true" /> : null}
            </button>
          )) : <div className="inline-empty">Запланированных платежей нет.</div>}
        </div>
      </section>

      {editing ? <PaymentDialog
        payment={editing === "new" ? null : editing}
        data={data}
        activeUserKey={activeUserKey || data.people[0]?.key || ""}
        saving={saving}
        onClose={() => setEditing(null)}
        onDelete={editing === "new" ? undefined : async () => {
          setSaving(true);
          try {
            if (source === "demo") onDataChange?.({ ...data, plannedPayments: data.plannedPayments.filter((item) => item.id !== editing.id) });
            else await deletePlannedPayment(editing.id);
            setEditing(null);
            if (source === "api") onRefresh?.();
          } finally { setSaving(false); }
        }}
        onSave={async (payment) => {
          if (!canWrite) return;
          setSaving(true);
          try {
            if (source === "demo") updateDemo(payment);
            else await savePlannedPayment(payment.id, {
              name: payment.name, kind: payment.kind, owner_person_key: payment.ownerKey,
              amount_cents: payment.amountMinor, currency: payment.currency,
              due_date: payment.dueDate, recurrence: payment.recurrence,
              account_key: payment.accountKey, category_key: payment.categoryKey, note: payment.note,
            });
            setEditing(null);
            if (source === "api") onRefresh?.();
          } finally { setSaving(false); }
        }}
      /> : null}
      {planning ? <MonthlyPlanDialog
        data={data}
        period={selectedPeriod}
        mandatoryExpense={mandatoryExpense}
        saving={saving}
        activeUserKey={activeUserKey || data.people[0]?.key || ""}
        onClose={() => setPlanning(false)}
        onSave={async (personKey, entries) => {
          if (!canWrite) return;
          setSaving(true);
          try {
            if (source === "demo") updateDemoBudgetPlan(personKey, entries);
            else await saveMonthlyCategoryBudgetPlan(selectedPeriod, entries);
            setPlanning(false);
            if (source === "api") onRefresh?.();
          } finally { setSaving(false); }
        }}
      /> : null}
    </main>
  );
}

function MonthlyPlanDialog({ data, period, mandatoryExpense, activeUserKey, saving, onClose, onSave }: {
  data: DashboardData;
  period: string;
  mandatoryExpense: number;
  activeUserKey: string;
  saving: boolean;
  onClose: () => void;
  onSave: (personKey: string, entries: MonthlyCategoryBudgetEntry[]) => Promise<void>;
}) {
  const [personKey, setPersonKey] = useState(activeUserKey);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>(() => Object.fromEntries(
    data.people.map((person) => [person.key, Object.fromEntries(data.categories.map((category) => {
      const amount = data.monthlyCategoryBudgets
        .filter((budget) => budget.personKey === person.key && budget.categoryKey === category.id)
        .reduce((sum, budget) => sum + budget.amountMinor, 0);
      return [category.id, amount > 0 ? String(amount / 100) : ""];
    }))]),
  ));
  const currentDraft = draft[personKey] ?? {};
  const categoryTotal = Object.values(currentDraft).reduce((sum, value) => sum + parseBudgetAmount(value), 0);
  const totalPlan = mandatoryExpense + data.monthlyCategoryBudgets
    .filter((budget) => budget.personKey !== personKey)
    .reduce((sum, budget) => sum + budget.amountMinor, 0) + categoryTotal;
  const person = data.people.find((item) => item.key === personKey);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!personKey) return;
    void onSave(personKey, data.categories.map((category) => ({
      person_key: personKey,
      category_key: category.id,
      amount_cents: parseBudgetAmount(currentDraft[category.id] || ""),
    })));
  };

  return <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="product-dialog monthly-plan-dialog" role="dialog" aria-modal="true" aria-labelledby="monthly-plan-title" onSubmit={submit} aria-label="Планирование месяца">
      <header>
        <div><h2 id="monthly-plan-title">Запланировать месяц</h2><p>Обязательные платежи уже учтены. Распределите оставшуюся часть по категориям для каждого участника.</p></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть"><X size={18} /></button>
      </header>
      <div className="monthly-plan-summary" aria-label="Сводка плана">
        <span><small>Обязательное</small><strong>{formatMoney(mandatoryExpense, data.availableMoney.currency)}</strong></span>
        <span><small>Лимиты {person?.name || "участника"}</small><strong>{formatMoney(categoryTotal, data.availableMoney.currency)}</strong></span>
        <span><small>План семьи</small><strong>{formatMoney(totalPlan, data.availableMoney.currency)}</strong></span>
      </div>
      <fieldset className="subject-picker monthly-plan-person-picker">
        <legend>Чей план</legend>
        <div className="segmented-control">
          {data.people.map((item) => <button className={item.key === personKey ? "segment-active" : ""} type="button" aria-pressed={item.key === personKey} onClick={() => setPersonKey(item.key)} key={item.key}>{item.name}</button>)}
        </div>
      </fieldset>
      <div className="monthly-plan-copy"><strong>Лимиты категорий</strong><span>Введите сумму на весь месяц. Пустое поле означает, что лимит не задан.</span></div>
      <div className="monthly-category-inputs">
        {data.categories.map((category) => <label className="monthly-category-input" key={category.id}>
          <span><i style={{ background: category.color }} aria-hidden="true" /><strong>{category.label}</strong><small>Факт: {formatMoney(category.amountMinor, category.currency)}</small></span>
          <input aria-label={`Лимит ${category.label}`} inputMode="decimal" value={currentDraft[category.id] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, [personKey]: { ...current[personKey], [category.id]: event.target.value } }))} placeholder="0" />
        </label>)}
      </div>
      <footer><button className="quiet-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Сохраняю" : "Сохранить план"}</button></footer>
    </form>
  </div>;
}

function parseBudgetAmount(value: string): number {
  const amount = Number(value.trim().replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
}

function PaymentDialog({ payment, data, activeUserKey, saving, onClose, onSave, onDelete }: {
  payment: Payment | null;
  data: DashboardData;
  activeUserKey: string;
  saving: boolean;
  onClose: () => void;
  onSave: (payment: Payment) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(payment?.name ?? "");
  const [kind, setKind] = useState<Payment["kind"]>(payment?.kind ?? "expense");
  const [owner, setOwner] = useState(payment?.ownerKey ?? activeUserKey);
  const [amount, setAmount] = useState(payment ? String(payment.amountMinor / 100) : "");
  const [dueDate, setDueDate] = useState(payment?.dueDate ?? "");
  const [recurrence, setRecurrence] = useState<Payment["recurrence"]>(payment?.recurrence ?? "monthly");
  const [accountKey, setAccountKey] = useState(payment?.accountKey ?? "");
  const [categoryKey, setCategoryKey] = useState(payment?.categoryKey ?? "");
  const [note, setNote] = useState(payment?.note ?? "");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amountMinor = Math.round(Number(amount.replace(",", ".")) * 100);
    if (!name.trim() || !owner || !dueDate || !Number.isFinite(amountMinor) || amountMinor <= 0) return;
    const person = data.people.find((item) => item.key === owner);
    void onSave({
      id: payment?.id ?? `payment-${Date.now()}`,
      name: name.trim(), kind, ownerKey: owner, ownerName: person?.name || owner,
      amountMinor, currency: payment?.currency ?? data.availableMoney.currency,
      dueDate, recurrence, accountKey: accountKey || null,
      categoryKey: kind === "expense" ? categoryKey || null : null,
      note: note.trim() || null,
    });
  };
  return <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="product-dialog" onSubmit={submit}>
      <header><div><h2>{payment ? "Настроить платёж" : "Новый план"}</h2><p>Это напоминание и план, а не проведённая операция.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть"><X size={18} /></button></header>
      <label><span>Название</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, аренда или оплата от клиента" autoFocus /></label>
      <div className="form-split"><label><span>Тип</span><select value={kind} onChange={(event) => setKind(event.target.value as Payment["kind"])}><option value="expense">Расход</option><option value="income">Поступление</option></select></label><label><span>Сумма, ₽</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></label></div>
      <div className="form-split"><label><span>За кого</span><select value={owner} onChange={(event) => setOwner(event.target.value)}>{data.people.map((person) => <option value={person.key} key={person.key}>{person.name}</option>)}</select></label><label><span>Дата</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>
      <div className="form-split"><label><span>Повтор</span><select value={recurrence} onChange={(event) => setRecurrence(event.target.value as Payment["recurrence"])}><option value="monthly">Каждый месяц</option><option value="once">Один раз</option></select></label><label><span>Счёт</span><select value={accountKey} onChange={(event) => setAccountKey(event.target.value)}><option value="">Не выбран</option>{data.accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label></div>
      {kind === "expense" ? <label><span>Категория</span><select value={categoryKey} onChange={(event) => setCategoryKey(event.target.value)}><option value="">Не выбрана</option>{data.categories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label> : null}
      <label><span>Комментарий</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Необязательно" /></label>
      <footer>{onDelete ? <button className="danger-button" type="button" onClick={() => void onDelete()} disabled={saving}><Trash2 size={16} />Удалить</button> : <span />}<button className="primary-button" type="submit" disabled={saving}>{saving ? "Сохраняю" : "Сохранить"}</button></footer>
    </form>
  </div>;
}
