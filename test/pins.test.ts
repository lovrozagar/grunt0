import { describe, expect, test } from "vitest";
import {
  PROVIDERS,
  TIERS,
  isExec,
  isInherit,
  isTwoSlot,
  providerPin,
  resolveAgentTier,
  sandboxFor,
} from "../src/pins.ts";

describe("providers and tiers", () => {
  test("PROVIDERS are the five drivers", () => {
    expect([...PROVIDERS]).toEqual(["claude", "grok", "codex", "antigravity", "gemini"]);
  });

  test("3-slot claude models are distinct", () => {
    const g = providerPin("grunt", "claude");
    const s = providerPin("sergeant", "claude");
    const d = providerPin("general", "claude");
    expect(g?.model).toBe("haiku");
    expect(s?.model).toBe("sonnet");
    expect(d?.model).toBe("opus");
    expect(new Set([g?.model, s?.model, d?.model]).size).toBe(3);
  });

  test("2-slot sergeant.model === general.model", () => {
    for (const p of ["grok", "codex", "antigravity", "gemini"] as const) {
      expect(providerPin("sergeant", p)?.model).toBe(providerPin("general", p)?.model);
    }
  });

  test("every provider has explicit grunt+general, never inherit", () => {
    for (const p of PROVIDERS) {
      const g = providerPin("grunt", p);
      const d = providerPin("general", p);
      expect(g?.model).toBeTruthy();
      expect(d?.model).toBeTruthy();
      expect(isInherit(g)).toBe(false);
      expect(isInherit(d)).toBe(false);
      expect(g?.model).not.toBe("inherit");
      expect(d?.model).not.toBe("inherit");
    }
  });

  test("grok efforts", () => {
    expect(providerPin("grunt", "grok")?.effort).toBe("low");
    expect(providerPin("sergeant", "grok")?.effort).toBe("medium");
    expect(providerPin("general", "grok")?.effort).toBe("high");
  });

  test("codex grunt pin sandbox read-only + low effort", () => {
    expect(providerPin("grunt", "codex")).toEqual({
      model: "gpt-5.4-mini",
      effort: "low",
      sandbox: "read-only",
    });
  });

  test("codex sergeant and general pins are identical", () => {
    expect(providerPin("sergeant", "codex")).toEqual(providerPin("general", "codex"));
    expect(providerPin("sergeant", "codex")).toEqual({
      model: "gpt-5.4",
      effort: "medium",
      sandbox: "workspace-write",
    });
  });

  test("2-slot grok ids", () => {
    expect(providerPin("grunt", "grok")?.model).toBe("grok-4.5");
    expect(providerPin("general", "grok")?.model).toBe("grok-4.6");
  });

  test("2-slot antigravity and gemini share flash/pro", () => {
    expect(providerPin("grunt", "antigravity")?.model).toBe("gemini-2.5-flash");
    expect(providerPin("general", "antigravity")?.model).toBe("gemini-2.5-pro");
    expect(providerPin("grunt", "gemini")?.model).toBe(providerPin("grunt", "antigravity")?.model);
    expect(providerPin("general", "gemini")?.model).toBe(
      providerPin("general", "antigravity")?.model,
    );
  });

  test("2-slot codex ids", () => {
    expect(providerPin("grunt", "codex")?.model).toBe("gpt-5.4-mini");
    expect(providerPin("general", "codex")?.model).toBe("gpt-5.4");
  });

  test("pin matrix: no inherit anywhere in TIERS", () => {
    for (const tier of Object.keys(TIERS) as (keyof typeof TIERS)[]) {
      for (const p of PROVIDERS) {
        expect(isInherit(TIERS[tier][p])).toBe(false);
      }
    }
  });
});

describe("isTwoSlot", () => {
  test("claude is 3-slot", () => {
    expect(isTwoSlot("claude")).toBe(false);
  });
  test("others are 2-slot", () => {
    expect(isTwoSlot("grok")).toBe(true);
    expect(isTwoSlot("codex")).toBe(true);
    expect(isTwoSlot("antigravity")).toBe(true);
    expect(isTwoSlot("gemini")).toBe(true);
  });
  test("unknown provider is not two-slot", () => {
    expect(isTwoSlot("nope")).toBe(false);
  });
});

