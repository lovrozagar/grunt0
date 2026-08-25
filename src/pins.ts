export const PROVIDERS = ["claude", "grok", "codex", "antigravity", "gemini"] as const;
export type Provider = (typeof PROVIDERS)[number];
export type Tier = "grunt" | "sergeant" | "general";

export type Pin = {
  model: string;
  effort?: string;
  sandbox?: string;
};

const TWO_SLOT = new Set<string>(["grok", "codex", "antigravity", "gemini"]);

export const TIERS: Record<Tier, Record<Provider, Pin>> = {
  grunt: {
    claude: { model: "haiku" },
    grok: { model: "grok-4.5", effort: "low" },
    codex: { model: "gpt-5.4-mini", effort: "low", sandbox: "read-only" },
    antigravity: { model: "gemini-2.5-flash" },
    gemini: { model: "gemini-2.5-flash" },
  },
  sergeant: {
    claude: { model: "sonnet" },
    grok: { model: "grok-4.6", effort: "medium" },
    codex: { model: "gpt-5.4", effort: "medium", sandbox: "workspace-write" },
    antigravity: { model: "gemini-2.5-pro" },
    gemini: { model: "gemini-2.5-pro" },
  },
  general: {
    claude: { model: "opus" },
    grok: { model: "grok-4.6", effort: "high" },
    codex: { model: "gpt-5.4", effort: "medium", sandbox: "workspace-write" },
    antigravity: { model: "gemini-2.5-pro" },
    gemini: { model: "gemini-2.5-pro" },
  },
};

const TIER_ALIASES: Record<string, Tier> = {
  grunt: "grunt",
  sergeant: "sergeant",
  general: "general",
  router: "grunt",
  medium: "sergeant",
  think: "sergeant",
  implementer: "sergeant",
  deep: "general",
  architect: "general",
  explore: "grunt",
};

export function isTwoSlot(provider: string): boolean {
  return TWO_SLOT.has(provider);
}

export function isInherit(pin: Pin | null | undefined): boolean {
  return !pin?.model || pin.model === "inherit";
}

export function isExec(meta: { exec?: string } = {}): boolean {
  const v = String(meta.exec ?? "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "yes" || v === "1";
}

export function providerPin(tier: string, provider: string): Pin | null {
  const row = TIERS[tier as Tier];
  if (!row) return null;
  const pin = row[provider as Provider];
  return pin ?? null;
}

export function resolveAgentTier(meta: { tier?: string; name?: string } = {}): Tier {
  const rawTier = String(meta.tier ?? "")
    .trim()
    .toLowerCase();
  if (rawTier) {
    const mapped = TIER_ALIASES[rawTier];
    if (mapped) return mapped;
    throw new Error(`unknown agent tier: ${meta.tier}`);
  }
  const rawName = String(meta.name ?? "")
    .trim()
    .toLowerCase();
  if (rawName) {
    const mapped = TIER_ALIASES[rawName];
    if (mapped) return mapped;
    throw new Error(`unknown agent name: ${meta.name}`);
  }
  throw new Error("resolveAgentTier: missing tier and name");
}

/** Promote a grunt sandbox from read-only to workspace-write when exec is set. Not a second model id. */
export function sandboxFor(pin: Pin, exec: boolean): string | undefined {
  if (exec && pin.sandbox === "read-only") return "workspace-write";
  return pin.sandbox;
}
