import { describe, expect, it } from "vitest";
import { formatMoney, formatSignedMoney } from "./format";

describe("money formatting", () => {
  it("formats integer minor units as Russian rubles", () => {
    const result = formatMoney(123_456_78, "RUB");

    expect(result.replace(/\u00a0|\u202f/g, " ")).toBe("123 456,78 ₽");
  });

  it("keeps the sign separate from the absolute formatted value", () => {
    const positive = formatSignedMoney(18_942_10, "RUB").replace(/\u00a0|\u202f/g, " ");
    const negative = formatSignedMoney(-8_400_00, "RUB").replace(/\u00a0|\u202f/g, " ");

    expect(positive).toBe("+18 942,1 ₽");
    expect(negative).toBe("−8 400 ₽");
  });
});
