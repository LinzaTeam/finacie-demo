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
  };
}

type QuickAddSheetProps = {
  open: boolean;
  source: DashboardSource;
  accounts: DashboardData["accounts"];
  currency: string;
  onClose: () => void;
  onAdd: (operation: ParsedOperation) => void;
};

export function QuickAddSheet({
  open,
  source,
  accounts,
  currency,
  onClose,
  onAdd,
}: QuickAddSheetProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const parsed = useMemo(() => parseOperation(value, accounts), [accounts, value]);

  useEffect(() => {
    if (!open) return;
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
  }, [onClose, open]);

  if (!open) return null;

  const submit = () => {
    if (!parsed || source !== "demo") return;
    onAdd(parsed);
    setValue("");
    onClose();
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
                submit();
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

        <div className="operation-preview">
          <span>Проверьте</span>
          {parsed ? (
            <dl>
              <div><dt>Сумма</dt><dd>{formatMoney(parsed.amountMinor, currency)}</dd></div>
              <div><dt>Тип</dt><dd>{parsed.kind === "income" ? "Доход" : "Расход"}</dd></div>
              <div><dt>Название</dt><dd>{parsed.title}</dd></div>
              <div><dt>Детали</dt><dd>{parsed.detail}</dd></div>
            </dl>
          ) : (
            <p>Укажите название и сумму. Счёт можно добавить в той же строке.</p>
          )}
        </div>

        {source === "demo" ? (
          <p className="demo-write-note">Операция добавится только в текущий демо-сеанс.</p>
        ) : (
          <p className="demo-write-note">Запись в подключённую базу пока закрыта до завершения ledger-миграции.</p>
        )}

        <button className="primary-button sheet-submit" type="button" disabled={!parsed || source !== "demo"} onClick={submit}>
          <Check size={18} strokeWidth={2} aria-hidden="true" />
          Готово
        </button>
      </section>
    </div>
  );
}
