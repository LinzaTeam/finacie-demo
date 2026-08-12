import { useCallback, useEffect, useState } from "react";
import { getDashboard, type DashboardSource } from "./api/dashboard";
import { demoSession, getOrCreateSession, type WebSession } from "./api/session";
import { createTransaction } from "./api/transactions";
import { BottomNavigation, Sidebar } from "./components/Navigation";
import { GlobalSearchDialog } from "./components/GlobalSearchDialog";
import type { ThemeMode } from "./components/PageChrome";
import { QuickAddSheet, type ParsedOperation } from "./components/QuickAddSheet";
import { EmptyDashboard, ErrorDashboard, LoadingDashboard } from "./components/States";
import { currentPeriodKey, dateForPeriod } from "./lib/period";
import { AccountsPage } from "./pages/AccountsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { GoalsPage } from "./pages/GoalsPage";
import { ObligationsPage } from "./pages/ObligationsPage";
import { OperationsPage } from "./pages/OperationsPage";
import { OverviewPage } from "./pages/OverviewPage";
import { PlanPage } from "./pages/PlanPage";
import { ReconciliationPage } from "./pages/ReconciliationPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { routeFromHash, routeHref, routeTitle, type AppRoute } from "./routes";
import type { DashboardData } from "./types";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: DashboardData; source: DashboardSource; session: WebSession | null };

function isEmptyDashboard(data: DashboardData): boolean {
  return (
    data.availableMoney.amountMinor === 0 &&
    data.accounts.length === 0 &&
    data.transactions.length === 0 &&
    data.obligations.length === 0
  );
}

function initialTheme(): ThemeMode {
  const saved = window.localStorage.getItem("financier-theme");
  return saved === "dark" ? "dark" : "light";
}

