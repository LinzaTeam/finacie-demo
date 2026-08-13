import { Database, LockKeyhole, Moon, Send, ShieldCheck, Sun, Users } from "lucide-react";
import type { AuthConfig } from "../api/session";
import type { ThemeMode } from "../components/PageChrome";

type LoginPageProps = {
  config: AuthConfig;
  theme: ThemeMode;
  message?: string;
  onRetry: () => void;
  onThemeToggle: () => void;
};

export function LoginPage({ config, theme, message, onRetry, onThemeToggle }: LoginPageProps) {
  const canOpenTelegram = config.telegram_auth_enabled && Boolean(config.telegram_login_url);

  return (
    <main className="login-page" id="page-content" tabIndex={-1}>
      <header className="login-header">
        <a className="login-brand" href="#/overview" aria-label="Финансье">
          <span className="login-brand-mark" aria-hidden="true">$</span>
          <span>Финансье</span>
        </a>
        <button className="login-theme-button" type="button" onClick={onThemeToggle} aria-label="Сменить тему">
          {theme === "light" ? <Moon size={19} /> : <Sun size={20} />}
        </button>
      </header>

      <section className="login-layout" aria-labelledby="login-title">
        <div className="login-copy">
          <p className="login-eyebrow">Семейные финансы</p>
          <h1 id="login-title">Деньги семьи.<br />В одном спокойном месте.</h1>
          <p className="login-intro">
            Войдите через Telegram, чтобы видеть свои счета, операции, цели и аналитику.
            Каждая запись сохраняет автора и того, за кого она внесена.
          </p>

          <div className="login-actions">
            {canOpenTelegram ? (
              <a className="login-primary-button" href={config.telegram_login_url || undefined} target="_blank" rel="noreferrer">
                <Send size={19} strokeWidth={2} aria-hidden="true" />
                Открыть в Telegram
              </a>
            ) : (
              <button className="login-primary-button" type="button" disabled>
                <Send size={19} strokeWidth={2} aria-hidden="true" />
                Вход временно недоступен
              </button>
            )}
            <button className="login-secondary-button" type="button" onClick={onRetry}>
              Я уже открыл приложение
            </button>
          </div>

          {message ? <p className="login-message" role="status">{message}</p> : null}
          <p className="login-help">
            Откройте бота <strong>@{config.telegram_bot_username || "finance_dasha_plus_artem_bot"}</strong>
            {" "}и нажмите кнопку «Открыть Финансье».
          </p>
        </div>

        <div className="login-preview" aria-label="Что доступно после входа">
          <div className="login-preview-topline">
            <span>Август</span>
            <span className="login-live"><i /> Синхронизация</span>
          </div>
          <div className="login-balance-card">
            <span>Доступно семье</span>
            <strong>Все счета и планы</strong>
            <small>Данные загружаются только после входа</small>
          </div>
          <div className="login-feature-grid">
            <article>
              <span className="login-feature-icon"><Database size={18} /></span>
              <strong>На сервере</strong>
              <small>Операции остаются между сессиями</small>
            </article>
            <article>
              <span className="login-feature-icon"><Users size={18} /></span>
              <strong>С авторством</strong>
              <small>Видно, кто и за кого внёс запись</small>
            </article>
          </div>
          <div className="login-security-row">
            <span><ShieldCheck size={18} /> Проверка Telegram</span>
            <span><LockKeyhole size={18} /> Закрытая сессия</span>
          </div>
        </div>
      </section>

      <footer className="login-footer">
        <span>Финансье</span>
        <span>Доступ только для подтверждённых участников семьи</span>
      </footer>
    </main>
  );
}
