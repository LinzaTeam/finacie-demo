import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { formatDateTime, formatMoney, formatShortDate } from "../lib/format";
import type { DashboardData } from "../types";

export function TransactionRow({
  transaction,
  showDate = true,
}: {
  transaction: DashboardData["transactions"][number];
  showDate?: boolean;
}) {
  const sign = transaction.kind === "income" ? "+" : transaction.kind === "expense" ? "−" : "";
  const Icon =
    transaction.kind === "income"
      ? ArrowDownRight
      : transaction.kind === "expense"
        ? ArrowUpRight
        : RefreshCw;

  return (
    <div className="transaction-row">
      <span className={`finance-icon finance-icon-${transaction.kind}`} aria-hidden="true">
        <Icon size={19} strokeWidth={1.9} />
      </span>
      <span className="transaction-copy">
        <strong>{transaction.title}</strong>
        <small>{transaction.detail}</small>
      </span>
      {transaction.status === "pending_review" ? (
        <span className="status-label">
          <ShieldCheck size={14} strokeWidth={1.8} aria-hidden="true" />
          Проверка
        </span>
      ) : null}
      {showDate ? <time>{formatShortDate(transaction.occurredAt)}</time> : null}
      <strong className={`transaction-amount amount-${transaction.kind}`}>
        {sign}{formatMoney(transaction.amountMinor, transaction.currency)}
      </strong>
    </div>
  );
}

export function AccountRow({ account }: { account: DashboardData["accounts"][number] }) {
  const Icon = account.group === "cash" ? Banknote : account.group === "savings" ? CircleDollarSign : WalletCards;

  return (
    <div className="account-row">
      <span className={`finance-icon account-icon-${account.group}`} aria-hidden="true">
        <Icon size={19} strokeWidth={1.8} />
      </span>
      <span className="account-copy">
        <strong>{account.name}</strong>
        <small>Обновлён {formatDateTime(account.updatedAt)}</small>
      </span>
      <span className="account-amount">
        <strong>{formatMoney(account.balanceMinor, account.currency)}</strong>
        {account.currency !== "RUB" ? (
          <small>
            {account.convertedBalanceMinor == null
              ? "Без рублёвого эквивалента"
              : `≈ ${formatMoney(account.convertedBalanceMinor, "RUB")}`}
          </small>
        ) : null}
      </span>
    </div>
  );
}
