import { Check, History, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardSource } from "../api/dashboard";
import { previewTransaction, type OperationPreview, type TransactionCommand } from "../api/transactions";
import { formatMoney } from "../lib/format";
import { parseOperation, type ParsedOperation } from "../lib/operationRecognition";
import type { DashboardData } from "../types";

export { parseOperation } from "../lib/operationRecognition";
export type { ParsedOperation } from "../lib/operationRecognition";

function kindGroup(kind: TransactionCommand["kind"]): ParsedOperation["kind"] {
  if (kind === "income") return "income";
  if (kind === "card_payment") return "expense";
  return "transfer";
}

function fromRemotePreview(
  preview: OperationPreview,
  accounts: DashboardData["accounts"],
): ParsedOperation {
  const accountId = preview.kind === "income" ? preview.account_to : preview.account_from;
  const account = accounts.find((item) => item.id === accountId);
  return {
    title: preview.title,
    detail: account
      ? `${preview.kind === "income" ? "Зачисление" : "Списание"}, ${account.name}`
      : "Проверьте счёт и контрагента",
    amountMinor: preview.amount_cents,
    kind: kindGroup(preview.kind),
    transactionKind: preview.kind,
    accountFromId: preview.account_from || undefined,
    accountToId: preview.account_to || undefined,
    categoryKey: preview.category || undefined,
    sourceKey: preview.source || undefined,
    counterpartyKey: preview.counterparty_key || undefined,
    counterpartyName: preview.counterparty || undefined,
    counterpartyType: preview.counterparty_type,
    learnedFromHistory: preview.learned_from_history,
    confidence: preview.confidence,
    reasons: preview.reasons,
  };
}

type EditableOperation = Pick<
  ParsedOperation,
  "transactionKind" | "accountFromId" | "accountToId" | "categoryKey" | "sourceKey"
  | "counterpartyKey" | "counterpartyName" | "learnedFromHistory"
>;

type QuickAddSheetProps = {
  open: boolean;
  source: DashboardSource;
  accounts: DashboardData["accounts"];
  categories: DashboardData["categories"];
  currency: string;
  canWrite: boolean;
  actorName: string;
  actorKey: string;
  people: DashboardData["people"];
  onClose: () => void;
  onAdd: (operation: ParsedOperation) => void | Promise<void>;
};

