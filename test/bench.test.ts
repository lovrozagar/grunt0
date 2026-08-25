import { expect, test } from "vitest";
import { computePaths, estimateTokens, loadPrices } from "../src/bench.ts";
import { providerPin } from "../src/pins.ts";

test("chars/4 tokenizer", () => {
  expect(estimateTokens("")).toBe(0);
  expect(estimateTokens("abcd")).toBe(1);
});

test("cascade beats naive-general on grok; 2-slot sergeant priced at general", () => {
  const { report } = computePaths("grok");
  const naive = report.paths.find((p) => p.name === "naive-general");
  const cascade = report.paths.find((p) => p.name === "grunt0-cascade");
  expect(naive && cascade).toBeTruthy();
  expect(cascade!.tokens).toBeLessThan(naive!.tokens);
  expect(cascade!.usd).toBeLessThan(naive!.usd);
  expect(cascade!.price_tier).toMatch(/general/);
  expect(providerPin("sergeant", "grok")?.model).toBe(providerPin("general", "grok")?.model);
  expect(report.ok).toBe(true);
  expect(report.disclaimer).toMatch(/fixture gate/);
});

test("3-slot claude sergeant priced at sergeant row", () => {
  const { report, prices } = computePaths("claude");
  const cascade = report.paths.find((p) => p.name === "grunt0-cascade");
  expect(cascade?.price_tier).toBe("sergeant");
  expect(prices.prices.claude?.sergeant?.in).not.toBe(prices.prices.claude?.general?.in);
});

test("prices file documents encoding", () => {
  const p = loadPrices();
  expect(p.encoding).toMatch(/chars\/4/);
  expect(p.disclaimer).toMatch(/not a vendor-billing claim/);
});
