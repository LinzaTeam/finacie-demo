import {
  ArrowLeftRight,
  CircleGauge,
  ClipboardCheck,
  Flag,
  LayoutDashboard,
  ReceiptText,
  Search,
  Settings,
  WalletCards,
} from "lucide-react";
import { formatMoney } from "../lib/format";
import { routeHref, type AppRoute } from "../routes";
import type { DashboardData } from "../types";

const primaryItems = [
  { key: "overview", label: "Сегодня", icon: LayoutDashboard },
  { key: "operations", label: "Операции", icon: ArrowLeftRight },
  { key: "plan", label: "План", icon: CircleGauge },
  { key: "goals", label: "Цели", icon: Flag },
  { key: "search", label: "Поиск", icon: Search },
] as const;

const mobileItems = primaryItems.filter(({ key }) => key !== "search");

type NavigationProps = {
  activeRoute: AppRoute;
  accounts?: DashboardData["accounts"];
  obligationsTotal?: number;
  currency?: string;
};

function NavItem({
  route,
  label,
  icon: Icon,
  activeRoute,
}: {
  route: AppRoute;
  label: string;
  icon: typeof LayoutDashboard;
  activeRoute: AppRoute;
}) {
  const current = activeRoute === route;
  return (
    <a
      className={current ? "nav-link nav-link-active" : "nav-link"}
      href={routeHref(route)}
      aria-current={current ? "page" : undefined}
    >
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}

export function Sidebar({
  activeRoute,
  accounts = [],
  obligationsTotal = 0,
  currency = "RUB",
}: NavigationProps) {
  return (
    <aside className="sidebar">
      <a className="brand" href={routeHref("overview")} aria-label="Финансье, на главную">
        <span className="brand-mark" aria-hidden="true">$ </span>
        <span>Финансье</span>
      </a>

      <nav className="sidebar-nav" aria-label="Основная навигация">
        {primaryItems.map(({ key, label, icon }) => (
          <NavItem route={key} label={label} icon={icon} activeRoute={activeRoute} key={key} />
        ))}
      </nav>

      <div className="sidebar-section">
        <span className="sidebar-label">Счета</span>
        <a className={activeRoute === "accounts" ? "account-nav account-nav-active" : "account-nav"} href={routeHref("accounts")}>
          <WalletCards size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>Все счета</span>
        </a>
        {accounts.slice(0, 4).map((account) => (
          <a className="account-nav account-nav-balance" href={routeHref("accounts")} key={account.id}>
            <span className="account-nav-dot" aria-hidden="true" />
            <span>{account.name}</span>
            <strong>{formatMoney(account.balanceMinor, account.currency)}</strong>
          </a>
        ))}
        <a className={activeRoute === "obligations" ? "account-nav account-nav-active" : "account-nav"} href={routeHref("obligations")}>
          <ReceiptText size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>Обязательства</span>
          <strong>{formatMoney(obligationsTotal, currency)}</strong>
        </a>
      </div>

      <nav className="sidebar-footer-nav" aria-label="Контроль и настройки">
        <NavItem route="reconciliation" label="Сверка" icon={ClipboardCheck} activeRoute={activeRoute} />
        <NavItem route="settings" label="Настройки" icon={Settings} activeRoute={activeRoute} />
      </nav>

      <div className="sidebar-profile">
        <span className="profile-avatar" aria-hidden="true">С</span>
        <span className="profile-copy">
          <strong>Семейный профиль</strong>
          <small>Общий финансовый контур</small>
        </span>
      </div>
    </aside>
  );
}

export function BottomNavigation({ activeRoute }: NavigationProps) {
  return (
    <nav className="bottom-nav" aria-label="Мобильная навигация">
      {mobileItems.map(({ key, label, icon: Icon }) => {
        const current = activeRoute === key;
        return (
          <a
            className={current ? "bottom-nav-link bottom-nav-link-active" : "bottom-nav-link"}
            href={routeHref(key)}
            aria-current={current ? "page" : undefined}
            key={key}
          >
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