export function QuickAddSheet({
  open, source, accounts, categories, currency, canWrite, actorName, actorKey, people, onClose, onAdd,
}: QuickAddSheetProps) {
  const [value, setValue] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [subjectKey, setSubjectKey] = useState(actorKey);
  const [remoteParsed, setRemoteParsed] = useState<ParsedOperation | null>(null);
  const [overrides, setOverrides] = useState<Partial<EditableOperation>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const localParsed = useMemo(() => parseOperation(value, accounts), [accounts, value]);
  const parsed = remoteParsed ?? localParsed;
  const reviewed = useMemo(() => {
    if (!parsed) return null;
    const operation = { ...parsed, ...overrides };
    operation.kind = kindGroup(operation.transactionKind);
    operation.title = operation.counterpartyName || parsed.title;
    return operation;
  }, [overrides, parsed]);

  useEffect(() => {
    if (!open || source !== "api" || !localParsed) {
      setRemoteParsed(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      previewTransaction(value, subjectKey, controller.signal)
        .then((result) => setRemoteParsed(fromRemotePreview(result, accounts)))
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) setRemoteParsed(null);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [accounts, localParsed, open, source, subjectKey, value]);

  useEffect(() => {
    if (!open) return;
    setSubjectKey(actorKey);
    setOverrides({});
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ) ?? [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [actorKey, onClose, open]);

  if (!open) return null;

  const updateValue = (nextValue: string) => {
    setValue(nextValue);
    setRemoteParsed(null);
    setOverrides({});
  };
  const operationAccount = reviewed?.transactionKind === "income"
    ? reviewed.accountToId : reviewed?.accountFromId;
  const hasRequiredAccounts = Boolean(reviewed && operationAccount && (
    reviewed.transactionKind !== "own_transfer"
    || (reviewed.accountToId && reviewed.accountToId !== reviewed.accountFromId)
  ));
  const submit = async () => {
    if (!reviewed || !hasRequiredAccounts || !canWrite || submitState === "saving") return;
    setSubmitState("saving");
    try {
      await onAdd({ ...reviewed, subjectKey });
      setValue(""); setOverrides({}); setSubmitState("idle"); onClose();
    } catch {
      setSubmitState("error");
    }
  };

  return (
    <div className="sheet-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialogRef} className="quick-add-sheet" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
        <header>
          <h2 id="quick-add-title">Новая операция</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть">
            <X size={19} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </header>

        <label className="natural-input">
          <span>Напишите как есть</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => updateValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); void submit(); }
            }}
            placeholder="Например: поступление компании TAPE 140000"
          />
        </label>

        <div className="quick-examples" aria-label="Примеры">
          {["Продукты 2340 с Т-Банк", "Поступление компании TAPE 140000 на Альфа", "Перевод Ивану 5000 с Т-Банк"].map((example) => (
            <button type="button" onClick={() => updateValue(example)} key={example}>{example}</button>
          ))}
        </div>

        <fieldset className="subject-picker">
          <legend>Операция за</legend>
          <div className="segmented-control">
            {people.map((person) => (
              <button className={subjectKey === person.key ? "segment-active" : ""} type="button"
                aria-pressed={subjectKey === person.key} onClick={() => setSubjectKey(person.key)} key={person.key}>
                <span className="mini-avatar" style={{ background: person.accentColor }} aria-hidden="true">
                  {person.avatarDataUrl ? <img src={person.avatarDataUrl} alt="" /> : person.name.slice(0, 1)}
                </span>
                {person.name}
              </button>
            ))}
          </div>
          <small>{actorName} останется автором записи в журнале.</small>
        </fieldset>

        <div className="operation-preview">
          <span>Проверьте</span>
          {reviewed ? (
            <div className="operation-review-grid">
              {reviewed.learnedFromHistory ? (
                <p className="history-match"><History size={15} aria-hidden="true" /> Узнано по подтверждённой истории</p>
              ) : null}
              <div className="operation-review-row review-static"><span>Сумма</span><strong>{formatMoney(reviewed.amountMinor, currency)}</strong></div>
              <label className="operation-review-row"><span>Тип</span><select aria-label="Тип операции" value={reviewed.transactionKind}
                onChange={(event) => setOverrides((current) => ({ ...current, transactionKind: event.target.value as TransactionCommand["kind"] }))}>
                <option value="card_payment">Расход</option><option value="income">Доход</option>
                <option value="transfer_to_person">Перевод человеку</option><option value="own_transfer">Между счетами</option>
              </select></label>
              <label className="operation-review-row"><span>Контрагент или человек</span><input aria-label="Контрагент или человек"
                value={reviewed.counterpartyName || ""}
                onChange={(event) => setOverrides((current) => ({
                  ...current,
                  counterpartyKey: undefined,
                  counterpartyName: event.target.value,
                  learnedFromHistory: false,
                }))} /></label>
              <label className="operation-review-row"><span>{reviewed.transactionKind === "income" ? "Счёт зачисления" : "Счёт списания"}</span>
                <select aria-label="Основной счёт" value={operationAccount || ""} onChange={(event) => setOverrides((current) => ({
                  ...current,
                  ...(reviewed.transactionKind === "income" ? { accountToId: event.target.value } : { accountFromId: event.target.value }),
                }))}><option value="">Выберите счёт</option>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select>
              </label>
              {reviewed.transactionKind === "own_transfer" ? <label className="operation-review-row"><span>Счёт зачисления</span><select aria-label="Счёт зачисления"
                value={reviewed.accountToId || ""} onChange={(event) => setOverrides((current) => ({ ...current, accountToId: event.target.value }))}>
                <option value="">Выберите счёт</option>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label> : null}
              {reviewed.transactionKind === "card_payment" ? <label className="operation-review-row"><span>Категория</span><select aria-label="Категория"
                value={reviewed.categoryKey || "other"} onChange={(event) => setOverrides((current) => ({ ...current, categoryKey: event.target.value }))}>
                {categories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label> : null}
              {reviewed.transactionKind === "income" ? <label className="operation-review-row"><span>Источник дохода</span><select aria-label="Источник дохода"
                value={reviewed.sourceKey || "other"} onChange={(event) => setOverrides((current) => ({ ...current, sourceKey: event.target.value }))}>
                <option value="tape">TAPE</option><option value="aa">AA</option><option value="client">Клиент</option><option value="other">Другое</option>
              </select></label> : null}
              <div className="operation-review-row recognition-reason"><span>Почему так</span><p>{reviewed.reasons?.join(". ")}</p></div>
              {!hasRequiredAccounts ? <p className="operation-validation">Выберите счёт перед сохранением.</p> : null}
            </div>
          ) : <p>Укажите название и сумму. Можно добавить контрагента и счёт в той же строке.</p>}
        </div>

        {source === "demo" ? <p className="demo-write-note">Операция добавится только в текущий демо-сеанс.</p>
          : canWrite ? <p className="demo-write-note">Автор записи: {actorName}. Подтверждение улучшит распознавание следующих операций.</p>
            : <p className="demo-write-note">Для записи откройте приложение из подтверждённого Telegram-профиля.</p>}
        {submitState === "error" ? <p className="sheet-error" role="alert">Не удалось сохранить операцию. Проверьте соединение и повторите.</p> : null}
        <button className="primary-button sheet-submit" type="button" disabled={!reviewed || !hasRequiredAccounts || !canWrite || submitState === "saving"} onClick={() => void submit()}>
          <Check size={18} strokeWidth={2} aria-hidden="true" />{submitState === "saving" ? "Сохраняю" : "Готово"}
        </button>
      </section>
    </div>
  );
}
