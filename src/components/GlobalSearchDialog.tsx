import { ArrowRight, ReceiptText, Search, WalletCards, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "../lib/format";
import { routeHref } from "../routes";
import type { DashboardData } from "../types";

type GlobalSearchDialogProps = {
  open: boolean;
  data: DashboardData;
  onClose: () => void;
};

export function GlobalSearchDialog({ open, data, onClose }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const normalized = query.trim().toLocaleLowerCase("ru-RU");
  const results = useMemo(() => ({
    transactions: normalized
      ? data.transactions.filter((item) => `${item.title} ${item.detail}`.toLocaleLowerCase("ru-RU").includes(normalized)).slice(0, 5)
      : [],
    accounts: normalized
      ? data.accounts.filter((item) => item.name.toLocaleLowerCase("ru-RU").includes(normalized)).slice(0, 4)
      : [],
    obligations: normalized
      ? data.obligations.filter((item) => `${item.name} ${item.owner}`.toLocaleLowerCase("ru-RU").includes(normalized)).slice(0, 3)
      : [],
  }), [data.accounts, data.obligations, data.transactions, normalized]);
  const resultCount = results.transactions.length + results.accounts.length + results.obligations.length;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
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

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="search-dialog-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialogRef} className="search-dialog" role="dialog" aria-modal="true" aria-labelledby="global-search-title">
        <header>
          <div>
            <span>Быстрый поиск</span>
            <h2 id="global-search-title">Найдите что угодно</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть поиск">
            <X size={19} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </header>

        <label className="spotlight-input">
          <Search size={21} strokeWidth={1.8} aria-hidden="true" />
          <span className="sr-only">Поиск по операциям, счетам и обязательствам</span>
          <input
            ref={inputRef}
            type="search"
            aria-label="Поиск по операциям, счетам и обязательствам"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Кофе, продукты, счёт или обязательство"
          />
          <kbd>ESC</kbd>
        </label>

        <div className="spotlight-results" aria-live="polite">
          {!normalized ? (
            <div className="spotlight-empty">
              <Search size={24} strokeWidth={1.7} aria-hidden="true" />
              <strong>Введите несколько букв</strong>
              <span>Проверим операции, счета и обязательства.</span>
            </div>
          ) : resultCount === 0 ? (
            <div className="spotlight-empty">
              <strong>Ничего не найдено</strong>
              <span>Попробуйте другое слово или откройте полный поиск.</span>
            </div>
          ) : (
            <>
              {results.transactions.map((item) => (
                <a className="spotlight-result" href={routeHref("operations")} onClick={onClose} key={`transaction-${item.id}`}>
                  <span className="spotlight-result-icon"><ReceiptText size={17} aria-hidden="true" /></span>
                  <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                  <b className={item.kind === "income" ? "positive" : ""}>{item.kind === "income" ? "+" : item.kind === "expense" ? "−" : ""}{formatMoney(item.amountMinor, item.currency)}</b>
                </a>
              ))}
              {results.accounts.map((item) => (
                <a className="spotlight-result" href={routeHref("accounts")} onClick={onClose} key={`account-${item.id}`}>
                  <span className="spotlight-result-icon"><WalletCards size={17} aria-hidden="true" /></span>
                  <span><strong>{item.name}</strong><small>Счёт</small></span>
                  <b>{formatMoney(item.balanceMinor, item.currency)}</b>
                </a>
              ))}
              {results.obligations.map((item) => (
                <a className="spotlight-result" href={routeHref("obligations")} onClick={onClose} key={`obligation-${item.id}`}>
                  <span className="spotlight-result-icon"><ReceiptText size={17} aria-hidden="true" /></span>
                  <span><strong>{item.name}</strong><small>{item.owner}</small></span>
                  <b>{formatMoney(item.debtMinor, item.currency)}</b>
                </a>
              ))}
            </>
          )}
        </div>

        <footer>
          <a href={routeHref("search")} onClick={onClose}>
            Открыть полный поиск <ArrowRight size={15} aria-hidden="true" />
          </a>
          <span>⌘K / Ctrl+K</span>
        </footer>
      </section>
    </div>
  );
}
