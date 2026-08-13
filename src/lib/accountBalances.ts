import type { DashboardData } from "../types";

export const accountGroupLabels: Record<DashboardData["accounts"][number]["group"], string> = {
  operating: "Рабочий счёт",
  savings: "Накопительный счёт",
  cash: "Наличные",
};

export function accountBalanceInBaseCurrency(
  account: DashboardData["accounts"][number],
  baseCurrency: string,
): number {
  return account.convertedBalanceMinor
    ?? (account.currency === baseCurrency ? account.balanceMinor : 0);
}

export function savingsBalanceMinor(data: DashboardData): number {
  return data.accounts.reduce((sum, account) => (
    account.group === "savings"
      ? sum + accountBalanceInBaseCurrency(account, data.availableMoney.currency)
      : sum
  ), 0);
}

export function totalBalanceMinor(data: DashboardData): number {
  return data.availableMoney.amountMinor + savingsBalanceMinor(data);
}
