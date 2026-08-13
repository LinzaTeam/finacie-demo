import { describe, expect, it } from "vitest";
import { demoDashboard } from "../data/demo";
import { deriveFinancialHealth } from "./financialHealth";

describe("deriveFinancialHealth", () => {
  it("derives a bounded score, 90-day scenarios, and an actionable risk register", () => {
    const health = deriveFinancialHealth(demoDashboard);

    expect(health.score).toBeGreaterThanOrEqual(1);
    expect(health.score).toBeLessThanOrEqual(10);
    expect(health.metrics).toHaveLength(7);
    expect(health.forecast.horizonDays).toBe(90);
    expect(health.forecast.optimisticMinor).toBeGreaterThan(health.forecast.cautiousMinor);
    expect(health.risks[0].action).toBeTruthy();
    expect(health.assetMix.reduce((sum, item) => sum + item.share, 0)).toBeGreaterThan(0);
  });

  it("raises a red risk when known commitments exceed free money", () => {
    const health = deriveFinancialHealth({
      ...demoDashboard,
      availableMoney: { ...demoDashboard.availableMoney, amountMinor: 1_000_00 },
    });

    expect(health.risks.some((risk) => risk.id === "commitments" && risk.tone === "red")).toBe(true);
  });
});
