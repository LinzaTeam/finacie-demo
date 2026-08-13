import type { CSSProperties, FormEvent } from "react";
import { CalendarClock, CircleDollarSign, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { deletePlannedPayment, savePlannedPayment } from "../api/customization";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { formatMoney, formatShortDate } from "../lib/format";
import type { DashboardData } from "../types";
import type { FinancePageProps } from "./types";

type Payment = DashboardData["plannedPayments"][number];

export function PlanPage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser,
  selectedPeriod, onPeriodChange, activeUserKey, canWrite = true, onDataChange, onRefresh,
}: FinancePageProps) {
  const [editing, setEditing] = useState<Payment | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const plannedExpense = data.plan?.expenseMinor ?? 0;
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

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="План"
        subtitle="Плановые поступления, расходы и ближайшие платежи"
        periodLabel={data.meta.periodLabel}
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
        <div><strong>{data.plannedPayments.length} запланировано</strong><span>Повторяющиеся записи появятся в следующем месяце</span></div>
        <button className="primary-button" type="button" onClick={() => setEditing("new")} disabled={!canWrite}>
          <Plus size={17} aria-hidden="true" /> Платёж или доход
        </button>
      </div>

      <section className="plan-grid">
        <div className="panel plan-remaining">
          <span>План расходов</span>
          <strong>{plannedExpense > 0 ? formatMoney(remaining, data.availableMoney.currency) : "Не задан"}</strong>
          <p>{plannedExpense > 0 ? `Факт: ${formatMoney(actualExpense, data.month.currency)}` : "Добавьте регулярные и разовые расходы ниже"}</p>
          <div className="budget-ring" style={ringStyle} aria-label={plannedExpense > 0 ? `Исполнено ${Math.round(usedShare * 100)} процентов плана расходов` : "План расходов не задан"}>
            <span><strong>{plannedExpense > 0 ? `${Math.round(usedShare * 100)}%` : "Нет"}</strong><small>{plannedExpense > 0 ? "исполнено" : "плана"}</small></span>
          </div>
        </div>

        <div className="panel category-plan">
          <SectionTitle title="Факт по категориям" />
          <div className="category-plan-list">
            {data.categories.map((category, index) => {
              const progress = Math.max(8, Math.round(category.share * 100));
              return (
                <div className="category-plan-row" key={category.id}>
                  <span className={`category-symbol category-symbol-${(index % 4) + 1}`} aria-hidden="true" />
                  <span className="category-plan-copy"><strong>{category.label}</strong><span className="category-line" aria-hidden="true"><i style={{ width: `${progress}%` }} /></span></span>
                  <span className="category-plan-value"><strong>{formatMoney(category.amountMinor, category.currency)}</strong><small>за период</small></span>
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
    </main>
  );
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
