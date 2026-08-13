import type { FormEvent } from "react";
import { ArrowUpRight, CalendarClock, CreditCard, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import { useState } from "react";
import { deleteManualObligation, saveManualObligation } from "../api/customization";
import { DataNotices, PageHeader } from "../components/PageChrome";
import { formatMoney, formatShortDate } from "../lib/format";
import { routeHref } from "../routes";
import type { DashboardData } from "../types";
import type { FinancePageProps } from "./types";

type Obligation = DashboardData["obligations"][number];

export function ObligationsPage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser,
  selectedPeriod, onPeriodChange, activeUserKey, canWrite = true, onDataChange, onRefresh,
}: FinancePageProps) {
  const [editing, setEditing] = useState<Obligation | "new" | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Obligation | null>(null);
  const [saving, setSaving] = useState(false);
  const total = data.obligations.reduce((sum, item) => sum + item.debtMinor, 0);
  const updateDemo = (obligation: Obligation) => {
    const exists = data.obligations.some((item) => item.id === obligation.id);
    onDataChange?.({ ...data, obligations: exists ? data.obligations.map((item) => item.id === obligation.id ? obligation : item) : [...data.obligations, obligation] });
  };
  const removeObligation = async (obligation: Obligation) => {
    setSaving(true);
    try {
      if (source === "demo") {
        onDataChange?.({ ...data, obligations: data.obligations.filter((item) => item.id !== obligation.id) });
      } else {
        await deleteManualObligation(obligation.id.replace(/^manual:/, ""));
      }
      setPendingDeletion(null);
      setEditing(null);
      if (source === "api") onRefresh?.();
    } finally {
      setSaving(false);
    }
  };

  return <main className="app-page" id="page-content" tabIndex={-1}>
    <PageHeader title="Обязательства" subtitle="Долги и регулярные платежи отдельно от доступных денег" periodLabel={data.meta.periodLabel} fx={data.meta.fx} attentionCount={data.attention.total}
      theme={theme} onThemeToggle={onThemeToggle} onNewOperation={onNewOperation} onSearch={onSearch}
      activeUser={activeUser} selectedPeriod={selectedPeriod} onPeriodChange={onPeriodChange} />
    <DataNotices source={source} fx={data.meta.fx} />

    <section className="obligations-hero">
      <span>Общая задолженность</span><strong>{formatMoney(total, data.availableMoney.currency)}</strong>
      <p>Обязательства не прибавляются к доступным деньгам. Для банковских карт баланс корректируется на странице счёта.</p>
      <button className="primary-button" type="button" onClick={() => setEditing("new")} disabled={!canWrite}><Plus size={17} /> Новое обязательство</button>
    </section>

    <section className="obligation-grid">
      {data.obligations.map((obligation, index) => {
        const editable = source === "demo" || obligation.source === "manual";
        return <article className={`obligation-card obligation-card-${(index % 3) + 1}`} key={obligation.id}>
          <span className="obligation-card-icon" aria-hidden="true"><CreditCard size={22} strokeWidth={1.7} /></span>
          <div className="obligation-card-title"><h2>{obligation.name}</h2><span><UserRound size={14} strokeWidth={1.8} aria-hidden="true" />{obligation.owner}</span></div>
          {editable ? (
            <div className="obligation-actions">
              <button
                className="text-button obligation-edit"
                type="button"
                onClick={() => setEditing(obligation)}
                disabled={!canWrite}
                aria-label={`Настроить обязательство ${obligation.name}`}
              >
                <Pencil size={14} aria-hidden="true" />Настроить
              </button>
              <button
                className="danger-button obligation-delete"
                type="button"
                onClick={() => setPendingDeletion(obligation)}
                disabled={!canWrite}
                aria-label={`Удалить обязательство ${obligation.name}`}
              >
                <Trash2 size={14} aria-hidden="true" />Удалить
              </button>
            </div>
          ) : obligation.accountKey ? (
            <a
              className="text-button obligation-edit"
              href={routeHref("accounts")}
              aria-label={`Настроить связанный счёт для ${obligation.name}`}
            >
              <Pencil size={14} aria-hidden="true" />Настроить счёт <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          ) : null}
          <strong className="obligation-debt">{formatMoney(obligation.debtMinor, obligation.currency)}</strong>
          <dl>
            {obligation.minimumPaymentMinor ? <div><dt>Минимальный платёж</dt><dd>{formatMoney(obligation.minimumPaymentMinor, obligation.currency)}</dd></div> : null}
            {obligation.dueDate ? <div><dt><CalendarClock size={14} strokeWidth={1.8} aria-hidden="true" />Срок</dt><dd>{formatShortDate(obligation.dueDate)}</dd></div> : null}
            {obligation.availableCreditMinor != null ? <div><dt>Доступный лимит</dt><dd>{formatMoney(obligation.availableCreditMinor, obligation.currency)}</dd></div> : null}
            {obligation.note ? <div><dt>Комментарий</dt><dd>{obligation.note}</dd></div> : null}
          </dl>
        </article>;
      })}
    </section>

    {editing ? <ObligationDialog
      obligation={editing === "new" ? null : editing}
      data={data}
      activeUserKey={activeUserKey || data.people[0]?.key || ""}
      saving={saving}
      onClose={() => setEditing(null)}
      onDelete={editing === "new" ? undefined : async () => {
        setPendingDeletion(editing);
        setEditing(null);
      }}
      onSave={async (obligation) => {
        if (!canWrite) return;
        setSaving(true);
        try {
          if (source === "demo") updateDemo(obligation);
          else await saveManualObligation(obligation.id.replace(/^manual:/, ""), {
            name: obligation.name, owner_person_key: obligation.ownerKey || activeUserKey || data.people[0]?.key || "", debt_cents: obligation.debtMinor,
            currency: obligation.currency, min_payment_cents: obligation.minimumPaymentMinor,
            due_date: obligation.dueDate, recurrence: obligation.recurrence || "monthly",
            account_key: obligation.accountKey || null, note: obligation.note || null,
          });
          setEditing(null);
          if (source === "api") onRefresh?.();
        } finally { setSaving(false); }
      }}
    /> : null}
    {pendingDeletion ? <ObligationDeleteDialog
      obligation={pendingDeletion}
      source={source}
      saving={saving}
      onClose={() => !saving && setPendingDeletion(null)}
      onConfirm={() => void removeObligation(pendingDeletion)}
    /> : null}
  </main>;
}

