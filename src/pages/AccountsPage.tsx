import { Banknote, Landmark, PiggyBank, WalletCards } from "lucide-react";
import { AccountRow } from "../components/FinanceRows";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { formatMoney } from "../lib/format";
import type { DashboardData } from "../types";
import type { FinancePageProps } from "./types";

const groupInfo = {
  operating: { title: "Рабочие счета", icon: WalletCards },
  savings: { title: "Сбережения", icon: PiggyBank },
  cash: { title: "Наличные", icon: Banknote },
} as const;

export function AccountsPage({
  data,
  source,
  theme,
  onThemeToggle,
  onNewOperation,
  onSearch,
}: FinancePageProps) {
  const grouped = (Object.keys(groupInfo) as Array<DashboardData["accounts"][number]["group"]>)
    .map((group) => ({ group, items: data.accounts.filter((account) => account.group === group) }))
    .filter(({ items }) => items.length > 0);

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Счета"
        subtitle="Собственные деньги, сбережения и наличные"
        periodLabel={data.meta.periodLabel}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation}
        onSearch={onSearch}
      />
      <DataNotices source={source} fx={data.meta.fx} />

      <section className="accounts-hero">
        <span className="accounts-hero-icon" aria-hidden="true"><Landmark size={24} strokeWidth={1.7} /></span>
        <span>
          <small>Доступно на рабочих счетах</small>
          <strong>{formatMoney(data.availableMoney.amountMinor, data.availableMoney.currency)}</strong>
        </span>
        <p>Обязательства и кредитные лимиты не входят в эту сумму.</p>
      </section>

      <section className="account-groups">
        {grouped.map(({ group, items }) => {
          const GroupIcon = groupInfo[group].icon;
          return (
            <div className="panel account-group-panel" key={group}>
              <SectionTitle
                title={groupInfo[group].title}
                action={<GroupIcon size={18} strokeWidth={1.8} aria-hidden="true" />}
              />
              <div className="finance-list">
                {items.map((account) => <AccountRow account={account} key={account.id} />)}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
