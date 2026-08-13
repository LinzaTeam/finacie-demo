import { BookOpenCheck, Bug, CircleHelp, Goal, Search, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { DataNotices, PageHeader } from "../components/PageChrome";
import type { FinancePageProps } from "./types";

type GuideItem = {
  question: string;
  answer: string;
  tags: string[];
};

const guideItems: GuideItem[] = [
  {
    question: "Как добавить доход, расход или перевод?",
    answer: "Нажмите «Новая операция», напишите её привычными словами и проверьте распознанные сумму, счёт, категорию и участника перед сохранением.",
    tags: ["операция", "доход", "расход", "перевод", "записать", "добавить"],
  },
  {
    question: "Как внести операцию за другого участника?",
    answer: "В форме новой операции выберите «Операция за» и нужного участника. Автор записи сохраняется отдельно — всегда видно, кто добавил операцию и за кого.",
    tags: ["другой", "участник", "автор", "за кого", "семья"],
  },
  {
    question: "Как пополнить цель?",
    answer: "Откройте «Цели», нажмите «Пополнить» на нужной карточке, укажите сумму и счёт-источник. Будет создан перевод между счетами и обновлён прогресс цели.",
    tags: ["цель", "копилка", "накопления", "пополнить", "перевод"],
  },
  {
    question: "Как настроить счёт, название или аватар?",
    answer: "Откройте «Счета», выберите счёт и измените название, владельца, иконку, цвет или аватар. Ручная корректировка баланса доступна там же и попадёт в журнал отдельной записью.",
    tags: ["счёт", "счет", "аватар", "банк", "баланс", "владелец"],
  },
  {
    question: "Где планировать обязательства и ближайшие платежи?",
    answer: "В «Плане» создаются регулярные и разовые платежи. В «Обязательствах» храните долги, рассрочки и минимальные платежи — они не смешиваются с доступными деньгами.",
    tags: ["план", "обязательства", "платёж", "платеж", "рассрочка", "долг"],
  },
  {
    question: "Как понимать темп расходов и накоплений?",
    answer: "На главной странице показан доступный остаток и дневной темп. Для цели с датой карточка рассчитывает нужную сумму в месяц и день; по мере приближения даты темп автоматически пересчитывается.",
    tags: ["темп", "день", "месяц", "прогноз", "дата", "здоровье"],
  },
  {
    question: "Что делать, если заметил ошибку?",
    answer: "Нажмите кнопку с жучком в верхней панели, опишите проблему и при необходимости приложите скриншоты. Отчёт сохранится в общей базе, а его статус будет виден в «Настройках» → «Поддержка».",
    tags: ["ошибка", "баг", "репорт", "поддержка", "скриншот"],
  },
  {
    question: "Где хранятся мои данные?",
    answer: "Записи сохраняются в защищённой семейной базе на сервере после входа. У каждой операции есть автор и участник; изменения и ручные корректировки фиксируются в журнале событий.",
    tags: ["данные", "сервер", "безопасность", "журнал", "авторизация"],
  },
];

export function GuidePage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser,
  selectedPeriod, onPeriodChange,
}: FinancePageProps) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
  const items = useMemo(() => guideItems.filter((item) => {
    const words = `${item.question} ${item.answer} ${item.tags.join(" ")}`
      .toLocaleLowerCase("ru-RU")
      .replaceAll("ё", "е")
      .split(/[^a-zа-я0-9]+/u)
      .filter(Boolean);
    const tokens = normalized.split(/\s+/).filter(Boolean);
    // People rarely remember an exact phrase. The guide accepts its words in
    // any order and allows a Russian word ending to vary ("банк" / "банка").
    return tokens.every((token) => words.some((word) => word.includes(token) || token.includes(word)));
  }), [normalized]);

  return (
    <main className="app-page guide-page" id="page-content" tabIndex={-1}>
      <PageHeader title="Справочник" subtitle="Короткие ответы о работе с семейными финансами" periodLabel={data.meta.periodLabel} fx={data.meta.fx} attentionCount={data.attention.total}
        theme={theme} onThemeToggle={onThemeToggle} onNewOperation={onNewOperation} onSearch={onSearch}
        activeUser={activeUser} selectedPeriod={selectedPeriod} onPeriodChange={onPeriodChange} />
      <DataNotices source={source} fx={data.meta.fx} />

      <section className="guide-hero panel">
        <span className="guide-hero-icon"><BookOpenCheck size={24} strokeWidth={1.8} aria-hidden="true" /></span>
        <div>
          <span className="eyebrow">Помощь без лишнего</span>
          <h2>Как пользоваться Финансье</h2>
          <p>Найдите действие по своему вопросу — от первой записи до контроля обязательств.</p>
        </div>
      </section>

      <label className="guide-search-control" htmlFor="guide-search">
        <Search size={19} strokeWidth={1.8} aria-hidden="true" />
        <input id="guide-search" aria-label="Поиск по справочнику" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по справочнику" />
        <span>{items.length}</span>
      </label>

      <section className="guide-layout" aria-label="Вопросы и ответы">
        <div className="guide-faq-list">
          {items.map((item) => (
            <details className="guide-faq-item" key={item.question}>
              <summary><CircleHelp size={18} strokeWidth={1.8} aria-hidden="true" /><span>{item.question}</span></summary>
              <p>{item.answer}</p>
              <div className="guide-tags">{item.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
            </details>
          ))}
          {items.length === 0 ? <div className="guide-empty"><Search size={22} aria-hidden="true" /><strong>Ничего не найдено</strong><span>Попробуйте другое слово или сообщите, какой ответ стоит добавить.</span></div> : null}
        </div>
        <aside className="guide-side-panel panel">
          <span className="guide-side-icon"><Goal size={19} aria-hidden="true" /></span>
          <div><strong>Начните с главного</strong><p>Сначала добавьте счета, затем фиксируйте операции — план и аналитика соберутся автоматически.</p></div>
          <span className="guide-side-icon"><WalletCards size={19} aria-hidden="true" /></span>
          <div><strong>Баг-репорт всегда сверху</strong><p>Кнопка с жучком доступна на каждом экране. Снимки и текст сохраняются вместе с автором.</p></div>
          <span className="guide-side-icon"><Bug size={19} aria-hidden="true" /></span>
        </aside>
      </section>
    </main>
  );
}
