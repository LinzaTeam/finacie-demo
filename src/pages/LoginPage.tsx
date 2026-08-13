import { Check, Copy, Database, KeyRound, LockKeyhole, Moon, Send, ShieldCheck, Sun, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  SessionApiError,
  pollBrowserLogin,
  startBrowserLogin,
  type AuthConfig,
  type BrowserLoginChallenge,
} from "../api/session";
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
  const canPairBrowser = config.browser_pairing_enabled;
  const [challenge, setChallenge] = useState<BrowserLoginChallenge | null>(null);
  const [pairingState, setPairingState] = useState<"idle" | "requesting" | "waiting" | "error">("idle");
  const [pairingMessage, setPairingMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!challenge) return;
    let cancelled = false;
    let timer: number | undefined;

    const checkStatus = async () => {
      try {
        const result = await pollBrowserLogin(challenge.challenge_token);
        if (cancelled) return;
        if (result !== "pending") {
          setPairingMessage("Вход подтверждён. Открываем ваши финансы…");
          onRetry();
          return;
        }
        timer = window.setTimeout(checkStatus, 2_000);
      } catch (error) {
        if (cancelled) return;
        const expired = error instanceof SessionApiError && error.status === 410;
        setPairingState("error");
        setPairingMessage(expired ? "Код истёк. Получите новый — это займёт секунду." : "Не удалось проверить код. Получите новый и повторите попытку.");
        setChallenge(null);
      }
    };

    timer = window.setTimeout(checkStatus, 1_500);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [challenge, onRetry]);

  const beginBrowserLogin = async () => {
    setPairingState("requesting");
    setPairingMessage(null);
    setCopied(false);
    try {
      const nextChallenge = await startBrowserLogin();
      setChallenge(nextChallenge);
      setPairingState("waiting");
    } catch {
      setPairingState("error");
      setPairingMessage("Код сейчас не удалось получить. Проверьте соединение и попробуйте ещё раз.");
    }
  };

  const copyCommand = async () => {
    if (!challenge) return;
    try {
      await navigator.clipboard.writeText(`/web ${challenge.code}`);
      setCopied(true);
    } catch {
      setPairingMessage("Скопируйте команду вручную и отправьте её в личный чат с ботом.");
    }
  };

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
            {canPairBrowser ? (
              <button className="login-primary-button" type="button" onClick={beginBrowserLogin} disabled={pairingState === "requesting"}>
                <KeyRound size={19} strokeWidth={2} aria-hidden="true" />
                {pairingState === "requesting" ? "Получаем код…" : challenge ? "Получить новый код" : "Войти с кодом"}
              </button>
            ) : null}
            {canOpenTelegram ? (
              <a className="login-secondary-button login-telegram-button" href={config.telegram_login_url || undefined} target="_blank" rel="noreferrer">
                <Send size={19} strokeWidth={2} aria-hidden="true" />
                Открыть в Telegram
              </a>
            ) : (
              <button className="login-primary-button" type="button" disabled>
                <Send size={19} strokeWidth={2} aria-hidden="true" />
                Вход временно недоступен
              </button>
            )}
          </div>

          {challenge ? (
            <section className="browser-pairing" aria-live="polite" aria-label="Вход с кодом">
              <div>
                <span>Шаг 1</span>
                <strong>Отправьте боту эту команду</strong>
              </div>
              <div className="browser-pairing-command">
                <code>/web {challenge.code}</code>
                <button type="button" onClick={copyCommand} aria-label="Скопировать команду входа">
                  {copied ? <Check size={17} strokeWidth={2} aria-hidden="true" /> : <Copy size={17} strokeWidth={1.9} aria-hidden="true" />}
                  {copied ? "Скопировано" : "Скопировать"}
                </button>
              </div>
              <p>Шаг 2 — вернитесь сюда. Вход завершится автоматически в течение нескольких секунд.</p>
            </section>
          ) : null}

          {pairingMessage || message ? <p className="login-message" role="status">{pairingMessage || message}</p> : null}
          <p className="login-help">
            Для входа в Chrome откройте бота <strong>@{config.telegram_bot_username || "finance_family_bot"}</strong>
            {" "}и подтвердите код. Кнопка Telegram остаётся удобным входом с телефона.
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
