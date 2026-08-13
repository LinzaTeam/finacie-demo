import type { TransactionCommand } from "../api/transactions";
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

const AMOUNT_PATTERN = /(\d{1,3}(?:[\s\u00a0]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(к|k|тыс(?:яч[аи]?)?)?/gi;
const WORD_PATTERN = /[a-zа-я0-9_]+/giu;
const KIND_ALIASES = {
  income: [
    "income", "доход", "приход", "поступление", "зачисление", "пополнение", "получил", "получение",
    "выплата", "заработок", "гонорар", "зарплата", "аванс", "выручка", "дивиденды", "кешбэк", "кешбек", "возврат",
  ],
  expense: [
    "expense", "расход", "списание", "покупка", "оплата", "потратил", "заплатил", "купил", "заказ", "ушло",
  ],
  transfer: [
    "transfer", "перевод", "перевел", "перевела", "отправил", "отправила", "перекинул", "перекинула",
  ],
  ownTransfer: ["own_transfer", "между счетами", "между своими счетами", "свой счет", "своя копилка"],
} as const;
const COMPANY_ALIASES = ["company", "компания", "компании", "компанию", "фирма", "организация", "ооо", "ип", "оао", "ао", "пао"];
const FIELD_ALIASES = {
  kind: ["kind", "type", "тип", "вид"],
  account: ["account", "acct", "счет", "счет"],
  from: ["from", "из", "со", "с"],
  to: ["to", "на", "в"],
  source: ["source", "источник", "откуда"],
  category: ["category", "cat", "категория", "кат"],
  counterparty: ["counterparty", "party", "merchant", "контрагент", "плательщик", "получатель"],
} as const;
type FieldKey = keyof typeof FIELD_ALIASES;
const FIELD_LOOKUP = new Map<string, FieldKey>(
  Object.entries(FIELD_ALIASES).flatMap(([field, aliases]) => aliases.map((alias) => [alias, field as FieldKey])),
);
const FIELD_PATTERN = new RegExp(
  `(?<![\\w])(${[...FIELD_LOOKUP.keys()].sort((left, right) => right.length - left.length).join("|")})\\s*[:=]\\s*#?([a-zа-я0-9_-]+)`,
  "giu",
);
const FILLER = new Set([
  "контрагент", "клиент", "от", "для", "за", "через", "из", "со", "с", "на", "в", "по", "руб", "рубль", "рублей", "р", "bank", "банк", "account", "счет",
]);
const GENERIC_ACCOUNT_WORDS = new Set(["bank", "банк", "account", "счет", "основной"]);
const CATEGORY_ALIASES: Record<string, string[]> = {
  groceries: ["groceries", "продукты", "продукт", "магазин", "супермаркет", "азбука", "перекресток", "лента", "магнит", "пятерочка", "красное белое", "spar", "самокат", "авокадо"],
  coffee: ["coffee", "кофе", "кофейня", "дринкит", "ddrinkit"],
  cafe_delivery: ["cafe_delivery", "кафе", "ресторан", "доставка", "фастфуд", "еда", "бургер", "subway", "cofix"],
  transport: ["transport", "транспорт", "метро", "такси", "бензин", "парковка", "автобус", "каршеринг", "делимобиль"],
  transfers: ["transfers", "перевод", "переводы"],
  cats: ["cats", "коты", "кот", "кошка", "кошки", "корм", "ветеринар", "ветклиника", "зоомагазин", "petshop"],
  home: ["home", "дом", "мебель", "ремонт", "быт", "жкх"],
  health: ["health", "здоровье", "аптека", "врач", "лекарства", "медицина", "стоматолог"],
  beauty_care: ["beauty_care", "красота", "уход", "салон", "маникюр", "педикюр", "косметика", "брови", "ресницы"],
  clothes: ["clothes", "одежда", "обувь", "кроссовки", "lamoda"],
  entertainment: ["entertainment", "развлечения", "кино", "театр", "концерт", "игры"],
  gifts: ["gifts", "подарок", "подарки", "цветы"],
  business: ["business", "бизнес", "реклама", "подрядчик", "налоги"],
  subscriptions: ["subscriptions", "подписка", "подписки", "подписки ai", "ivi", "кинопоиск", "яндекс плюс", "telegram"],
  services: ["services", "сервис", "сервер", "хостинг", "tilda", "timeweb", "zapmail", "coldyai"],
  tobacco: ["tobacco", "табак", "сигарета", "сигареты", "сиги", "никотин", "вейп", "одноразка"],
  other: ["other", "другое", "прочее"],
};

function normalize(value: string): string {
  return (value.toLocaleLowerCase("ru-RU").replaceAll("ё", "е").match(WORD_PATTERN) ?? []).join(" ");
}

function tokens(value: string): string[] {
  const base = normalize(value).split(" ").filter(Boolean);
  const compounds = base.slice(0, -1).flatMap((token, index) => (
    token.length <= 2 && ["bank", "банк", "account", "счет"].includes(base[index + 1])
      ? [`${token}${base[index + 1]}`] : []
  ));
  return [...base, ...compounds];
}

function editDistance(left: string, right: string): number {
  const rows = Array.from({ length: left.length + 1 }, (_, row) => (
    Array.from({ length: right.length + 1 }, (_, column) => row === 0 ? column : column === 0 ? row : 0)
  ));
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + cost,
      );
      if (row > 1 && column > 1 && left[row - 1] === right[column - 2] && left[row - 2] === right[column - 1]) {
        rows[row][column] = Math.min(rows[row][column], rows[row - 2][column - 2] + 1);
      }
    }
  }
  return rows[left.length][right.length];
}

