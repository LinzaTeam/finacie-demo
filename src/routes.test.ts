import { describe, expect, it } from "vitest";
import { routeFromHash, routeHref, routeTitle } from "./routes";

describe("app routes", () => {
  it("maps every product section to a standalone hash route", () => {
    expect(routeFromHash("#/operations")).toBe("operations");
    expect(routeFromHash("#/accounts")).toBe("accounts");
    expect(routeFromHash("#/obligations")).toBe("obligations");
    expect(routeFromHash("#/plan")).toBe("plan");
    expect(routeFromHash("#/goals")).toBe("goals");
    expect(routeFromHash("#/search")).toBe("search");
    expect(routeFromHash("#/reconciliation")).toBe("reconciliation");
    expect(routeFromHash("#/settings")).toBe("settings");
  });

  it("falls back to overview for invalid routes", () => {
    expect(routeFromHash("#page-content")).toBe("overview");
    expect(routeFromHash("")).toBe("overview");
  });

  it("creates stable links and titles", () => {
    expect(routeHref("accounts")).toBe("#/accounts");
    expect(routeTitle("reconciliation")).toBe("Сверка");
  });
});
