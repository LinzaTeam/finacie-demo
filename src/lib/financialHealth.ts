import type { DashboardData } from "../types";

export type HealthTone = "strong" | "steady" | "attention" | "risk";

export type HealthMetric = {
  key: string;
  label: string;
  value: string;
  detail: string;
  points: number;
  maxPoints: number;
  tone: HealthTone;
};

export type HealthRisk = {
  id: string;
  title: string;
  detail: string;
  probability: number;
  impact: number;
  score: number;
  tone: "green" | "yellow" | "red";
  action: string;
};

export type FinancialHealth = {
  score: number;
  emoji: string;
  title: string;
  summary: string;
  metrics: HealthMetric[];
  runwayDays: number;
  upcomingCommitmentsMinor: number;
  knownIncomeMinor: number;
  knownExpenseMinor: number;
  forecast: {
    horizonDays: number;
    dailyNetMinor: number;
    cautiousMinor: number;
    baseMinor: number;
    optimisticMinor: number;
    scheduledNetMinor: number;
  };
  risks: HealthRisk[];
  horizontal: {
    currentMinor: number;
    previousMinor: number;
    changeMinor: number;
    changePercent: number | null;
  };
  assetMix: Array<{ key: "operating" | "savings" | "cash"; label: string; amountMinor: number; share: number }>;
  insights: string[];
};

const DAY_MS = 24 * 60 * 60 * 1_000;

function dateAtNoon(value: string): Date {
  return new Date(value.includes("T") ? value : `${value}T12:00:00+03:00`);
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(value: Date, months: number): Date {
  const next = new Date(value);
  next.setMonth(next.getMonth() + months);
  return next;
}

function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS);
}

function toneForShare(share: number, good: number, watch: number): HealthTone {
  if (share >= good) return "strong";
  if (share >= watch) return "steady";
  if (share > 0) return "attention";
  return "risk";
}

function riskTone(score: number): HealthRisk["tone"] {
  if (score >= 15) return "red";
  if (score >= 7) return "yellow";
  return "green";
}

function occurrencesBetween(
  dueDate: string,
  recurrence: "once" | "monthly" | undefined,
  asOf: Date,
  end: Date,
): Date[] {
  let current = dateAtNoon(dueDate);
  if (Number.isNaN(current.getTime())) return [];
  if (recurrence !== "monthly") {
    return current >= asOf && current <= end ? [current] : [];
  }
  while (current < asOf) current = addMonths(current, 1);
  const result: Date[] = [];
  while (current <= end) {
    result.push(current);
    current = addMonths(current, 1);
  }
  return result;
}

function scheduledFlows(data: DashboardData, asOf: Date, horizonDays: number): { income: number; expense: number } {
  const end = addDays(asOf, horizonDays);
  let income = 0;
  let expense = 0;
  data.plannedPayments.forEach((payment) => {
    const count = occurrencesBetween(payment.dueDate, payment.recurrence, asOf, end).length;
    if (payment.kind === "income") income += payment.amountMinor * count;
    else expense += payment.amountMinor * count;
  });
  data.obligations.forEach((obligation) => {
    if (!obligation.dueDate || !obligation.minimumPaymentMinor) return;
    const count = occurrencesBetween(obligation.dueDate, obligation.recurrence, asOf, end).length;
    expense += obligation.minimumPaymentMinor * count;
  });
  return { income, expense };
}

function healthLabel(score: number): Pick<FinancialHealth, "emoji" | "title" | "summary"> {
  if (score >= 9) return { emoji: "🌿", title: "Крепкое состояние", summary: "Резерв и поток дают семье хороший запас для плановых решений." };
  if (score >= 7) return { emoji: "🙂", title: "Устойчивое состояние", summary: "Базовые показатели в порядке; следите за следующими платежами и планом." };
  if (score >= 4) return { emoji: "🟡", title: "Нужен контроль", summary: "Денег хватает на текущий контур, но один-два показателя требуют внимания." };
  return { emoji: "🧭", title: "Высокая нагрузка", summary: "Сначала защитите ближайшие платежи и резерв, затем возвращайтесь к планам." };
}

