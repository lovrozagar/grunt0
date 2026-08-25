import { mkdtempSync, readFileSync, readdirSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { copyKit } from "../src/kit.ts";
import { runGenerate } from "../src/generate.ts";
import { applyOverlay } from "../src/overlay.ts";

test("kit copy + generate twice is stable AGENTS.md; CLAUDE stub; three agents", async () => {
  const dir = mkdtempSync(join(tmpdir(), "grunt0-kit-"));
  try {
    copyKit(dir);
    const jsonc = readFileSync(join(dir, "rulesync.jsonc"), "utf8");
    expect(jsonc).toMatch(/agentsmd/);
    expect(jsonc).toMatch(/claudecode/);
    expect(jsonc).toMatch(/grokcli/);
    expect(jsonc).toMatch(/codexcli/);
    expect(jsonc).toMatch(/antigravity-cli/);
    expect(jsonc).not.toMatch(/geminicli/);
    expect(jsonc).not.toMatch(/"hooks"/);
    expect(jsonc).not.toMatch(/"mcp"/);
    expect(jsonc).toMatch(/gitignoreTargetsOnly/);

    const overview = readFileSync(join(dir, ".rulesync", "rules", "overview.md"), "utf8");
    expect(overview).not.toMatch(/claudecode/);
    expect(overview).toMatch(/Parent = \*\*grunt\*\*/);
    const claudeRule = readFileSync(join(dir, ".rulesync", "rules", "CLAUDE.md"), "utf8");
    expect(claudeRule).toMatch(/targets:\s*\n\s*-\s*claudecode/);
    expect(claudeRule.replace(/^---[\s\S]*?---/, "").trim()).toBe("@AGENTS.md");

    const names = readdirSync(join(dir, ".rulesync", "subagents")).map((f) =>
      f.replace(/\.md$/, ""),
    );
    expect(names.sort()).toEqual(["general", "grunt", "sergeant"]);
    for (const bad of ["explore", "router", "implementer", "architect"]) {
      expect(existsSync(join(dir, ".rulesync", "subagents", `${bad}.md`))).toBe(false);
    }

    const grunt = readFileSync(join(dir, ".rulesync", "subagents", "grunt.md"), "utf8");
    expect(grunt).toMatch(/claudecode:/);
    expect(grunt).toMatch(/tools: \[Read, Grep, Glob, Bash, WebSearch, WebFetch\]/);
    expect(grunt).toMatch(/spawn_subagent/);
    expect(grunt).toMatch(/resume_from/);
    const sgt = readFileSync(join(dir, ".rulesync", "subagents", "sergeant.md"), "utf8");
    const gen = readFileSync(join(dir, ".rulesync", "subagents", "general.md"), "utf8");
    expect(sgt).not.toMatch(/spawn_subagent/);
    expect(gen).not.toMatch(/spawn_subagent/);
    expect(sgt).toMatch(/need: grunt job:/);

    const cascade = readFileSync(join(dir, ".rulesync", "reference", "cascade.md"), "utf8");
    expect(cascade).toMatch(/need: grunt job:/);
    expect(cascade).toMatch(/resume_from/);
    expect(cascade).toMatch(/Pre-spawn/);

    await runGenerate({ inputRoot: dir, outputRoot: dir });
    const agents1 = readFileSync(join(dir, "AGENTS.md"), "utf8");
    await runGenerate({ inputRoot: dir, outputRoot: dir });
    const agents2 = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(agents1).toBe(agents2);
    expect(agents1.split("\n").length).toBeLessThanOrEqual(80);
    expect(agents1.toLowerCase()).not.toMatch(/superterse/);
    const claudeOut = readFileSync(join(dir, "CLAUDE.md"), "utf8");
    expect(claudeOut.trim()).toMatch(/@AGENTS\.md/);
    expect(claudeOut).not.toContain("Escalate by spawn");

    applyOverlay({ sourceRoot: dir, outputRoot: dir });
    expect(existsSync(join(dir, ".grok", "personas", "superterse.toml"))).toBe(true);

    const terse = join(dir, ".rulesync", "skills", "terse", "SKILL.md");
    const beforeOverview = readFileSync(join(dir, ".rulesync", "rules", "overview.md"), "utf8");
    writeFileSync(terse, readFileSync(terse, "utf8") + "\n# extra\n");
    expect(readFileSync(join(dir, ".rulesync", "rules", "overview.md"), "utf8")).toBe(
      beforeOverview,
    );
    await runGenerate({ inputRoot: dir, outputRoot: dir });
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8")).toBe(agents1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
