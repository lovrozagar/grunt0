import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { pathToFileURL } from "node:url";

export const RTK_TIMEOUT_MS = 3000;

export const ULTRA_SUBS = new Set([
  "grep",
  "rg",
  "curl",
  "wget",
  "vitest",
  "jest",
  "pytest",
  "test",
  "lint",
  "tsc",
  "npm",
  "npx",
  "read",
  "find",
  "diff",
  "json",
  "log",
  "playwright",
  "cargo",
  "ruff",
  "prettier",
  "format",
]);

export type HookDeps = {
  whichRtk: () => string | null;
  rewrite: (rtkBin: string, cmd: string) => string | null;
};

export function injectUltra(rewritten: string): string {
  if (rewritten.includes("--ultra-compact")) return rewritten;
  const parts = rewritten.split(/\s+/);
  if (parts.length < 2 || parts[0] !== "rtk") return rewritten;
  const sub = parts[1] ?? "";
  if (!ULTRA_SUBS.has(sub)) return rewritten;
  const rest = parts.slice(2).join(" ");
  return `rtk ${sub} --ultra-compact` + (rest ? ` ${rest}` : "");
}

export function alreadyRtk(cmd: string): boolean {
  const first = cmd.split(/\s+/, 1)[0] ?? "";
  return first === "rtk" || first.endsWith("/rtk");
}

export function defaultWhichRtk(): string | null {
  const rtk = spawnSync("sh", ["-c", "command -v rtk"], { encoding: "utf8" });
  const path = (rtk.stdout ?? "").trim();
  return path || null;
}

export function defaultRewrite(rtkBin: string, cmd: string): string | null {
  try {
    const proc = spawnSync(rtkBin, ["rewrite", "--ultra-compact", cmd], {
      encoding: "utf8",
      timeout: RTK_TIMEOUT_MS,
    });
    const out = (proc.stdout ?? "").trim();
    if (!out || out === cmd) return null;
    return injectUltra(out);
  } catch {
    return null;
  }
}

export const defaultDeps: HookDeps = {
  whichRtk: defaultWhichRtk,
  rewrite: defaultRewrite,
};

export function rewriteCommand(cmd: string, deps: HookDeps = defaultDeps): string | null {
  const trimmed = cmd.trim();
  if (!trimmed) return null;
  if (alreadyRtk(trimmed)) {
    const rewritten = injectUltra(trimmed);
    return rewritten === trimmed ? null : rewritten;
  }
  const rtk = deps.whichRtk();
  if (!rtk) return null;
  const rewritten = deps.rewrite(rtk, trimmed);
  if (!rewritten) return null;
  return rewritten;
}

function toolInput(data: Record<string, unknown>): Record<string, unknown> | null {
  const raw = data.toolInput ?? data.tool_input;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function commandOf(input: Record<string, unknown>): string | null {
  const cmd = input.command;
  if (typeof cmd !== "string") return null;
  const trimmed = cmd.trim();
  return trimmed || null;
}

/** Fail-open: any error or no rewrite → empty string (caller prints nothing, exits 0). */
export function handleStdin(raw: string, deps: HookDeps = defaultDeps): string {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) return "";
    const input = toolInput(data as Record<string, unknown>);
    if (!input) return "";
    const cmd = commandOf(input);
    if (!cmd) return "";
    const rewritten = rewriteCommand(cmd, deps);
    if (!rewritten) return "";
    const updated = { ...input, command: rewritten };
    return JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecisionReason: "RTK auto-rewrite",
        updatedInput: updated,
      },
    });
  } catch {
    return "";
  }
}

export async function hookMain(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) chunks.push(Buffer.from(chunk));
  const out = handleStdin(Buffer.concat(chunks).toString("utf8"));
  if (out) stdout.write(out);
}

function isMainModule(): boolean {
  const arg = process.argv[1];
  if (!arg) return false;
  return import.meta.url === pathToFileURL(resolve(arg)).href;
}

if (isMainModule()) {
  void hookMain();
}
