import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  existsSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { copyKit } from "../src/kit.ts";
import { runGenerate } from "../src/generate.ts";
import {
  applyOverlay,
  buildOverlayFiles,
  DEFAULT_AGENTS,
  FORBIDDEN_AGENT_NAMES,
  overlayContainsInherit,
  twoSlotSergeantIsGeneral,
} from "../src/overlay.ts";
import { providerPin } from "../src/pins.ts";

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "grunt0-ov-"));
  copyKit(dir);
  return dir;
}

describe("overlay after real rulesync generate", () => {
  test("pins three agents, no inherit, no spawn_subagent in children, grunt tools", async () => {
    const dir = tempProject();
    try {
      await runGenerate({ inputRoot: dir, outputRoot: dir });
      const files = applyOverlay({ sourceRoot: dir, outputRoot: dir });
      expect(overlayContainsInherit(files)).toBe(false);
      const names = new Set(
        readdirSync(join(dir, ".claude", "agents"))
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.replace(/\.md$/, "")),
      );
      expect([...names].sort()).toEqual([...DEFAULT_AGENTS].sort());
      for (const bad of FORBIDDEN_AGENT_NAMES) {
        expect(names.has(bad)).toBe(false);
        expect(existsSync(join(dir, ".claude", "agents", `${bad}.md`))).toBe(false);
        expect(existsSync(join(dir, ".grok", "agents", `${bad}.md`))).toBe(false);
        expect(existsSync(join(dir, ".grok", "roles", `${bad}.toml`))).toBe(false);
      }
      expect(existsSync(join(dir, ".agents", "agents", "grunt", "agent.md"))).toBe(false);
      expect(existsSync(join(dir, ".agents", "agents", "grunt.md"))).toBe(true);

      const gruntClaude = readFileSync(join(dir, ".claude", "agents", "grunt.md"), "utf8");
      expect(gruntClaude).toMatch(/model: haiku/);
      expect(gruntClaude).toMatch(/tools: \[Read, Grep, Glob, Bash, WebSearch, WebFetch\]/);
      expect(gruntClaude).toMatch(/disallowedTools: \[Write, Edit\]/);
      expect(gruntClaude).not.toMatch(/haiku.*sonnet/);

      for (const child of ["sergeant", "general"] as const) {
        const claude = readFileSync(join(dir, ".claude", "agents", `${child}.md`), "utf8");
        const grok = readFileSync(join(dir, ".grok", "agents", `${child}.md`), "utf8");
        expect(claude).not.toMatch(/spawn_subagent/);
        expect(grok).not.toMatch(/spawn_subagent/);
        expect(grok).not.toMatch(/haiku|sonnet|opus/);
      }

      const grokGrunt = readFileSync(join(dir, ".grok", "agents", "grunt.md"), "utf8");
      expect(grokGrunt).toMatch(/model: grok-4.5/);
      expect(grokGrunt).toMatch(/agents_md: false/);
      expect(grokGrunt).not.toMatch(/permission_mode: plan/);

      const gruntRole = readFileSync(join(dir, ".grok", "roles", "grunt.toml"), "utf8");
      const sgtRole = readFileSync(join(dir, ".grok", "roles", "sergeant.toml"), "utf8");
      const genRole = readFileSync(join(dir, ".grok", "roles", "general.toml"), "utf8");
      expect(gruntRole).toMatch(/default_capability_mode = "execute"/);
      expect(sgtRole).toMatch(/default_capability_mode = "all"/);
      expect(genRole).toMatch(/default_capability_mode = "all"/);
      expect(sgtRole).not.toMatch(/default_capability_mode = "execute"/);

      const gemini = readFileSync(join(dir, ".gemini", "agents", "grunt.md"), "utf8");
      expect(gemini).toMatch(/shape snapshot/);

      const tree = files.map((f) => f.content).join("\n");
      expect(tree).not.toMatch(/\binherit\b/);

      expect(twoSlotSergeantIsGeneral("grok")).toBe(true);
      expect(providerPin("sergeant", "grok")?.model).toBe(providerPin("general", "grok")?.model);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("buildOverlayFiles does not walk .claude/commands", () => {
    const dir = tempProject();
    try {
      mkdirSync(join(dir, ".claude", "commands"), { recursive: true });
      writeFileSync(join(dir, ".claude", "commands", "nope.md"), "should not be read");
      const files = buildOverlayFiles(dir);
      expect(files.some((f) => f.path.includes("nope"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
