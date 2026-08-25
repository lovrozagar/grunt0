import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync as spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

export const RTK_INSTALL =
  "brew install rtk-ai/tap/rtk\n# or\ncurl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh\n# discriminator: rtk gain\n# never: cargo install rtk (wrong crate reachingforthejack/rtk)";

export type DoctorReport = {
  ok: boolean;
  rtkPresent: boolean;
  rtkCorrectCrate: boolean;
  rtkVersion: string | null;
  grokHookInstalled: boolean;
  claudeRtkMatcher: boolean;
  defaultModelGrunt: boolean | null;
  unusedMcpOrPluginCount: number;
  inheritHits: string[];
  liveProve: string;
  install: string;
};

function whichRtk(): string | null {
  const r = spawn("sh", ["-c", "command -v rtk"], { encoding: "utf8" });
  const p = (r.stdout ?? "").trim();
  return p || null;
}

function rtkGainWorks(): boolean {
  const r = spawn("rtk", ["gain"], { encoding: "utf8", timeout: 5000 });
  return r.status === 0;
}

function walk(root: string, dir = root, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) walk(root, full, acc);
    else acc.push(full);
  }
  return acc;
}

export function detectRtk(): { present: boolean; correctCrate: boolean; version: string | null } {
  const bin = whichRtk();
  if (!bin) return { present: false, correctCrate: false, version: null };
  const ver = spawn("rtk", ["--version"], { encoding: "utf8", timeout: 3000 });
  const version = (ver.stdout ?? "").trim() || null;
  return { present: true, correctCrate: rtkGainWorks(), version };
}

export function runDoctor(opts: { cwd: string; json: boolean; strict: boolean }): DoctorReport {
  const rtk = detectRtk();
  const grokHook = existsSync(join(opts.cwd, ".grok", "hooks", "rtk-grok.js"));
  let claudeRtk = false;
  const settings = join(opts.cwd, ".claude", "settings.json");
  if (existsSync(settings)) {
    claudeRtk = readFileSync(settings, "utf8").toLowerCase().includes("rtk");
  }
  const grokHome = process.env.GROK_HOME ?? join(homedir(), ".grok");
  const grokCfg = join(grokHome, "config.toml");
  let defaultModelGrunt: boolean | null = null;
  if (existsSync(grokCfg)) {
    const txt = readFileSync(grokCfg, "utf8");
    const m = txt.match(/^\s*default\s*=\s*"([^"]+)"/m);
    defaultModelGrunt = m?.[1] === "grok-4.5";
  }
  let unusedMcpOrPluginCount = 0;
  const grokToml = join(opts.cwd, ".grok", "config.toml");
  if (existsSync(grokToml)) {
    const t = readFileSync(grokToml, "utf8");
    if (/\[mcp_servers/.test(t) || /\[plugins/.test(t)) unusedMcpOrPluginCount += 1;
  }
  const inheritHits: string[] = [];
  for (const f of walk(opts.cwd)) {
    if (!/\.(md|toml|json)$/.test(f)) continue;
    if (f.includes("node_modules")) continue;
    const rel = f.slice(opts.cwd.length + 1);
    if (rel.includes("SPEC.md") || rel.includes("DESIGN")) continue;
    if (readFileSync(f, "utf8").includes("inherit")) inheritHits.push(rel.split("\\").join("/"));
  }
  const okCore = rtk.correctCrate || !opts.strict;
  const report: DoctorReport = {
    ok: opts.strict ? rtk.correctCrate && grokHook : okCore,
    rtkPresent: rtk.present,
    rtkCorrectCrate: rtk.correctCrate,
    rtkVersion: rtk.version,
    grokHookInstalled: grokHook,
    claudeRtkMatcher: claudeRtk,
    defaultModelGrunt,
    unusedMcpOrPluginCount,
    inheritHits,
    liveProve: "live-prove: /hooks lists rtk-grok; git status → rtk git status",
    install: RTK_INSTALL,
  };
  if (opts.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else {
    process.stdout.write(
      `rtk: present=${report.rtkPresent} crate=${report.rtkCorrectCrate} ${report.rtkVersion ?? ""}\n`,
    );
    process.stdout.write(`grok hook: ${report.grokHookInstalled}\n`);
    process.stdout.write(`claude rtk matcher: ${report.claudeRtkMatcher}\n`);
    process.stdout.write(`default model grunt: ${report.defaultModelGrunt}\n`);
    process.stdout.write(`${report.liveProve}\n`);
    if (!report.rtkCorrectCrate) process.stdout.write(`install:\n${RTK_INSTALL}\n`);
  }
  return report;
}
