import type { DashboardSource } from "../api/dashboard";
import type { ThemeMode } from "../components/PageChrome";
import type { DashboardData } from "../types";

export type FinancePageProps = {
  data: DashboardData;
  source: DashboardSource;
  theme: ThemeMode;
  onThemeToggle: () => void;
  onNewOperation: () => void;
  onSearch: () => void;
  activeUser: string;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  activeUserKey?: string;
  canWrite?: boolean;
  simpleMode?: boolean;
  onSimpleModeChange?: (enabled: boolean) => void;
  onDataChange?: (data: DashboardData) => void;
  onRefresh?: () => void;
};