function tokenScore(token: string, alias: string): number {
  if (token === alias) return 1;
  const longest = Math.max(token.length, alias.length);
  if (longest <= 3) return 0;
  const distance = editDistance(token, alias);
  const limit = longest <= 7 ? 1 : 2;
  return distance <= limit ? 1 - distance / longest : 0;
}

function conceptScore(searchTokens: string[], alias: string): { score: number; fuzzy: boolean } {
  const aliasTokens = tokens(alias);
  if (!aliasTokens.length) return { score: 0, fuzzy: false };
  const available = [...searchTokens];
  const scores: number[] = [];
  for (const aliasToken of aliasTokens) {
    const matches = available.map((token, index) => ({ score: tokenScore(token, aliasToken), index }));
    const best = matches.sort((left, right) => right.score - left.score)[0];
    if (!best?.score) return { score: 0, fuzzy: false };
    scores.push(best.score);
    available.splice(best.index, 1);
  }
  return { score: scores.reduce((sum, score) => sum + score, 0) / scores.length, fuzzy: scores.some((score) => score < 1) };
}

function bestConcept(searchTokens: string[], aliases: readonly string[]) {
  return aliases.reduce((best, alias) => {
    const match = conceptScore(searchTokens, alias);
    return match.score > best.score ? { ...match, alias } : best;
  }, { score: 0, fuzzy: false, alias: undefined as string | undefined });
}

