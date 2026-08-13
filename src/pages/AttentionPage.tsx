import { BellRing, Check, CopyCheck, X } from "lucide-react";
import { useState } from "react";
import { resolveDuplicateReview } from "../api/attention";
import { DataNotices, PageHeader, SectionTitle } from "../components/PageChrome";
import { formatMoney, formatShortDate } from "../lib/format";
import type { DashboardData } from "../types";
import type { FinancePageProps } from "./types";

type DuplicateReview = DashboardData["attention"]["duplicates"][number];

export function AttentionPage({
  data, source, theme, onThemeToggle, onNewOperation, onSearch, activeUser,
  selectedPeriod, onPeriodChange, activeUserKey, canWrite = true, simpleMode = false, onDataChange, onRefresh,
}: FinancePageProps) {
  const [savingToken, setSavingToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { duplicates } = data.attention;
  const attentionCount = duplicates.length;
  const hasItems = attentionCount > 0;

  const resolve = async (review: DuplicateReview, decision: "approved" | "rejected") => {
    setSavingToken(review.token);
    setError(null);
    try {
      if (source === "demo") {
        const remainingDuplicates = duplicates.filter((item) => item.token !== review.token);
        onDataChange?.({
          ...data,
          attention: {
            ...data.attention,
            total: remainingDuplicates.length,
            duplicates: remainingDuplicates,
          },
          reconciliation: {
            ...data.reconciliation,
            openIssues: remainingDuplicates.length,
          },
        });
      } else {
        await resolveDuplicateReview(review.token, decision);
        onRefresh?.();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить решение.");
    } finally {
      setSavingToken(null);
    }
  };

  return (
    <main className="app-page" id="page-content" tabIndex={-1}>
      <PageHeader
        title="Контроль"
        subtitle="Дубли, которые требуют внимания"
        periodLabel={data.meta.periodLabel}
        fx={data.meta.fx}
        attentionCount={attentionCount}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onNewOperation={onNewOperation}
        onSearch={onSearch}
        activeUser={activeUser}
        selectedPeriod={selectedPeriod}
        onPeriodChange={onPeriodChange}
        simpleMode={simpleMode}
      />
      <DataNotices source={source} fx={data.meta.fx} simpleMode={simpleMode} />

      <section className={hasItems ? "attention-summary attention-summary-active" : "attention-summary"}>
        <span className="attention-summary-icon" aria-hidden="true">
          {hasItems ? <BellRing size={25} strokeWidth={1.8} /> : <Check size={25} strokeWidth={2} />}
        </span>
        <div>
          <span>Центр контроля</span>
          <h2>{hasItems ? `Ожидают внимания: ${attentionCount}` : "Всё под контролем"}</h2>
          <p>
            {hasItems
              ? "Подтвердите только то, что действительно произошло."
              : "Нет неподтверждённых дублей."}
          </p>
        </div>
      </section>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <section className="attention-section" aria-label="Проверка дублей">
        <SectionTitle title="Проверка дублей" action={<span className="section-count">{duplicates.length}</span>} />
        {duplicates.length === 0 ? (
          <EmptyAttention text="Подозрительных повторов нет." />
        ) : (
          <div className="attention-list">
            {duplicates.map((review) => {
              const isReviewer = review.reviewerKey === activeUserKey;
              const saving = savingToken === review.token;
              return (
                <article className="attention-item attention-duplicate" key={review.token}>
                  <span className="attention-item-icon" aria-hidden="true"><CopyCheck size={20} strokeWidth={1.8} /></span>
                  <div className="attention-item-main">
                    <div className="attention-item-topline">
                      <strong>{review.transaction.title}</strong>
                      <span className={review.transaction.kind === "income" ? "amount-positive" : "amount-negative"}>
                        {review.transaction.kind === "income" ? "+" : "−"}{formatMoney(review.transaction.amountMinor, review.transaction.currency)}
                      </span>
                    </div>
                    <p>{review.transaction.detail || `Внесено ${review.requesterName}`}</p>
                    <small>
                      Похоже на «{review.existing.title}»{review.existing.date ? ` от ${formatShortDate(review.existing.date)}` : ""}.
                      Проверяет {review.reviewerName}.
                    </small>
                  </div>
                  <div className="attention-item-actions">
                    {isReviewer && canWrite ? (
                      <>
                        <button className="compact-button compact-button-approve" type="button" disabled={saving} onClick={() => void resolve(review, "approved")}>
                          <Check size={16} strokeWidth={2} aria-hidden="true" />Это не дубль
                        </button>
                        <button className="compact-button compact-button-quiet" type="button" disabled={saving} onClick={() => void resolve(review, "rejected")}>
                          <X size={16} strokeWidth={2} aria-hidden="true" />Отклонить
                        </button>
                      </>
                    ) : (
                      <span className="attention-waiting">{isReviewer ? "Нет прав на запись" : `Ждём решения ${review.reviewerName}`}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

    </main>
  );
}

function EmptyAttention({ text }: { text: string }) {
  return <div className="attention-empty"><Check size={19} strokeWidth={1.9} aria-hidden="true" /><span>{text}</span></div>;
}
