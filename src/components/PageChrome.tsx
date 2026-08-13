import { BellRing, Bug, Moon, Plus, Search, Sparkles, Sun, TriangleAlert, UserRound } from "lucide-react";
import { useBugReport } from "./BugReportDialog";
import type { ReactNode } from "react";
import type { DashboardSource } from "../api/dashboard";
import type { DashboardData } from "../types";
import { PeriodPicker } from "./PeriodPicker";
import { routeHref } from "../routes";

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
  fx?: DashboardData["meta"]["fx"];
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  attentionCount?: number;
  simpleMode?: boolean;
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
  fx,
  selectedPeriod,
  onPeriodChange,
  attentionCount = 0,
  simpleMode = false,
}: PageHeaderProps) {
  const openBugReport = useBugReport();
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
        {!simpleMode && fx?.rates && fx.rates.length > 0 ? <CbrRateChip fx={fx} /> : null}
        {!simpleMode && openBugReport ? (
          <button
            className="icon-button header-bug-button"
            type="button"
            onClick={openBugReport}
            aria-label="Сообщить о проблеме"
            title="Сообщить о проблеме"
          >
            <Bug size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        ) : null}
        <a
          className="icon-button header-attention-button"
          href={routeHref("attention")}
          aria-label={attentionCount > 0 ? `Контроль: ${attentionCount} ожидают действия` : "Контроль и напоминания"}
          title={attentionCount > 0 ? `Контроль: ${attentionCount}` : "Контроль и напоминания"}
        >
          <BellRing size={18} strokeWidth={1.8} aria-hidden="true" />
          {attentionCount > 0 ? <span className="header-attention-count">{attentionCount > 9 ? "9+" : attentionCount}</span> : null}
        </a>
        {!simpleMode ? <button
          className="icon-button header-search-button"
          type="button"
          onClick={onSearch}
          aria-label="Открыть поиск"
          title="Поиск (⌘K / Ctrl+K)"
        >
          <Search size={18} strokeWidth={1.8} aria-hidden="true" />
        </button> : null}
        <button className="primary-button" type="button" onClick={onNewOperation}>
          <Plus size={17} strokeWidth={2} aria-hidden="true" />
          Новая операция
        </button>
        {!simpleMode ? <PeriodPicker value={selectedPeriod} label={periodLabel} onChange={onPeriodChange} /> : null}
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

function CbrRateChip({ fx }: { fx: DashboardData["meta"]["fx"] }) {
  const values = fx.rates?.filter((rate) => rate.currency === "USD" || rate.currency === "EUR") ?? [];
  if (values.length === 0) return null;
  const label = values.map((rate) => `${rate.currency} ${formatRate(rate.rubPerUnit)} ₽`).join(" · ");
  return <span className="cbr-rate-chip" title={`${fx.source || "ЦБ РФ"}${fx.effectiveDate ? ` · курс на ${fx.effectiveDate}` : ""}`}>
    <span>{fx.source || "ЦБ РФ"}</span>{label}
  </span>;
}

function formatRate(value: number): string {
  return new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function DataNotices({
  source,
  fx,
  simpleMode = false,
}: {
  source: DashboardSource;
  fx: DashboardData["meta"]["fx"];
  simpleMode?: boolean;
}) {
  if (simpleMode) return null;
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