export function App() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [route, setRoute] = useState<AppRoute>(() => routeFromHash(window.location.hash));
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriodKey);

  useEffect(() => {
    if (!window.location.hash.startsWith("#/")) {
      window.history.replaceState(null, "", routeHref("overview"));
    }
    const onHashChange = () => {
      const nextRoute = routeFromHash(window.location.hash);
      setRoute(nextRoute);
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    document.title = `${routeTitle(route)} | Финансье`;
  }, [route]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "light" ? "#FFFDF5" : "#333333");
    window.localStorage.setItem("financier-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setQuickAddOpen(false);
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    getOrCreateSession(controller.signal)
      .then(async (session) => {
        const { data, source } = await getDashboard(selectedPeriod, controller.signal);
        setState({
          status: "ready",
          data,
          source,
          session: source === "demo" ? demoSession : session,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt, selectedPeriod]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => current === "light" ? "dark" : "light");
  }, []);
  const openQuickAdd = useCallback(() => {
    setSearchOpen(false);
    setQuickAddOpen(true);
  }, []);
  const closeQuickAdd = useCallback(() => setQuickAddOpen(false), []);
  const openSearch = useCallback(() => {
    setQuickAddOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const changePeriod = useCallback((period: string) => {
    setQuickAddOpen(false);
    setSearchOpen(false);
    setSelectedPeriod(period);
  }, []);

  const addDemoOperation = useCallback((operation: ParsedOperation) => {
    setState((current) => {
      if (current.status !== "ready" || current.source !== "demo") return current;
      const transaction: DashboardData["transactions"][number] = {
        id: `demo-${Date.now()}`,
        occurredAt: `${dateForPeriod(selectedPeriod)}T12:00:00+03:00`,
        title: operation.title,
        detail: operation.detail,
        kind: operation.kind,
        amountMinor: operation.amountMinor,
        currency: current.data.availableMoney.currency,
        status: "confirmed",
        actorName: current.data.people.find((person) => person.key === current.session?.user.key)?.name
          || current.session?.user.name
          || "Демо-профиль",
        actorKey: current.session?.user.key,
        subjectKey: operation.subjectKey || current.session?.user.key,
        subjectName: current.data.people.find((person) => person.key === operation.subjectKey)?.name
          || current.session?.user.name
          || "Участник",
        categoryKey: operation.categoryKey,
        counterpartyKey: operation.counterpartyKey,
        counterpartyName: operation.counterpartyName,
      };
      const isIncome = operation.kind === "income";
      const isExpense = operation.transactionKind === "card_payment"
        || operation.transactionKind === "transfer_to_person";
      return {
        ...current,
        data: {
          ...current.data,
          availableMoney: {
            ...current.data.availableMoney,
            amountMinor: current.data.availableMoney.amountMinor
              + (isIncome ? operation.amountMinor : isExpense ? -operation.amountMinor : 0),
          },
          month: {
            ...current.data.month,
            incomeMinor: current.data.month.incomeMinor + (isIncome ? operation.amountMinor : 0),
            expenseMinor: current.data.month.expenseMinor + (isExpense ? operation.amountMinor : 0),
          },
          transactions: [transaction, ...current.data.transactions],
        },
      };
    });
  }, [selectedPeriod]);

  const addOperation = useCallback(async (operation: ParsedOperation) => {
    if (state.status !== "ready") return;
    if (state.source === "demo") {
      addDemoOperation(operation);
      return;
    }
    const accountFrom = operation.accountFromId;
    const accountTo = operation.accountToId;
    if (operation.transactionKind === "income" && !accountTo) throw new Error("Destination account is required");
    if (operation.transactionKind !== "income" && !accountFrom) throw new Error("Source account is required");
    if (operation.transactionKind === "own_transfer" && !accountTo) throw new Error("Destination account is required");
    await createTransaction({
      op_date: dateForPeriod(selectedPeriod),
      kind: operation.transactionKind,
      amount_cents: operation.amountMinor,
      person_key: operation.subjectKey,
      ...(operation.transactionKind === "income"
        ? { account_to: accountTo, source: operation.sourceKey || "other" }
        : operation.transactionKind === "own_transfer"
          ? { account_from: accountFrom, account_to: accountTo }
        : {
            account_from: accountFrom,
            category: operation.categoryKey || "other",
            category_custom: (operation.categoryKey || "other") === "other" ? operation.title : undefined,
            expense_owner: "common",
          }),
      counterparty: operation.counterpartyName,
      counterparty_key: operation.counterpartyKey,
      counterparty_type: operation.counterpartyType,
      counterparty_recognition_source: operation.learnedFromHistory ? "history" : "explicit",
      counterparty_confidence: operation.confidence,
      note: operation.title,
    });
    setAttempt((value) => value + 1);
  }, [addDemoOperation, selectedPeriod, state]);

  const ready = state.status === "ready" ? state : null;
  const activePerson = ready?.data.people.find((person) => person.key === ready.session?.user.key);
  const obligationsTotal = ready?.data.obligations.reduce((sum, item) => sum + item.debtMinor, 0) ?? 0;
  const pageProps = ready ? {
    data: ready.data,
    source: ready.source,
    theme,
    onThemeToggle: toggleTheme,
    onNewOperation: openQuickAdd,
    onSearch: openSearch,
    activeUser: activePerson?.name || ready.session?.user.name || "Не выполнен вход",
    selectedPeriod,
    onPeriodChange: changePeriod,
    activeUserKey: ready.session?.user.key,
    canWrite: Boolean(ready.session?.capabilities.write),
    onDataChange: (data: DashboardData) => setState((current) => (
      current.status === "ready" ? { ...current, data } : current
    )),
    onRefresh: () => setAttempt((value) => value + 1),
  } : null;

  let page = null;
  if (pageProps) {
    switch (route) {
      case "operations": page = <OperationsPage {...pageProps} />; break;
      case "analytics": page = <AnalyticsPage {...pageProps} />; break;
      case "plan": page = <PlanPage {...pageProps} />; break;
      case "goals": page = <GoalsPage {...pageProps} />; break;
      case "search": page = <SearchPage {...pageProps} />; break;
      case "accounts": page = <AccountsPage {...pageProps} />; break;
      case "obligations": page = <ObligationsPage {...pageProps} />; break;
      case "reconciliation": page = <ReconciliationPage {...pageProps} />; break;
      case "settings": page = <SettingsPage {...pageProps} />; break;
      default: page = <OverviewPage {...pageProps} />;
    }
  }

  return (
    <div className="app-shell">
      <a
        href="#page-content"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          document.querySelector<HTMLElement>("#page-content")?.focus();
        }}
      >
        Перейти к содержанию
      </a>
      <Sidebar
        activeRoute={route}
        accounts={ready?.data.accounts}
        obligationsTotal={obligationsTotal}
        currency={ready?.data.availableMoney.currency}
        activeUser={ready?.session ? {
          name: activePerson?.name || ready.session.user.name,
          authMethod: ready.session.user.auth_method,
          avatarDataUrl: activePerson?.avatarDataUrl || ready.session.user.avatar_data_url,
          accentColor: activePerson?.accentColor || ready.session.user.accent_color,
        } : undefined}
      />
      <div className="content-shell">
        {state.status === "loading" ? <LoadingDashboard /> : null}
        {state.status === "error" ? <ErrorDashboard onRetry={() => setAttempt((value) => value + 1)} /> : null}
        {ready && isEmptyDashboard(ready.data) ? <EmptyDashboard /> : null}
        {ready && !isEmptyDashboard(ready.data) ? page : null}
      </div>
      <BottomNavigation activeRoute={route} />
      {ready ? (
        <GlobalSearchDialog open={searchOpen} data={ready.data} onClose={closeSearch} />
      ) : null}
      {ready ? (
        <QuickAddSheet
          open={quickAddOpen}
          source={ready.source}
          accounts={ready.data.accounts}
          categories={ready.data.categories}
          currency={ready.data.availableMoney.currency}
          canWrite={Boolean(ready.session?.capabilities.write)}
          actorName={activePerson?.name || ready.session?.user.name || "Не выполнен вход"}
          actorKey={ready.session?.user.key || ready.data.people[0]?.key || ""}
          people={ready.data.people}
          onClose={closeQuickAdd}
          onAdd={addOperation}
        />
      ) : null}
    </div>
  );
}