function ObligationDeleteDialog({ obligation, source, saving, onClose, onConfirm }: {
  obligation: Obligation;
  source: FinancePageProps["source"];
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isDemo = source === "demo";
  return <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="product-dialog product-dialog-compact obligation-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-obligation-title">
      <header>
        <div><h2 id="delete-obligation-title">Удалить обязательство?</h2><p>{obligation.name} {isDemo ? "будет убрано из демо до обновления страницы." : "будет убрано из активного списка, а запись сохранится в журнале."}</p></div>
        <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Закрыть"><X size={18} /></button>
      </header>
      <footer>
        <button className="quiet-button" type="button" onClick={onClose} disabled={saving}>Отмена</button>
        <button className="danger-button" type="button" onClick={onConfirm} disabled={saving}><Trash2 size={16} />{saving ? "Удаляю" : "Удалить"}</button>
      </footer>
    </section>
  </div>;
}

function ObligationDialog({ obligation, data, activeUserKey, saving, onClose, onSave, onDelete }: {
  obligation: Obligation | null;
  data: DashboardData;
  activeUserKey: string;
  saving: boolean;
  onClose: () => void;
  onSave: (obligation: Obligation) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(obligation?.name ?? "");
  const [owner, setOwner] = useState(obligation?.ownerKey || data.people.find((person) => person.name === obligation?.owner)?.key || activeUserKey);
  const [debt, setDebt] = useState(obligation ? String(obligation.debtMinor / 100) : "0");
  const [minimum, setMinimum] = useState(obligation?.minimumPaymentMinor ? String(obligation.minimumPaymentMinor / 100) : "");
  const [dueDate, setDueDate] = useState(obligation?.dueDate ?? "");
  const [recurrence, setRecurrence] = useState<"once" | "monthly">(obligation?.recurrence || "monthly");
  const [accountKey, setAccountKey] = useState(obligation?.accountKey ?? "");
  const [note, setNote] = useState(obligation?.note ?? "");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const debtMinor = Math.round(Number(debt.replace(",", ".")) * 100);
    const minimumMinor = minimum.trim() ? Math.round(Number(minimum.replace(",", ".")) * 100) : null;
    if (!name.trim() || !owner || !Number.isFinite(debtMinor) || debtMinor < 0 || (minimumMinor !== null && (!Number.isFinite(minimumMinor) || minimumMinor < 0)) || (minimumMinor && !dueDate)) return;
    const person = data.people.find((item) => item.key === owner);
    void onSave({
      id: obligation?.id ?? `manual:obligation-${Date.now()}`,
      name: name.trim(), owner: person?.name || owner, ownerKey: owner, source: "manual", debtMinor,
      currency: obligation?.currency || data.availableMoney.currency,
      minimumPaymentMinor: minimumMinor, dueDate: dueDate || null, availableCreditMinor: null,
      recurrence, accountKey: accountKey || null, note: note.trim() || null,
    });
  };
  return <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="product-dialog" onSubmit={submit}>
      <header><div><h2>{obligation ? "Настроить обязательство" : "Новое обязательство"}</h2><p>Долг можно вести отдельно от банковского счёта.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть"><X size={18} /></button></header>
      <label><span>Название</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, аренда или рассрочка" autoFocus /></label>
      <div className="form-split"><label><span>За кем</span><select value={owner} onChange={(event) => setOwner(event.target.value)}>{data.people.map((person) => <option value={person.key} key={person.key}>{person.name}</option>)}</select></label><label><span>Текущий долг, ₽</span><input inputMode="decimal" value={debt} onChange={(event) => setDebt(event.target.value)} /></label></div>
      <div className="form-split"><label><span>Платёж, ₽</span><input inputMode="decimal" value={minimum} onChange={(event) => setMinimum(event.target.value)} placeholder="Необязательно" /></label><label><span>Дата платежа</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>
      <div className="form-split"><label><span>Повтор</span><select value={recurrence} onChange={(event) => setRecurrence(event.target.value as "once" | "monthly")}><option value="monthly">Каждый месяц</option><option value="once">Один раз</option></select></label><label><span>Связанный счёт</span><select value={accountKey} onChange={(event) => setAccountKey(event.target.value)}><option value="">Не выбран</option>{data.accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label></div>
      <label><span>Комментарий</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Необязательно" /></label>
      <footer>{onDelete ? <button className="danger-button" type="button" onClick={() => void onDelete()} disabled={saving}><Trash2 size={16} />Удалить</button> : <span />}<button className="primary-button" type="submit" disabled={saving}>{saving ? "Сохраняю" : "Сохранить"}</button></footer>
    </form>
  </div>;
}
