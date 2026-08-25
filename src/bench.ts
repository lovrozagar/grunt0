import { readFileSync } from "node:fs";
import { join } from "node:path";
import { kitRoot } from "./paths.ts";
import { isTwoSlot, type Provider } from "./pins.ts";

export type PriceRow = { in: number; out: number };
export type PricesFile = {
  spawn_tax: number;
  disclaimer: string;
  encoding: string;
  prices: Record<string, Record<string, PriceRow>>;
};

export type PathName = "naive-general" | "naive-grunt-only" | "grunt0-cascade";

export type PathReport = {
  name: PathName;
  tokens: number;
  usd: number;
  prefix: number;
  tool_dumps: number;
  spawn_tax: number;
  n_spawns: number;
  child_bodies: number;
  price_tier: string;
};

export type BenchReport = {
  ok: boolean;
  provider: string;
  encoding: string;
  disclaimer: string;
  formula: string;
  paths: PathReport[];
};

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function loadPrices(): PricesFile {
  return JSON.parse(readFileSync(join(kitRoot(), "bench", "prices.json"), "utf8")) as PricesFile;
}

export function loadFixture(name: string): string {
  return readFileSync(join(kitRoot(), "bench", "fixtures", name), "utf8");
}

function priceFor(
  prices: PricesFile,
  provider: Provider,
  tier: "grunt" | "sergeant" | "general",
): PriceRow {
  const row = prices.prices[provider]?.[tier];
  if (!row) throw new Error(`no price for ${provider}/${tier}`);
  if (tier === "sergeant" && isTwoSlot(provider)) {
    const gen = prices.prices[provider]?.general;
    if (!gen) throw new Error(`no general price for 2-slot ${provider}`);
    return gen;
  }
  return row;
}

function usd(tokens: number, row: PriceRow): number {
  const out = Math.ceil(tokens * 0.1);
  return (tokens * row.in + out * row.out) / 1_000_000;
}

const TINY_PREFIX = `# Agent rules\nParent = grunt. Cheap tools + rtk. Escalate by spawn.\n`;
const FAT_PREFIX = TINY_PREFIX.repeat(80);

export function computePaths(provider: Provider = "grok"): {
  report: BenchReport;
  prices: PricesFile;
} {
  const prices = loadPrices();
  const raw = loadFixture("search-raw.txt");
  const rtk = loadFixture("search-rtk.txt");
  const implementBody = loadFixture("implement-body.txt");
  const spawnTax = prices.spawn_tax;
  const generalRow = priceFor(prices, provider, "general");
  const gruntRow = priceFor(prices, provider, "grunt");
  const sergeantRow = priceFor(prices, provider, "sergeant");

  function path(
    name: PathName,
    opts: {
      prefix: string;
      dumps: string;
      n_spawns: number;
      child: string;
      row: PriceRow;
      price_tier: string;
    },
  ): PathReport {
    const prefix = estimateTokens(opts.prefix);
    const tool_dumps = estimateTokens(opts.dumps);
    const child_bodies = estimateTokens(opts.child);
    const tokens = prefix + tool_dumps + spawnTax * opts.n_spawns + child_bodies;
    return {
      name,
      tokens,
      usd: usd(tokens, opts.row),
      prefix,
      tool_dumps,
      spawn_tax: spawnTax,
      n_spawns: opts.n_spawns,
      child_bodies,
      price_tier: opts.price_tier,
    };
  }

  const naiveGeneral = path("naive-general", {
    prefix: FAT_PREFIX,
    dumps: raw,
    n_spawns: 0,
    child: "",
    row: generalRow,
    price_tier: "general",
  });
  const naiveGrunt = path("naive-grunt-only", {
    prefix: TINY_PREFIX,
    dumps: rtk,
    n_spawns: 0,
    child: "",
    row: gruntRow,
    price_tier: "grunt",
  });
  const cascade = path("grunt0-cascade", {
    prefix: TINY_PREFIX,
    dumps: rtk,
    n_spawns: 2,
    child: implementBody,
    row: sergeantRow,
    price_tier: isTwoSlot(provider) ? "general (2-slot sergeant alias)" : "sergeant",
  });

  const isolationTokens = estimateTokens(TINY_PREFIX) + estimateTokens(rtk) + spawnTax;
  const generalEatsRaw = estimateTokens(FAT_PREFIX) + estimateTokens(raw);
  const searchCascade = estimateTokens(rtk);
  const searchNaive = estimateTokens(raw);

  const ok =
    cascade.tokens < naiveGeneral.tokens &&
    cascade.usd < naiveGeneral.usd &&
    isolationTokens < generalEatsRaw &&
    searchCascade <= searchNaive * 0.5;

  return {
    prices,
    report: {
      ok,
      provider,
      encoding: prices.encoding,
      disclaimer: prices.disclaimer,
      formula: "tokens(path) = prefix + tool_dumps + spawn_tax * n_spawns + child_bodies",
      paths: [naiveGeneral, naiveGrunt, cascade],
    },
  };
}

export function runBench(opts: { json: boolean; provider?: Provider }): { ok: boolean } {
  const { report, prices } = computePaths(opts.provider ?? "grok");
  if (opts.json) {
    process.stdout.write(JSON.stringify({ ...report, pricesUsed: prices.prices }, null, 2) + "\n");
  } else {
    process.stdout.write(`${report.formula}\n${report.disclaimer}\n`);
    for (const p of report.paths) {
      process.stdout.write(
        `${p.name} tokens=${p.tokens} usd=${p.usd.toFixed(6)} tier=${p.price_tier}\n`,
      );
    }
    process.stdout.write(
      report.ok ? "cascade beats naive-general\n" : "cascade does not beat naive-general\n",
    );
  }
  return { ok: report.ok };
}
