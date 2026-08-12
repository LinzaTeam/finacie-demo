import { Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardSource } from "../api/dashboard";
import { formatMoney } from "../lib/format";
import type { DashboardData } from "../types";

export type ParsedOperation = {
  title: string;
  detail: string;
  amountMinor: number;
  kind: "income" | "expense";
  accountId?: string;
  subjectKey?: string;
};

export function parseOperation(
  value: string,
  accounts: DashboardData["accounts"],
): ParsedOperation | null {
  const amountMatch = value.match(/(\d[\d\s]*(?:[.,]\d{1,2})?)/);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const normalized = value.toLocaleLowerCase("ru-RU");
  const kind = /(доход|зарплат|приход|получил|поступил)/.test(normalized) ? "income" : "expense";
  const account = accounts.find((item) => {
    const accountName = item.name.toLocaleLowerCase("ru-RU");
    const tokens = accountName.split(/[\s()]+/).filter((token) => token.length > 3);
    return tokens.some((token) => normalized.includes(token));
  });
  const rawTitle = value.slice(0, amountMatch.index).trim();
  const title = rawTitle || (kind === "income" ? "Доход" : "Расход");
  const detail = account
    ? `${kind === "income" ? "Зачисление" : "Оплата"}, ${account.name}`
    : kind === "income" ? "Новое поступление" : "Новый расход";

  return {
    title,
    detail,
    amountMinor: Math.round(amount * 100),
    kind,
    accountId: account?.id,
  };
}

type QuickAddSheetProps = {
  open: boolean;
  source: DashboardSource;
  accounts: DashboardData["accounts"];
  currency: string;
  canWrite: boolean;
  actorName: string;
  actorKey: string;
  people: DashboardData["people"];
  onClose: () => void;
  onAdd: (operation: ParsedOperation) => void | Promise<void>;
};

export function QuickAddSheet({
  open,
  source,
  accounts,
  currency,
  canWrite,
  actorName,
  actorKey,
  people,
  onClose,
  onAdd,
}: QuickAddSheetProps) {
  const [value, setValue] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [subjectKey, setSubjectKey] = useState(actorKey);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const parsed = useMemo(() => parseOperation(value, accounts), [accounts, value]);

  useEffect(() => {
    if (!open) return;
    setSubjectKey(actorKey);
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ) ?? [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
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

  const submit = async () => {
    if (!parsed || !canWrite || submitState === "saving") return;
    setSubmitState("saving");
    try {
      await onAdd({ ...parsed, subjectKey });
      setValue("");
      setSubmitState("idle");
      onClose();
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
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                void submit();
              }
            }}
            placeholder="Например: Кофе 420 с Т-Банк"
          />
        </label>

        <div className="quick-examples" aria-label="Примеры">
          {["Продукты 2340 с Т-Банк", "Доход 35000 на Альфа", "Метро 67"].map((example) => (
            <button type="button" onClick={() => setValue(example)} key={example}>{example}</button>
          ))}
        </div>

        <fieldset className="subject-picker">
          <legend>Операция за</legend>
          <div className="segmented-control">
            {people.map((person) => (
              <button
                className={subjectKey === person.key ? "segment-active" : ""}
                type="button"
                aria-pressed={subjectKey === person.key}
                onClick={() => setSubjectKey(person.key)}
                key={person.key}
              >
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
          {parsed ? (
            <dl>
              <div><dt>Сумма</dt><dd>{formatMoney(parsed.amountMinor, currency)}</dd></div>
              <div><dt>Тип</dt><dd>{parsed.kind === "income" ? "Доход" : "Расход"}</dd></div>
              <div><dt>Название</dt><dd>{parsed.title}</dd></div>
              <div><dt>Детали</dt><dd>{parsed.detail}</dd></div>
              <div><dt>За кого</dt><dd>{people.find((person) => person.key === subjectKey)?.name || actorName}</dd></div>
            </dl>
          ) : (
            <p>Укажите название и сумму. Счёт можно добавить в той же строке.</p>
          )}
        </div>

        {source === "demo" ? (
          <p className="demo-write-note">Операция добавится только в текущий демо-сеанс.</p>
        ) : canWrite ? (
          <p className="demo-write-note">Автор записи: {actorName}. Операция сохранится в журнале после подтверждения.</p>
        ) : (
          <p className="demo-write-note">Для записи откройте приложение из подтверждённого Telegram-профиля.</p>
        )}

        {submitState === "error" ? (
          <p className="sheet-error" role="alert">Не удалось сохранить операцию. Проверьте соединение и повторите.</p>
        ) : null}

        <button className="primary-button sheet-submit" type="button" disabled={!parsed || !canWrite || submitState === "saving"} onClick={() => void submit()}>
          <Check size={18} strokeWidth={2} aria-hidden="true" />
          {submitState === "saving" ? "Сохраняю" : "Готово"}
        </button>
      </section>
    </div>
  );
}
