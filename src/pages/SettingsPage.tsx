import { CheckCircle2, Database, Moon, ShieldCheck, Sun, UsersRound } from "lucide-react";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import type { FinancePageProps } from "./types";

export function SettingsPage({
  data,
  source,
  theme,
  onThemeToggle,
  onNewOperation,
  onSearch,
  activeUser,
}: FinancePageProps) {
  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Настройки"
        subtitle="Профиль, внешний вид и источник данных"
        periodLabel={data.meta.periodLabel}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation}
        onSearch={onSearch}
        activeUser={activeUser}
      />
      <DataNotices source={source} fx={data.meta.fx} />

      <section className="settings-grid">
        <div className="panel settings-panel">
          <SectionTitle title="Семейный профиль" />
          <div className="settings-row">
            <span className="settings-icon" aria-hidden="true"><UsersRound size={20} strokeWidth={1.8} /></span>
            <span><strong>Семейный профиль</strong><small>Общие счета, операции и сверка</small></span>
            <CheckCircle2 size={19} strokeWidth={1.9} aria-label="Профиль активен" />
          </div>
          <div className="settings-row">
            <span className="settings-icon" aria-hidden="true"><ShieldCheck size={20} strokeWidth={1.8} /></span>
            <span><strong>Приватность</strong><small>Ответы с финансовыми данными не кэшируются</small></span>
            <CheckCircle2 size={19} strokeWidth={1.9} aria-label="Защита включена" />
          </div>
        </div>

        <div className="panel settings-panel">
          <SectionTitle title="Оформление" />
          <button className="theme-setting" type="button" onClick={onThemeToggle}>
            <span className="settings-icon" aria-hidden="true">
              {theme === "light" ? <Sun size={20} strokeWidth={1.8} /> : <Moon size={20} strokeWidth={1.8} />}
            </span>
            <span><strong>{theme === "light" ? "Светлая тема" : "Тёмная тема"}</strong><small>Нажмите, чтобы переключить</small></span>
            <span className="theme-swatch" aria-hidden="true" />
          </button>
        </div>

        <div className="panel settings-panel settings-source">
          <SectionTitle title="Источник данных" />
          <div className="settings-row">
            <span className="settings-icon" aria-hidden="true"><Database size={20} strokeWidth={1.8} /></span>
            <span>
              <strong>{source === "demo" ? "Обезличенный демо-профиль" : "Локальная финансовая база"}</strong>
              <small>Часовой пояс: {data.meta.timezone}</small>
            </span>
            <span className="source-status">{source === "demo" ? "Демо" : "Подключено"}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
