export const routeDefinitions = [
  { key: "overview", label: "Сегодня", title: "Сегодня" },
  { key: "operations", label: "Операции", title: "Операции" },
  { key: "analytics", label: "Аналитика", title: "Аналитика" },
  { key: "plan", label: "План", title: "План" },
  { key: "goals", label: "Цели", title: "Цели" },
  { key: "search", label: "Поиск", title: "Поиск" },
  { key: "accounts", label: "Счета", title: "Счета" },
  { key: "obligations", label: "Обязательства", title: "Обязательства" },
  { key: "reconciliation", label: "Сверка", title: "Сверка" },
  { key: "settings", label: "Настройки", title: "Настройки" },
] as const;

export type AppRoute = (typeof routeDefinitions)[number]["key"];

const routeKeys = new Set<AppRoute>(routeDefinitions.map(({ key }) => key));

export function routeFromHash(hash: string): AppRoute {
  const candidate = hash.replace(/^#\/?/, "").split("?")[0] as AppRoute;
  return routeKeys.has(candidate) ? candidate : "overview";
}

export function routeHref(route: AppRoute): string {
  return `#/${route}`;
}

export function routeTitle(route: AppRoute): string {
  return routeDefinitions.find(({ key }) => key === route)?.title ?? "Сегодня";
}
