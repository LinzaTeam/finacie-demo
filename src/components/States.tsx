import { CircleAlert, RefreshCw, WalletCards } from "lucide-react";

export function LoadingDashboard() {
  return (
    <main className="main-content" aria-busy="true" aria-label="Загрузка обзора">
      <div className="loading-header skeleton" />
      <div className="loading-ledger">
        <div className="loading-balance skeleton" />
        <div className="loading-metrics skeleton" />
      </div>
      <div className="loading-wide skeleton" />
      <div className="loading-columns">
        <div className="loading-panel skeleton" />
        <div className="loading-panel skeleton" />
      </div>
      <span className="sr-only">Собираем актуальные балансы и операции</span>
    </main>
  );
}

export function ErrorDashboard({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="state-page" role="alert">
      <span className="state-icon state-icon-error" aria-hidden="true">
        <CircleAlert size={24} strokeWidth={1.8} />
      </span>
      <h1>Не удалось загрузить финансовый обзор</h1>
      <p>Данные не заменены примерами. Проверьте подключение к финансовой базе и повторите запрос.</p>
      <button className="primary-button" type="button" onClick={onRetry}>
        <RefreshCw size={18} strokeWidth={1.8} aria-hidden="true" />
        Повторить
      </button>
    </main>
  );
}

export function EmptyDashboard() {
  return (
    <main className="state-page">
      <span className="state-icon" aria-hidden="true">
        <WalletCards size={24} strokeWidth={1.8} />
      </span>
      <h1>Финансовый контур пока пуст</h1>
      <p>Добавьте первый счёт или зафиксируйте операцию в Telegram. Обзор соберётся автоматически.</p>
    </main>
  );
}
