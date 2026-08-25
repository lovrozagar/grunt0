#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");

const RTK_TIMEOUT_MS = 3000;
const ULTRA_SUBS = new Set([
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

function injectUltra(rewritten) {
  if (rewritten.includes("--ultra-compact")) return rewritten;
  const parts = rewritten.split(/\s+/);
  if (parts.length < 2 || parts[0] !== "rtk") return rewritten;
  const sub = parts[1];
  if (!ULTRA_SUBS.has(sub)) return rewritten;
  const rest = parts.slice(2).join(" ");
  return "rtk " + sub + " --ultra-compact" + (rest ? " " + rest : "");
}

function alreadyRtk(cmd) {
  const first = cmd.split(/\s+/, 1)[0] || "";
  return first === "rtk" || first.endsWith("/rtk");
}

function whichRtk() {
  const rtk = spawnSync("sh", ["-c", "command -v rtk"], { encoding: "utf8" });
  const path = (rtk.stdout || "").trim();
  return path || null;
}

function rewriteViaRtk(rtkBin, cmd) {
  try {
    const proc = spawnSync(rtkBin, ["rewrite", "--ultra-compact", cmd], {
      encoding: "utf8",
      timeout: RTK_TIMEOUT_MS,
    });
    const out = (proc.stdout || "").trim();
    if (!out || out === cmd) return null;
    return injectUltra(out);
  } catch {
    return null;
  }
}

function rewriteCommand(cmd) {
  const trimmed = cmd.trim();
  if (!trimmed) return null;
  if (alreadyRtk(trimmed)) {
    const rewritten = injectUltra(trimmed);
    return rewritten === trimmed ? null : rewritten;
  }
  const rtk = whichRtk();
  if (!rtk) return null;
  return rewriteViaRtk(rtk, trimmed);
}

function handleStdin(raw) {
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return "";
    const input = data.toolInput || data.tool_input;
    if (!input || typeof input !== "object" || Array.isArray(input)) return "";
    const cmd = typeof input.command === "string" ? input.command.trim() : "";
    if (!cmd) return "";
    const rewritten = rewriteCommand(cmd);
    if (!rewritten) return "";
    const updated = Object.assign({}, input, { command: rewritten });
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

function main() {
  const chunks = [];
  process.stdin.on("data", (c) => chunks.push(c));
  process.stdin.on("end", () => {
    const out = handleStdin(Buffer.concat(chunks).toString("utf8"));
    if (out) process.stdout.write(out);
    process.exit(0);
  });
  process.stdin.on("error", () => process.exit(0));
}

if (require.main === module) main();

module.exports = { handleStdin, rewriteCommand, injectUltra };
