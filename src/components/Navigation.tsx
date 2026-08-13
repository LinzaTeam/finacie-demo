import {
  ArrowLeftRight,
  BarChart3,
  BellRing,
  ClipboardCheck,
  BookOpen,
  CircleGauge,
  Flag,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  Search,
  Settings,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { formatMoney } from "../lib/format";
import { routeHref, type AppRoute } from "../routes";
import type { DashboardData } from "../types";

const primaryItems = [
  { key: "overview", label: "Сегодня", icon: LayoutDashboard },
  { key: "operations", label: "Операции", icon: ArrowLeftRight },
  { key: "analytics", label: "Аналитика", icon: BarChart3 },
  { key: "health", label: "Финздоровье", icon: HeartPulse },
  { key: "plan", label: "План", icon: CircleGauge },
  { key: "goals", label: "Цели", icon: Flag },
  { key: "search", label: "Поиск", icon: Search },
] as const;

const mobilePrimaryItems = primaryItems.filter(({ key }) => (
  key === "overview" || key === "operations" || key === "analytics"
));

const mobileMoreItems = [
  { key: "plan", label: "План", icon: CircleGauge },
  { key: "goals", label: "Цели", icon: Flag },
  { key: "health", label: "Финздоровье", icon: HeartPulse },
  { key: "accounts", label: "Счета", icon: WalletCards },
  { key: "obligations", label: "Обязательства", icon: ReceiptText },
  { key: "attention", label: "Контроль", icon: BellRing },
  { key: "reconciliation", label: "Автосверка", icon: ClipboardCheck },
  { key: "guide", label: "Справочник", icon: BookOpen },
  { key: "settings", label: "Настройки", icon: Settings },
] as const;

const simplePrimaryItems = [
  { key: "overview", label: "Сегодня", icon: LayoutDashboard },
  { key: "operations", label: "Операции", icon: ArrowLeftRight },
] as const;

const simpleMobilePrimaryItems = [
  ...simplePrimaryItems,
  { key: "attention", label: "Контроль", icon: BellRing },
] as const;

const simpleMobileMoreItems = [
  { key: "settings", label: "Настроить", icon: Settings },
] as const;

type NavigationProps = {
  activeRoute: AppRoute;
  accounts?: DashboardData["accounts"];
  obligationsTotal?: number;
  currency?: string;
  attentionCount?: number;
  activeUser?: { name: string; authMethod?: string; avatarDataUrl?: string | null; accentColor?: string };
  onLogout?: () => void;
  onNewOperation?: () => void;
  onSearch?: () => void;
  simpleMode?: boolean;
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
  attentionCount = 0,
  activeUser,
  onLogout,
  simpleMode = false,
}: NavigationProps) {
  const visiblePrimaryItems = simpleMode ? simplePrimaryItems : primaryItems;
  return (
    <aside className="sidebar">
      <a className="brand" href={routeHref("overview")} aria-label="Финансье, на главную">
        <span className="brand-mark" aria-hidden="true">$ </span>
        <span>Финансье</span>
      </a>

      <nav className="sidebar-nav" aria-label="Основная навигация">
        {visiblePrimaryItems.map(({ key, label, icon }) => (
          <NavItem route={key} label={label} icon={icon} activeRoute={activeRoute} key={key} />
        ))}
      </nav>

      {!simpleMode ? <div className="sidebar-section">
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
      </div> : null}

      <nav className="sidebar-footer-nav" aria-label="Контроль и настройки">
        <a
          className={activeRoute === "attention" ? "nav-link nav-link-active" : "nav-link"}
          href={routeHref("attention")}
          aria-current={activeRoute === "attention" ? "page" : undefined}
        >
          <BellRing size={18} strokeWidth={1.8} aria-hidden="true" />
          <span>Контроль</span>
          {attentionCount > 0 ? <small className="nav-attention-count">{attentionCount > 9 ? "9+" : attentionCount}</small> : null}
        </a>
        {!simpleMode ? <NavItem route="reconciliation" label="Автосверка" icon={ClipboardCheck} activeRoute={activeRoute} /> : null}
        {!simpleMode ? <NavItem route="guide" label="Справочник" icon={BookOpen} activeRoute={activeRoute} /> : null}
        <NavItem route="settings" label={simpleMode ? "Настроить" : "Настройки"} icon={Settings} activeRoute={activeRoute} />
      </nav>

      <div className="sidebar-profile">
        <span className="profile-avatar" style={{ background: activeUser?.accentColor }} aria-hidden="true">
          {activeUser?.avatarDataUrl ? <img src={activeUser.avatarDataUrl} alt="" /> : activeUser?.name.slice(0, 1) || "С"}
        </span>
        <span className="profile-copy">
          <strong>{activeUser?.name || "Семейный профиль"}</strong>
          <small>{activeUser?.authMethod === "telegram_webapp" ? "Вход через Telegram" : "Текущий автор записей"}</small>
        </span>
        {onLogout ? (
          <button className="profile-logout" type="button" onClick={onLogout} aria-label="Выйти из профиля">
            <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </aside>
  );
}

export function BottomNavigation({ activeRoute, onNewOperation, onSearch, simpleMode = false }: NavigationProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const menuId = useId();
  const visibleMobilePrimaryItems = simpleMode ? simpleMobilePrimaryItems : mobilePrimaryItems;
  const visibleMobileMoreItems = simpleMode ? simpleMobileMoreItems : mobileMoreItems;
  const isMoreRoute = visibleMobileMoreItems.some(({ key }) => key === activeRoute) || (!simpleMode && activeRoute === "search");

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  return (
    <>
      <nav className="bottom-nav" aria-label="Мобильная навигация">
        {visibleMobilePrimaryItems.slice(0, 2).map(({ key, label, icon: Icon }) => {
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
        <button
          className="bottom-nav-add"
          type="button"
          onClick={onNewOperation}
          disabled={!onNewOperation}
          aria-label="Новая операция"
        >
          <span className="bottom-nav-add-icon" aria-hidden="true">
            <Plus size={24} strokeWidth={2.2} />
          </span>
          <span>Добавить</span>
        </button>
        {visibleMobilePrimaryItems.slice(2).map(({ key, label, icon: Icon }) => {
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
        <button
          className={isMoreRoute || moreOpen ? "bottom-nav-link bottom-nav-link-active" : "bottom-nav-link"}
          type="button"
          onClick={() => setMoreOpen((current) => !current)}
          aria-expanded={moreOpen}
          aria-controls={menuId}
        >
          <Menu size={21} strokeWidth={1.8} aria-hidden="true" />
          <span>Ещё</span>
        </button>
      </nav>

      {moreOpen ? (
        <div className="mobile-nav-layer">
          <button className="mobile-nav-scrim" type="button" aria-label="Закрыть меню" onClick={() => setMoreOpen(false)} />
          <section className="mobile-nav-sheet" id={menuId} role="dialog" aria-modal="true" aria-labelledby={`${menuId}-title`}>
            <header className="mobile-nav-sheet-header">
              <div>
                <span>Навигация</span>
                <h2 id={`${menuId}-title`}>Все разделы</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setMoreOpen(false)} aria-label="Закрыть меню">
                <X size={19} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </header>
            <div className="mobile-nav-menu-grid">
              {!simpleMode ? <button
                className="mobile-nav-menu-item"
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onSearch?.();
                }}
              >
                <Search size={19} strokeWidth={1.8} aria-hidden="true" />
                <span>Поиск</span>
              </button> : null}
              {visibleMobileMoreItems.map(({ key, label, icon: Icon }) => {
                const current = activeRoute === key;
                return (
                  <a
                    className={current ? "mobile-nav-menu-item mobile-nav-menu-item-active" : "mobile-nav-menu-item"}
                    href={routeHref(key)}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setMoreOpen(false)}
                    key={key}
                  >
                    <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                    <span>{label}</span>
                  </a>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