export function deriveFinancialHealth(data: DashboardData): FinancialHealth {
  const asOf = dateAtNoon(data.meta.generatedAt);
  const monthEnd = new Date(asOf.getFullYear(), asOf.getMonth() + 1, 0);
  const elapsedDays = Math.max(1, Math.min(monthEnd.getDate(), asOf.getDate()));
  const monthlyNetMinor = data.month.incomeMinor - data.month.expenseMinor;
  const dailyExpenseMinor = data.month.expenseMinor / elapsedDays;
  const dailyNetMinor = monthlyNetMinor / elapsedDays;
  const runwayDays = dailyExpenseMinor > 0 ? Math.max(0, Math.floor(data.availableMoney.amountMinor / dailyExpenseMinor)) : 0;
  const upcoming = scheduledFlows(data, asOf, 30);
  const forecasted = scheduledFlows(data, asOf, 90);
  const upcomingCommitmentsMinor = upcoming.expense;
  const totalDebtMinor = data.obligations.reduce((sum, item) => sum + item.debtMinor, 0);
  const commitmentCoverage = upcomingCommitmentsMinor > 0
    ? data.availableMoney.amountMinor / upcomingCommitmentsMinor
    : Number.POSITIVE_INFINITY;
  const debtToLiquidAssets = totalDebtMinor > 0
    ? totalDebtMinor / Math.max(1, data.availableMoney.amountMinor)
    : 0;
  const planExpenseMinor = data.plan?.expenseMinor ?? 0;
  const planShare = planExpenseMinor > 0 ? data.month.expenseMinor / planExpenseMinor : null;
  const reconciliationComplete = data.reconciliation.status === "complete";
  const dataComplete = data.meta.fx.status === "complete" && data.transactions.length > 0;

  const reservePoints = runwayDays >= 90 ? 3 : runwayDays >= 60 ? 2 : runwayDays >= 30 ? 1 : 0;
  const cashflowPoints = monthlyNetMinor >= 0 ? 2 : monthlyNetMinor >= -(data.month.expenseMinor * 0.1) ? 1 : 0;
  const commitmentPoints = !Number.isFinite(commitmentCoverage) || commitmentCoverage >= 1 ? 1 : 0;
  const debtPoints = debtToLiquidAssets <= 1 ? 1 : 0;
  const planPoints = planShare === null ? 0 : planShare <= 1 ? 1 : 0;
  const reconciliationPoints = reconciliationComplete ? 1 : 0;
  const dataPoints = dataComplete ? 1 : 0;
  const rawScore = reservePoints + cashflowPoints + commitmentPoints + debtPoints + planPoints + reconciliationPoints + dataPoints;
  const score = Math.max(1, Math.min(10, rawScore));

  const metrics: HealthMetric[] = [
    {
      key: "reserve",
      label: "Резерв ликвидности",
      value: dailyExpenseMinor > 0 ? `${runwayDays} дн.` : "Нет базы",
      detail: dailyExpenseMinor > 0 ? "Свободные деньги относительно текущего темпа расходов." : "Нужны подтверждённые расходы за период.",
      points: reservePoints,
      maxPoints: 3,
      tone: toneForShare(reservePoints / 3, 1, 2 / 3),
    },
    {
      key: "cashflow",
      label: "Денежный поток",
      value: monthlyNetMinor >= 0 ? "Положительный" : "Отрицательный",
      detail: "Доходы минус расходы за выбранный период.",
      points: cashflowPoints,
      maxPoints: 2,
      tone: toneForShare(cashflowPoints / 2, 1, 0.5),
    },
    {
      key: "commitments",
      label: "Покрытие обязательств",
      value: Number.isFinite(commitmentCoverage) ? `${commitmentCoverage.toFixed(1)}×` : "Нет платежей",
      detail: "Свободные деньги относительно известных платежей ближайших 30 дней.",
      points: commitmentPoints,
      maxPoints: 1,
      tone: commitmentPoints ? "strong" : "risk",
    },
    {
      key: "debt",
      label: "Долговая нагрузка",
      value: totalDebtMinor > 0 ? `${debtToLiquidAssets.toFixed(1)}×` : "Нет долга",
      detail: "Все обязательства относительно текущих свободных денег.",
      points: debtPoints,
      maxPoints: 1,
      tone: debtPoints ? "strong" : "attention",
    },
    {
      key: "plan",
      label: "План расходов",
      value: planShare === null ? "Не задан" : `${Math.round(planShare * 100)}%`,
      detail: planShare === null ? "Добавьте план, чтобы учитывать дисциплину расходов." : "Факт расходов относительно плана.",
      points: planPoints,
      maxPoints: 1,
      tone: planShare === null ? "attention" : planPoints ? "strong" : "risk",
    },
    {
      key: "reconciliation",
      label: "Сверка",
      value: reconciliationComplete ? "Завершена" : "Ожидает",
      detail: data.reconciliation.nextAction,
      points: reconciliationPoints,
      maxPoints: 1,
      tone: reconciliationComplete ? "strong" : "attention",
    },
    {
      key: "quality",
      label: "Полнота данных",
      value: dataComplete ? "Полная" : "Частичная",
      detail: dataComplete ? "Курсы валют и операции доступны для расчёта." : "Часть данных или курсов требует проверки.",
      points: dataPoints,
      maxPoints: 1,
      tone: dataComplete ? "strong" : "attention",
    },
  ];

  const risks: HealthRisk[] = [];
  if (runwayDays < 30) {
    const probability = runwayDays < 14 ? 5 : 3;
    risks.push({
      id: "reserve",
      title: "Короткий резерв ликвидности",
      detail: `Текущий резерв покрывает около ${runwayDays} дней текущих расходов.`,
      probability,
      impact: 4,
      score: probability * 4,
      tone: riskTone(probability * 4),
      action: "Зафиксируйте минимальный неприкосновенный остаток и перенесите необязательные траты.",
    });
  }
  if (monthlyNetMinor < 0) {
    risks.push({
      id: "cashflow",
      title: "Расходы опережают доходы",
      detail: "За выбранный период чистый денежный поток отрицательный.",
      probability: 4,
      impact: 4,
      score: 16,
      tone: "red",
      action: "Проверьте крупнейшие категории и ближайшие обязательства до следующего дохода.",
    });
  }
  if (Number.isFinite(commitmentCoverage) && commitmentCoverage < 1) {
    risks.push({
      id: "commitments",
      title: "Ближайшие платежи не покрыты",
      detail: "Известные обязательства ближайших 30 дней превышают свободные деньги.",
      probability: 4,
      impact: 5,
      score: 20,
      tone: "red",
      action: "Согласуйте порядок платежей, даты доходов и вариант переноса до наступления срока.",
    });
  }
  if (debtToLiquidAssets > 1.5) {
    risks.push({
      id: "debt",
      title: "Высокая долговая нагрузка",
      detail: "Общий долг заметно превышает свободные деньги семьи.",
      probability: 3,
      impact: 4,
      score: 12,
      tone: "yellow",
      action: "Вынесите график погашения на план и не принимайте новый долг без проверки покрытия.",
    });
  }
  if (planShare !== null && planShare > 1) {
    risks.push({
      id: "plan",
      title: "Расходы выше плана",
      detail: `Факт превышает месячный ориентир на ${Math.round((planShare - 1) * 100)}%.`,
      probability: 3,
      impact: 3,
      score: 9,
      tone: "yellow",
      action: "Сверьте отклонения по категориям и обновите план только после объяснения причины.",
    });
  }
  if (!risks.length) {
    risks.push({
      id: "monitoring",
      title: "Режим наблюдения",
      detail: "Автоматические критические сигналы за выбранный период не найдены.",
      probability: 1,
      impact: 1,
      score: 1,
      tone: "green",
      action: "Пересматривайте оценку после крупных операций, новых обязательств и смены плана.",
    });
  }

  const assetGroups: FinancialHealth["assetMix"] = [
    { key: "operating", label: "Рабочие деньги", amountMinor: 0, share: 0 },
    { key: "savings", label: "Накопления", amountMinor: 0, share: 0 },
    { key: "cash", label: "Наличные", amountMinor: 0, share: 0 },
  ];
  data.accounts.forEach((account) => {
    const group = assetGroups.find((item) => item.key === account.group);
    if (!group) return;
    group.amountMinor += account.convertedBalanceMinor ?? (account.currency === data.availableMoney.currency ? account.balanceMinor : 0);
  });
  const assetTotal = assetGroups.reduce((sum, item) => sum + Math.max(0, item.amountMinor), 0) || 1;
  assetGroups.forEach((item) => { item.share = Math.round((Math.max(0, item.amountMinor) / assetTotal) * 100); });

  const previousMinor = data.availableMoney.amountMinor - data.availableMoney.changeMinor;
  const changePercent = previousMinor > 0 ? (data.availableMoney.changeMinor / previousMinor) * 100 : null;
  const label = healthLabel(score);
  const scheduledNetMinor = forecasted.income - forecasted.expense;
  const forecastBase = data.availableMoney.amountMinor + Math.round(dailyNetMinor * 90) + scheduledNetMinor;
  const insights = [
    `Горизонтально: свободные деньги ${data.availableMoney.changeMinor >= 0 ? "выросли" : "снизились"} относительно начала периода.`,
    `Вертикально: ${[...assetGroups].sort((left, right) => right.share - left.share)[0].label.toLowerCase()} занимают наибольшую долю ликвидных средств.`,
    upcomingCommitmentsMinor > 0
      ? "В ближайшие 30 дней есть запланированные обязательные платежи."
      : "На ближайшие 30 дней обязательных платежей в календаре не найдено.",
  ];

  return {
    score,
    ...label,
    metrics,
    runwayDays,
    upcomingCommitmentsMinor,
    knownIncomeMinor: forecasted.income,
    knownExpenseMinor: forecasted.expense,
    forecast: {
      horizonDays: 90,
      dailyNetMinor,
      cautiousMinor: data.availableMoney.amountMinor + Math.round(dailyNetMinor * 90 * 0.55) + scheduledNetMinor,
      baseMinor: forecastBase,
      optimisticMinor: data.availableMoney.amountMinor + Math.round(dailyNetMinor * 90 * 1.2) + scheduledNetMinor,
      scheduledNetMinor,
    },
    risks: risks.sort((left, right) => right.score - left.score),
    horizontal: {
      currentMinor: data.availableMoney.amountMinor,
      previousMinor,
      changeMinor: data.availableMoney.changeMinor,
      changePercent,
    },
    assetMix: assetGroups,
    insights,
  };
}
