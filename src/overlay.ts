import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { parseAgentSource } from "./parse.ts";
import {
  isExec,
  isTwoSlot,
  providerPin,
  resolveAgentTier,
  sandboxFor,
  type Pin,
  type Provider,
  type Tier,
} from "./pins.ts";
import { HOOKS_DIR_PACKAGE_JSON, RTK_HOOK_JSON, stdinHookSource } from "./hooks-files.ts";

export const DEFAULT_AGENTS = ["grunt", "sergeant", "general"] as const;
export const FORBIDDEN_AGENT_NAMES = [
  "router",
  "explore",
  "implementer",
  "architect",
  "schema-author",
  "page-author",
  "chart-author",
  "component-author",
  "record-crud",
  "trigger-author",
  "interaction-author",
  "platform-prompt",
  "version-control",
] as const;

export type OverlayFile = { path: string; content: string };

function readSubagents(sourceRoot: string): { name: string; file: string; content: string }[] {
  const dir = join(sourceRoot, ".rulesync", "subagents");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => ({
      name: f.replace(/\.md$/, ""),
      file: f,
      content: readFileSync(join(dir, f), "utf8"),
    }));
}

function mdFrontmatter(
  fields: Record<string, string | boolean | string[] | undefined>,
  body: string,
): string {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) lines.push(`${k}: [${v.join(", ")}]`);
    else if (typeof v === "boolean") lines.push(`${k}: ${v}`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push("---", "", body.replace(/\s+$/, "") + "\n");
  return lines.join("\n");
}

function tomlEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function tomlMultiline(s: string): string {
  return `"""\n${s.replace(/"""/g, '\\"\\"\\"')}\n"""`;
}

function roleToml(opts: {
  description: string;
  model: string;
  effort?: string;
  capability: string;
}): string {
  const lines = [
    `description = "${tomlEscape(opts.description)}"`,
    `default_capability_mode = "${opts.capability}"`,
    `model = "${opts.model}"`,
  ];
  if (opts.effort !== undefined && opts.effort !== "") {
    lines.splice(2, 0, `reasoning_effort = "${opts.effort}"`);
  }
  return lines.join("\n") + "\n";
}

function agentToml(opts: {
  name: string;
  description: string;
  model: string;
  effort?: string;
  sandbox?: string;
  body: string;
}): string {
  const lines = [
    `name = "${tomlEscape(opts.name)}"`,
    `description = "${tomlEscape(opts.description)}"`,
    `model = "${opts.model}"`,
  ];
  if (opts.effort !== undefined && opts.effort !== "") {
    lines.push(`model_reasoning_effort = "${opts.effort}"`);
  }
  if (opts.sandbox !== undefined && opts.sandbox !== "") {
    lines.push(`sandbox_mode = "${opts.sandbox}"`);
  }
  lines.push(`developer_instructions = ${tomlMultiline(opts.body)}`);
  return lines.join("\n") + "\n";
}

function capability(tier: Tier): string {
  return tier === "grunt" ? "execute" : "all";
}

function pinOrThrow(tier: Tier, provider: Provider): Pin {
  const pin = providerPin(tier, provider);
  if (!pin?.model || pin.model === "inherit") {
    throw new Error(`missing pin for ${tier}/${provider}`);
  }
  return pin;
}

export function buildOverlayFiles(sourceRoot: string): OverlayFile[] {
  const files: OverlayFile[] = [];
  const subagents = readSubagents(sourceRoot);
  for (const sub of subagents) {
    const parsed = parseAgentSource(sub.content);
    const name = parsed.meta.name || sub.name;
    if ((FORBIDDEN_AGENT_NAMES as readonly string[]).includes(name)) continue;
    const tier = resolveAgentTier({ tier: parsed.meta.tier, name });
    const exec = isExec({ exec: parsed.meta.exec });
    const tools = parsed.meta.claudecodeTools;
    const disallowed = parsed.meta.claudecodeDisallowed;
    const body = parsed.body;
    const desc = parsed.meta.description;

    const claude = pinOrThrow(tier, "claude");
    const grok = pinOrThrow(tier, "grok");
    const codex = pinOrThrow(tier, "codex");
    const agy = pinOrThrow(tier, "antigravity");
    const gemini = pinOrThrow(tier, "gemini");

    files.push({
      path: `.claude/agents/${name}.md`,
      content: mdFrontmatter(
        {
          name,
          description: desc,
          model: claude.model,
          ...(tools.length ? { tools } : {}),
          ...(disallowed.length ? { disallowedTools: disallowed } : {}),
        },
        body,
      ),
    });

    const grokFields: Record<string, string | boolean | string[] | undefined> = {
      name,
      description: desc,
      model: grok.model,
    };
    if (tier === "grunt") grokFields.agents_md = false;
    if (tools.length) grokFields.tools = tools;
    files.push({
      path: `.grok/agents/${name}.md`,
      content: mdFrontmatter(grokFields, body),
    });

    files.push({
      path: `.codex/agents/${name}.toml`,
      content: agentToml({
        name,
        description: desc,
        model: codex.model,
        effort: codex.effort ?? "",
        sandbox: sandboxFor(codex, exec) ?? "",
        body,
      }),
    });

    files.push({
      path: `.agents/agents/${name}.md`,
      content: mdFrontmatter({ name, description: desc, model: agy.model }, body),
    });

    files.push({
      path: `.gemini/agents/${name}.md`,
      content:
        `<!-- shape snapshot, not a live Gemini CLI driver contract -->\n` +
        mdFrontmatter({ name, description: desc, model: gemini.model }, body),
    });

    files.push({
      path: `.grok/roles/${name}.toml`,
      content: roleToml({
        description: desc,
        model: grok.model,
        effort: grok.effort ?? "",
        capability: capability(tier),
      }),
    });
  }

  files.push({
    path: ".grok/personas/superterse.toml",
    content: `description = "Sacrifice grammar for concision"\ninstructions = "Superterse. Imperative. No pleasantries. Key facts only."\n`,
  });

  const cjs = stdinHookSource();
  files.push({ path: ".grok/hooks/rtk-grok.js", content: cjs });
  files.push({ path: ".grok/hooks/rtk-grok.cjs", content: cjs });
  files.push({ path: ".grok/hooks/package.json", content: HOOKS_DIR_PACKAGE_JSON });
  files.push({
    path: ".grok/hooks/rtk.json",
    content: RTK_HOOK_JSON,
  });

  return files;
}

