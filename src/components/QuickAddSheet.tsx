import { Check, History, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardSource } from "../api/dashboard";
import { previewTransaction, type OperationPreview, type TransactionCommand } from "../api/transactions";
import { formatMoney } from "../lib/format";
import type { DashboardData } from "../types";

export type ParsedOperation = {
  title: string;
  detail: string;
  amountMinor: number;
  kind: "income" | "expense" | "transfer";
  transactionKind: TransactionCommand["kind"];
  accountFromId?: string;
  accountToId?: string;
  categoryKey?: string;
  sourceKey?: string;
  counterpartyKey?: string;
  counterpartyName?: string;
  counterpartyType?: "company" | "person" | "merchant" | "platform" | "other";
  learnedFromHistory?: boolean;
  confidence?: number;
  reasons?: string[];
  subjectKey?: string;
};

const INCOME_WORDS = /(доход[а-яa-z]*|приход[а-яa-z]*|поступлен[а-яa-z]*|зачислен[а-яa-z]*|получил[а-яa-z]*|зарплат[а-яa-z]*|аванс[а-яa-z]*|выручк[а-яa-z]*|дивиденд[а-яa-z]*|возврат[а-яa-z]*)/iu;
const EXPENSE_WORDS = /(расход[а-яa-z]*|оплат[а-яa-z]*|покупк[а-яa-z]*|купил[а-яa-z]*|потратил[а-яa-z]*|списан[а-яa-z]*)/iu;
const TRANSFER_WORDS = /(перевод[а-яa-z]*|перев[её]л[а-яa-z]*)/iu;
const COMPANY_WORDS = /(компани[а-яa-z]*|ооо|ип|ао|пао)/iu;
const AMOUNT_PATTERN = /(\d{1,3}(?:[\s\u00a0]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(к|k|тыс(?:яч[аи]?)?)?/gi;

function kindGroup(kind: TransactionCommand["kind"]): ParsedOperation["kind"] {
  if (kind === "income") return "income";
  if (kind === "card_payment") return "expense";
  return "transfer";
}

function findAccounts(value: string, accounts: DashboardData["accounts"]) {
  const normalized = value.toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
  return accounts
    .map((account) => {
      const name = account.name.toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
      const tokens = name.split(/[\s()_-]+/).filter((token) => token.length > 2 && token !== "банк");
      const score = normalized.includes(name) ? 100 : tokens.reduce(
        (total, token) => total + (normalized.includes(token) ? token.length : 0),
        0,
      );
      return { account, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.account);
}

function cleanCounterparty(
  value: string,
  amountStart: number,
  amountEnd: number,
  accounts: DashboardData["accounts"],
): string | undefined {
  let cleaned = `${value.slice(0, amountStart)} ${value.slice(amountEnd)}`;
  accounts.forEach((account) => {
    cleaned = cleaned.replace(new RegExp(account.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
    account.name.split(/[\s()_-]+/).filter(
      (token) => token.length >= 3 && !["банк", "счет", "счёт", "основной"].includes(token.toLocaleLowerCase("ru-RU")),
    ).forEach((token) => {
      cleaned = cleaned.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
    });
  });
  cleaned = cleaned
    .replace(INCOME_WORDS, " ")
    .replace(EXPENSE_WORDS, " ")
    .replace(TRANSFER_WORDS, " ")
    .replace(/(компани[а-яa-z]*|контрагент[а-яa-z]*|клиент[а-яa-z]*|(?:^|\s)(?:от|для|за|через|из|со|с|на|в|по|руб[а-яa-z]*|р)(?=\s|$))/giu, " ")
    .replace(/[₽,;:()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || undefined;
}

function categoryFromText(value: string): string {
  const normalized = value.toLocaleLowerCase("ru-RU");
  if (/(кофе|кофейн|дринкит)/.test(normalized)) return "coffee";
  if (/(продукт|магазин|азбук|перекр[её]ст)/.test(normalized)) return "groceries";
  if (/(кафе|ресторан|доставк)/.test(normalized)) return "cafe_delivery";
  if (/(метро|такси|транспорт|бензин)/.test(normalized)) return "transport";
  if (/(дом|мебел|ремонт|быт)/.test(normalized)) return "home";
  if (/(аптек|врач|здоров|лекар)/.test(normalized)) return "health";
  if (/(салон|маник|педик|косметик|бров|ресниц)/.test(normalized)) return "beauty_care";
  if (/(одежд|обув|кроссов)/.test(normalized)) return "clothes";
  if (/(кино|театр|развлеч|концерт)/.test(normalized)) return "entertainment";
  if (/(подар)/.test(normalized)) return "gifts";
  if (/(бизнес|реклам|подряд)/.test(normalized)) return "business";
  if (/(подписк)/.test(normalized)) return "subscriptions";
  if (/(сервис|сервер|хостинг|tilda|timeweb)/.test(normalized)) return "services";
  if (/(табак|сигарет|вейп)/.test(normalized)) return "tobacco";
  return "other";
}

export function parseOperation(
  value: string,
  accounts: DashboardData["accounts"],
): ParsedOperation | null {
  const matches = [...value.matchAll(AMOUNT_PATTERN)];
  const amountMatch = matches.at(-1);
  if (!amountMatch || amountMatch.index == null) return null;
  const amount = Number(amountMatch[1].replace(/[\s\u00a0]/g, "").replace(",", "."));
  const scaledAmount = amountMatch[2] ? amount * 1000 : amount;
  if (!Number.isFinite(scaledAmount) || scaledAmount <= 0) return null;

  const matchedAccounts = findAccounts(value, accounts);
  const hasTransfer = TRANSFER_WORDS.test(value);
  let transactionKind: TransactionCommand["kind"] = "card_payment";
  if (hasTransfer && (matchedAccounts.length >= 2 || /между\s+(?:своими\s+)?счетами/i.test(value))) {
    transactionKind = "own_transfer";
  } else if (hasTransfer) {
    transactionKind = "transfer_to_person";
  } else if (INCOME_WORDS.test(value)) {
    transactionKind = "income";
  } else if (EXPENSE_WORDS.test(value)) {
    transactionKind = "card_payment";
  }
  const extractedCounterparty = cleanCounterparty(
    value,
    amountMatch.index,
    amountMatch.index + amountMatch[0].length,
    matchedAccounts,
  );
  const accountFromId = transactionKind === "income" ? undefined : matchedAccounts[0]?.id;
  const accountToId = transactionKind === "income"
    ? matchedAccounts[0]?.id
    : transactionKind === "own_transfer" ? matchedAccounts[1]?.id : undefined;
  const sourceKey = transactionKind === "income"
    ? (/\btape\b/i.test(value) ? "tape" : /\baa\b/i.test(value) ? "aa" : "other")
    : undefined;
  const categoryKey = transactionKind === "card_payment" ? categoryFromText(value) : undefined;
  const counterpartyName = transactionKind === "own_transfer" || (
    transactionKind === "card_payment"
    && extractedCounterparty?.split(/\s+/).length === 1
    && categoryFromText(extractedCounterparty) === categoryKey
  ) ? undefined : extractedCounterparty;
  const title = (transactionKind === "own_transfer" ? undefined : extractedCounterparty) || (
    transactionKind === "income" ? "Поступление"
      : transactionKind === "own_transfer" ? "Перевод между счетами"
        : transactionKind === "transfer_to_person" ? "Перевод человеку" : "Расход"
  );
  const account = transactionKind === "income" ? matchedAccounts[0] : matchedAccounts[0];
  return {
    title,
    detail: account
      ? `${transactionKind === "income" ? "Зачисление" : "Списание"}, ${account.name}`
      : "Проверьте счёт и контрагента",
    amountMinor: Math.round(scaledAmount * 100),
    kind: kindGroup(transactionKind),
    transactionKind,
    accountFromId,
    accountToId,
    categoryKey,
    sourceKey,
    counterpartyName,
    counterpartyType: COMPANY_WORDS.test(value)
      ? "company" : transactionKind === "card_payment" ? "merchant"
        : transactionKind === "transfer_to_person" ? "person" : "other",
    confidence: INCOME_WORDS.test(value) || EXPENSE_WORDS.test(value) || hasTransfer ? 0.9 : 0.72,
    reasons: [INCOME_WORDS.test(value)
      ? "Ключевое слово указывает на поступление"
      : hasTransfer ? "Распознан сценарий перевода"
        : EXPENSE_WORDS.test(value) ? "Ключевое слово указывает на расход"
          : "Тип предложен по наиболее частому сценарию"],
  };
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
              <div className="review-static"><span>Сумма</span><strong>{formatMoney(reviewed.amountMinor, currency)}</strong></div>
              <label><span>Тип</span><select aria-label="Тип операции" value={reviewed.transactionKind}
                onChange={(event) => setOverrides((current) => ({ ...current, transactionKind: event.target.value as TransactionCommand["kind"] }))}>
                <option value="card_payment">Расход</option><option value="income">Доход</option>
                <option value="transfer_to_person">Перевод человеку</option><option value="own_transfer">Между счетами</option>
              </select></label>
              <label><span>Контрагент или человек</span><input aria-label="Контрагент или человек"
                value={reviewed.counterpartyName || ""}
                onChange={(event) => setOverrides((current) => ({
                  ...current,
                  counterpartyKey: undefined,
                  counterpartyName: event.target.value,
                  learnedFromHistory: false,
                }))} /></label>
              <label><span>{reviewed.transactionKind === "income" ? "Счёт зачисления" : "Счёт списания"}</span>
                <select aria-label="Основной счёт" value={operationAccount || ""} onChange={(event) => setOverrides((current) => ({
                  ...current,
                  ...(reviewed.transactionKind === "income" ? { accountToId: event.target.value } : { accountFromId: event.target.value }),
                }))}><option value="">Выберите счёт</option>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select>
              </label>
              {reviewed.transactionKind === "own_transfer" ? <label><span>Счёт зачисления</span><select aria-label="Счёт зачисления"
                value={reviewed.accountToId || ""} onChange={(event) => setOverrides((current) => ({ ...current, accountToId: event.target.value }))}>
                <option value="">Выберите счёт</option>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label> : null}
              {reviewed.transactionKind === "card_payment" ? <label><span>Категория</span><select aria-label="Категория"
                value={reviewed.categoryKey || "other"} onChange={(event) => setOverrides((current) => ({ ...current, categoryKey: event.target.value }))}>
                {categories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label> : null}
              {reviewed.transactionKind === "income" ? <label><span>Источник дохода</span><select aria-label="Источник дохода"
                value={reviewed.sourceKey || "other"} onChange={(event) => setOverrides((current) => ({ ...current, sourceKey: event.target.value }))}>
                <option value="tape">TAPE</option><option value="aa">AA</option><option value="client">Клиент</option><option value="other">Другое</option>
              </select></label> : null}
              <div className="recognition-reason"><span>Почему так</span><p>{reviewed.reasons?.join(". ")}</p></div>
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