function readFields(value: string): { fields: Partial<Record<FieldKey, string>>; hashtags: string[] } {
  const fields: Partial<Record<FieldKey, string>> = {};
  for (const match of value.matchAll(FIELD_PATTERN)) {
    const field = FIELD_LOOKUP.get(normalize(match[1]));
    if (field) fields[field] = match[2];
  }
  return {
    fields,
    hashtags: [...value.matchAll(/(?<!\w)#([a-zа-я0-9_]+)/giu)].map((match) => normalize(match[1])),
  };
}

function accountAliases(account: DashboardData["accounts"][number]): string[] {
  const name = normalize(account.name);
  const compact = account.name.toLocaleLowerCase("ru-RU").replaceAll("ё", "е").replace(/[^a-zа-я0-9]/giu, "");
  return [...new Set([
    normalize(account.id), normalize(account.id).replaceAll(" ", ""), name.replaceAll(" ", ""), compact,
    ...name.split(" ").filter((token) => token.length >= 3 && !GENERIC_ACCOUNT_WORDS.has(token)),
  ].filter(Boolean))];
}

function findAccounts(searchTokens: string[], accounts: DashboardData["accounts"]) {
  return accounts.map((account, index) => {
    const match = bestConcept(searchTokens, accountAliases(account));
    return { account, index, ...match };
  }).filter((item) => item.score > 0).sort((left, right) => right.score - left.score || left.index - right.index);
}

function matchAccount(value: string | undefined, accounts: DashboardData["accounts"]) {
  if (!value) return undefined;
  return findAccounts(tokens(value), accounts)[0];
}

function categoryFromText(value: string): { key: string; fuzzy: boolean } {
  const search = tokens(value);
  const matches = Object.entries(CATEGORY_ALIASES).map(([key, aliases]) => ({ key, ...bestConcept(search, aliases) }));
  const best = matches.sort((left, right) => right.score - left.score)[0];
  return best?.score ? { key: best.key, fuzzy: best.fuzzy } : { key: "other", fuzzy: false };
}

function cleanCounterparty(
  value: string,
  amountStart: number,
  amountEnd: number,
  accounts: DashboardData["accounts"],
  explicit?: string,
): string | undefined {
  if (explicit) return explicit;
  const candidate = `${value.slice(0, amountStart)} ${value.slice(amountEnd)}`;
  const accountWords = accounts.flatMap(accountAliases);
  const actions = [...KIND_ALIASES.income, ...KIND_ALIASES.expense, ...KIND_ALIASES.transfer, ...KIND_ALIASES.ownTransfer];
  const fieldWords = new Set(FIELD_LOOKUP.keys());
  const kept = [...candidate.matchAll(WORD_PATTERN)].flatMap((match) => {
    const original = match[0];
    const token = normalize(original);
    if (!token || /^\d+$/.test(token) || token.length === 1 || FILLER.has(token) || fieldWords.has(token)) return [];
    if (bestConcept([token], actions).score || bestConcept([token], COMPANY_ALIASES).score || bestConcept([token], accountWords).score) return [];
    return [original.replace(/^#/, "")];
  });
  return kept.join(" ").trim() || undefined;
}

function kindGroup(kind: TransactionCommand["kind"]): ParsedOperation["kind"] {
  if (kind === "income") return "income";
  if (kind === "card_payment") return "expense";
  return "transfer";
}

export function parseOperation(
  value: string,
  accounts: DashboardData["accounts"],
): ParsedOperation | null {
  const amountMatches = [...value.matchAll(AMOUNT_PATTERN)];
  const amountMatch = amountMatches.at(-1);
  if (!amountMatch || amountMatch.index == null) return null;
  const amount = Number(amountMatch[1].replace(/[\s\u00a0]/g, "").replace(",", "."));
  const scaledAmount = amountMatch[2] ? amount * 1000 : amount;
  if (!Number.isFinite(scaledAmount) || scaledAmount <= 0) return null;

  const { fields, hashtags } = readFields(value);
  const allTokens = tokens(value);
  const explicitTokens = tokens([fields.kind, ...hashtags].filter(Boolean).join(" "));
  const kindSearch = explicitTokens.length ? explicitTokens : allTokens;
  const income = bestConcept(kindSearch, KIND_ALIASES.income);
  const expense = bestConcept(kindSearch, KIND_ALIASES.expense);
  const transfer = bestConcept(kindSearch, KIND_ALIASES.transfer);
  const ownTransfer = bestConcept(kindSearch, KIND_ALIASES.ownTransfer);
  const genericAccounts = findAccounts(allTokens, accounts);
  const explicitFrom = matchAccount(fields.from, accounts);
  const explicitTo = matchAccount(fields.to, accounts);
  const explicitAccount = matchAccount(fields.account, accounts);
  const matchedAccounts = [explicitFrom, explicitTo, explicitAccount, ...genericAccounts].filter(
    (item, index, rows): item is NonNullable<typeof item> => Boolean(item) && rows.findIndex((other) => other?.account.id === item?.account.id) === index,
  );

  let transactionKind: TransactionCommand["kind"] = "card_payment";
  const kindCandidates = [
    { kind: "income" as const, ...income },
    { kind: "expense" as const, ...expense },
    { kind: "transfer" as const, ...transfer },
    { kind: "ownTransfer" as const, ...ownTransfer },
  ].sort((left, right) => right.score - left.score);
  const detected = kindCandidates[0];
  if (detected?.score && ["transfer", "ownTransfer"].includes(detected.kind)) {
    transactionKind = detected.kind === "ownTransfer" || (Boolean(explicitFrom) && Boolean(explicitTo)) || matchedAccounts.length >= 2
      ? "own_transfer" : "transfer_to_person";
  } else if (detected?.score && detected.kind === "income") {
    transactionKind = "income";
  }

  const accountFrom = explicitFrom?.account ?? explicitAccount?.account ?? genericAccounts[0]?.account;
  const accountTo = explicitTo?.account ?? explicitAccount?.account ?? genericAccounts[0]?.account;
  const ownTransferTo = explicitTo?.account ?? matchedAccounts.find((item) => item.account.id !== accountFrom?.id)?.account;
  const categorySearch = [fields.category, ...hashtags].filter(Boolean).join(" ") || value;
  const category = categoryFromText(categorySearch);
  const sourceSearch = tokens([fields.source, ...hashtags].filter(Boolean).join(" "));
  const tape = bestConcept(sourceSearch.length ? sourceSearch : allTokens, ["tape"]);
  const aa = bestConcept(sourceSearch.length ? sourceSearch : allTokens, ["aa"]);
  const counterparty = transactionKind === "own_transfer" ? undefined : cleanCounterparty(
    value,
    amountMatch.index,
    amountMatch.index + amountMatch[0].length,
    matchedAccounts.map((item) => item.account),
    fields.counterparty,
  );
  const company = bestConcept(allTokens, COMPANY_ALIASES);
  const fuzzy = [
    detected?.fuzzy, company.fuzzy, category.fuzzy, tape.fuzzy, aa.fuzzy,
    explicitFrom?.fuzzy, explicitTo?.fuzzy, explicitAccount?.fuzzy, ...genericAccounts.map((item) => item.fuzzy),
  ].some(Boolean);
  const account = transactionKind === "income" ? accountTo : accountFrom;
  const sourceKey = transactionKind === "income" ? (tape.score ? "tape" : aa.score ? "aa" : "other") : undefined;
  const categoryKey = transactionKind === "card_payment" ? category.key : undefined;
  const counterpartyName = transactionKind === "card_payment" && counterparty?.split(/\s+/).length === 1
    && categoryFromText(counterparty).key === categoryKey ? undefined : counterparty;
  const title = counterparty ?? (
    transactionKind === "income" ? "Поступление"
      : transactionKind === "own_transfer" ? "Перевод между счетами"
        : transactionKind === "transfer_to_person" ? "Перевод человеку" : "Расход"
  );
  const reasons = detected?.score ? ["Тип найден по синониму или тегу"] : ["Тип предложен по наиболее частому сценарию"];
  if (fuzzy) reasons.push("Распознано с учётом опечаток");
  if (matchedAccounts.length) reasons.push("Счёт найден в тексте или ключе");
  return {
    title,
    detail: account ? `${transactionKind === "income" ? "Зачисление" : "Списание"}, ${account.name}` : "Проверьте счёт и контрагента",
    amountMinor: Math.round(scaledAmount * 100),
    kind: kindGroup(transactionKind),
    transactionKind,
    accountFromId: transactionKind === "income" ? undefined : accountFrom?.id,
    accountToId: transactionKind === "income" ? accountTo?.id : transactionKind === "own_transfer" ? ownTransferTo?.id : undefined,
    categoryKey,
    sourceKey,
    counterpartyName,
    counterpartyType: company.score ? "company" : transactionKind === "card_payment" ? "merchant" : transactionKind === "transfer_to_person" ? "person" : "other",
    confidence: detected?.score ? (fuzzy ? 0.84 : 0.9) : 0.72,
    reasons,
  };
}
