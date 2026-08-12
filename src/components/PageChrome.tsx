import { CalendarDays, Moon, Plus, Search, Sparkles, Sun, TriangleAlert, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardSource } from "../api/dashboard";
import type { DashboardData } from "../types";

export type ThemeMode = "light" | "dark";

type PageHeaderProps = {
  title: string;
  subtitle: string;
  periodLabel: string;
  theme: ThemeMode;
  onThemeToggle: () => void;
  onNewOperation: () => void;
  onSearch: () => void;
  activeUser: string;
};

export function PageHeader({
  title,
  subtitle,
  periodLabel,
  theme,
  onThemeToggle,
  onNewOperation,
  onSearch,
  activeUser,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-heading-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-actions">
        <span className="active-user-chip" title={`Текущий автор: ${activeUser}`}>
          <UserRound size={16} strokeWidth={1.8} aria-hidden="true" />
          {activeUser}
        </span>
        <button
          className="icon-button header-search-button"
          type="button"
          onClick={onSearch}
          aria-label="Открыть поиск"
          title="Поиск (⌘K / Ctrl+K)"
        >
          <Search size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <button className="primary-button" type="button" onClick={onNewOperation}>
          <Plus size={17} strokeWidth={2} aria-hidden="true" />
          Новая операция
        </button>
        <span className="period-control" aria-label={`Выбран период ${periodLabel}`}>
          <CalendarDays size={17} strokeWidth={1.8} aria-hidden="true" />
          {periodLabel}
        </span>
        <button
          className="icon-button"
          type="button"
          onClick={onThemeToggle}
          aria-label={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"}
        >
          {theme === "light" ? (
            <Moon size={18} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Sun size={18} strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}

export function DataNotices({
  source,
  fx,
}: {
  source: DashboardSource;
  fx: DashboardData["meta"]["fx"];
}) {
  return (
    <div className="notice-stack">
      {source === "demo" ? (
        <div className="notice notice-demo" role="status">
          <Sparkles size={18} strokeWidth={1.8} aria-hidden="true" />
          <div>
            <strong>Демо-профиль</strong>
            <span>Показаны обезличенные примеры. Личные финансовые данные не подключены.</span>
          </div>
        </div>
      ) : null}

      {fx.status === "partial" ? (
        <div className="notice notice-warning" role="status">
          <TriangleAlert size={18} strokeWidth={1.8} aria-hidden="true" />
          <div>
            <strong>Итог в рублях неполный</strong>
            <span>
              {fx.missingCurrencies.length > 0
                ? `Нет курса для ${fx.missingCurrencies.join(", ")}. Исходные остатки сохранены.`
                : "Часть валютных сумм не вошла в общий итог."}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action}
    </div>
  );
}