export function applyOverlay(opts: { sourceRoot: string; outputRoot: string }): OverlayFile[] {
  const files = buildOverlayFiles(opts.sourceRoot);
  for (const f of files) {
    const abs = join(opts.outputRoot, f.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, f.content);
  }
  mergePreserveClaudeRtk(opts.outputRoot);
  return files;
}

const RTK_SESSIONSTART = {
  type: "command",
  command:
    "node -e \"try{require('child_process').execSync('rtk --version',{stdio:'pipe'})}catch(e){console.error('[rtk] not found — brew install rtk-ai/tap/rtk')}\" ",
};

export function mergePreserveClaudeRtk(outputRoot: string): void {
  const settingsPath = join(outputRoot, ".claude", "settings.json");
  let settings: { hooks?: Record<string, unknown> } = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf8")) as typeof settings;
    } catch {
      settings = {};
    }
  }
  const hooks = (settings.hooks ??= {});
  const pre = (hooks.PreToolUse ??= []) as Array<{
    matcher?: string;
    hooks?: Array<{ command?: string }>;
  }>;
  const hasRtk = pre.some((e) => JSON.stringify(e).toLowerCase().includes("rtk"));
  if (!hasRtk) {
    /* do not invent rtk init matcher; only preserve existing */
  }
  const start = (hooks.SessionStart ??= []) as Array<{ hooks?: Array<{ command?: string }> }>;
  const hasAdvisory = JSON.stringify(start).includes("[rtk]");
  if (!hasAdvisory) {
    start.push({ hooks: [RTK_SESSIONSTART] });
  }
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, "\t") + "\n");
}

export function overlayContainsInherit(files: OverlayFile[]): boolean {
  return files.some((f) => f.content.includes("inherit"));
}

export function twoSlotSergeantIsGeneral(provider: Provider): boolean {
  if (!isTwoSlot(provider)) return false;
  return providerPin("sergeant", provider)?.model === providerPin("general", provider)?.model;
}

export type CheckDiff = {
  missing: string[];
  stale: string[];
  orphaned: string[];
};

const OWNED_PREFIXES = [
  "AGENTS.md",
  "CLAUDE.md",
  ".claude/agents/",
  ".grok/agents/",
  ".grok/roles/",
  ".grok/personas/",
  ".grok/hooks/",
  ".codex/agents/",
  ".agents/agents/",
  ".gemini/agents/",
];

function owned(rel: string): boolean {
  return OWNED_PREFIXES.some((p) => rel === p || rel.startsWith(p));
}

function walkFiles(root: string, dir = root, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(root, full, acc);
    else acc.push(relative(root, full).split(sep).join("/"));
  }
  return acc;
}

export function diffOverlay(expectedRoot: string, diskRoot: string): CheckDiff {
  const expected = walkFiles(expectedRoot).filter(owned);
  const disk = walkFiles(diskRoot).filter(owned);
  const expSet = new Set(expected);
  const missing: string[] = [];
  const stale: string[] = [];
  const orphaned: string[] = [];
  for (const rel of expected) {
    const a = join(expectedRoot, rel);
    const b = join(diskRoot, rel);
    if (!existsSync(b)) missing.push(rel);
    else if (!readFileSync(a).equals(readFileSync(b))) stale.push(rel);
  }
  for (const rel of disk) {
    if (!expSet.has(rel)) orphaned.push(rel);
  }
  return { missing, stale, orphaned };
}
