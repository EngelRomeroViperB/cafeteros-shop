import { describe, it, expect } from "vitest";
import { formatCOP, slugify } from "./format";

describe("formatCOP", () => {
  it("formats a round number", () => {
    const result = formatCOP(150000);
    // Should contain the number with COP currency formatting
    expect(result).toContain("150.000");
  });

  it("formats zero", () => {
    const result = formatCOP(0);
    expect(result).toContain("0");
  });

  it("formats large numbers with thousand separators", () => {
    const result = formatCOP(1234567);
    expect(result).toContain("1.234.567");
  });

  it("returns consistent results (memoized formatter)", () => {
    expect(formatCOP(99000)).toBe(formatCOP(99000));
  });
});

describe("slugify", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(slugify("Camiseta Local")).toBe("camiseta-local");
  });

  it("removes accents/diacritics", () => {
    expect(slugify("Selección Colombia")).toBe("seleccion-colombia");
  });

  it("removes special characters", () => {
    expect(slugify("Camiseta @Home! 2026")).toBe("camiseta-home-2026");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("collapses consecutive non-alphanumeric chars into single dash", () => {
    expect(slugify("a   b---c")).toBe("a-b-c");
  });

  it("handles unicode characters like ñ", () => {
    expect(slugify("Año Nuevo")).toBe("ano-nuevo");
  });
});