describe("isInherit", () => {
  test("true for missing pin, empty model, inherit", () => {
    expect(isInherit(null)).toBe(true);
    expect(isInherit(undefined)).toBe(true);
    expect(isInherit({ model: "" })).toBe(true);
    expect(isInherit({ model: "inherit" })).toBe(true);
  });
  test("false for real model", () => {
    expect(isInherit({ model: "haiku" })).toBe(false);
  });
});

describe("isExec", () => {
  test("true for true|yes|1", () => {
    expect(isExec({ exec: "true" })).toBe(true);
    expect(isExec({ exec: "YES" })).toBe(true);
    expect(isExec({ exec: "1" })).toBe(true);
    expect(isExec({ exec: " True " })).toBe(true);
  });
  test("false otherwise", () => {
    expect(isExec({})).toBe(false);
    expect(isExec({ exec: "false" })).toBe(false);
    expect(isExec({ exec: "" })).toBe(false);
  });
});

describe("providerPin", () => {
  test("null for unknown provider", () => {
    expect(providerPin("grunt", "nope")).toBeNull();
  });
  test("null for unknown tier", () => {
    expect(providerPin("medium", "claude")).toBeNull();
  });
  test("never returns inherit", () => {
    for (const p of PROVIDERS) {
      for (const t of ["grunt", "sergeant", "general"]) {
        const pin = providerPin(t, p);
        expect(pin).not.toBeNull();
        expect(pin?.model).not.toBe("inherit");
      }
    }
  });
});

describe("resolveAgentTier", () => {
  test("explicit shipped tiers", () => {
    expect(resolveAgentTier({ tier: "grunt" })).toBe("grunt");
    expect(resolveAgentTier({ tier: "sergeant" })).toBe("sergeant");
    expect(resolveAgentTier({ tier: "general" })).toBe("general");
  });
  test("legacy tier aliases", () => {
    expect(resolveAgentTier({ tier: "router" })).toBe("grunt");
    expect(resolveAgentTier({ tier: "medium" })).toBe("sergeant");
    expect(resolveAgentTier({ tier: "think" })).toBe("sergeant");
    expect(resolveAgentTier({ tier: "implementer" })).toBe("sergeant");
    expect(resolveAgentTier({ tier: "deep" })).toBe("general");
    expect(resolveAgentTier({ tier: "architect" })).toBe("general");
    expect(resolveAgentTier({ tier: "explore" })).toBe("grunt");
  });
  test("explicit tier wins over name", () => {
    expect(resolveAgentTier({ tier: "general", name: "grunt" })).toBe("general");
  });
  test("name map for shipped names", () => {
    expect(resolveAgentTier({ name: "grunt" })).toBe("grunt");
    expect(resolveAgentTier({ name: "sergeant" })).toBe("sergeant");
    expect(resolveAgentTier({ name: "general" })).toBe("general");
  });
  test("legacy name aliases", () => {
    expect(resolveAgentTier({ name: "router" })).toBe("grunt");
    expect(resolveAgentTier({ name: "implementer" })).toBe("sergeant");
    expect(resolveAgentTier({ name: "architect" })).toBe("general");
    expect(resolveAgentTier({ name: "explore" })).toBe("grunt");
  });
  test("throws on empty", () => {
    expect(() => resolveAgentTier({})).toThrow(/missing tier and name/);
  });
  test("throws on unknown name", () => {
    expect(() => resolveAgentTier({ name: "unknown-agent" })).toThrow(/unknown agent name/);
  });
  test("throws on unknown tier", () => {
    expect(() => resolveAgentTier({ tier: "colonel" })).toThrow(/unknown agent tier/);
  });
});

describe("sandboxFor", () => {
  test("promotes grunt read-only to workspace-write on exec", () => {
    const pin = providerPin("grunt", "codex");
    expect(pin).not.toBeNull();
    expect(sandboxFor(pin!, true)).toBe("workspace-write");
    expect(sandboxFor(pin!, false)).toBe("read-only");
  });
  test("leaves pins without sandbox unchanged", () => {
    expect(sandboxFor({ model: "haiku" }, true)).toBeUndefined();
  });
  test("does not change workspace-write", () => {
    expect(sandboxFor({ model: "gpt-5.4", sandbox: "workspace-write" }, true)).toBe(
      "workspace-write",
    );
  });
});
