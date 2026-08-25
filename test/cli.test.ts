import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { runCheck } from "../src/check.ts";
import { runInit } from "../src/init.ts";
import { runSync } from "../src/sync.ts";
import { packageRoot } from "../src/paths.ts";
import { parseArgs, usage } from "../src/cli.ts";

const temps: string[] = [];
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "grunt0-cli-"));
  temps.push(d);
  return d;
}
afterEach(() => {
  while (temps.length) {
    const d = temps.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

test("help lists five commands", () => {
  const u = usage();
  for (const c of ["init", "sync", "check", "doctor", "bench"]) expect(u).toContain(c);
});

test("init refuses overwrite without --force", async () => {
  const dir = tmp();
  await runInit({ cwd: dir, force: false, fixUserConfig: false });
  expect(existsSync(join(dir, ".rulesync"))).toBe(true);
  await expect(runInit({ cwd: dir, force: false, fixUserConfig: false })).rejects.toThrow(
    /--force/,
  );
  await runInit({ cwd: dir, force: true, fixUserConfig: false });
});

test("init does not write real home; --fix-user-config uses GROK_HOME", async () => {
  const dir = tmp();
  const grokHome = tmp();
  await runInit({ cwd: dir, force: false, fixUserConfig: true, grokHome });
  expect(existsSync(join(grokHome, "config.toml"))).toBe(true);
  expect(readFileSync(join(grokHome, "config.toml"), "utf8")).toMatch(/grok-4.5/);
});

test("sync + check green; hand-edit AGENTS.md fails check", async () => {
  const dir = tmp();
  await runInit({ cwd: dir, force: false, fixUserConfig: false });
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(
    join(dir, ".claude", "settings.json"),
    JSON.stringify({
      hooks: {
        PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "rtk init" }] }],
      },
    }),
  );
  await runSync({ cwd: dir });
  expect(readFileSync(join(dir, ".claude", "settings.json"), "utf8")).toMatch(/rtk/);
  const clean = await runCheck({ cwd: dir, json: false });
  expect(clean.ok).toBe(true);
  writeFileSync(
    join(dir, "AGENTS.md"),
    readFileSync(join(dir, "AGENTS.md"), "utf8") + "\n# dirty\n",
  );
  const dirty = await runCheck({ cwd: dir, json: true });
  expect(dirty.ok).toBe(false);
  expect(dirty.diff.stale).toContain("AGENTS.md");
});

test("bin --help after build", () => {
  const bin = join(packageRoot(), "bin", "grunt0.js");
  const dist = join(packageRoot(), "dist", "cli.js");
  if (!existsSync(dist)) return;
  const proc = spawnSync(process.execPath, [bin, "--help"], { encoding: "utf8" });
  expect(proc.status).toBe(0);
  expect(proc.stdout).toMatch(/init/);
  expect(proc.stdout).toMatch(/sync/);
  expect(proc.stdout).toMatch(/check/);
  expect(proc.stdout).toMatch(/doctor/);
  expect(proc.stdout).toMatch(/bench/);
});

test("unknown command", () => {
  expect(parseArgs(["nope"]).unknownCommand).toBe("nope");
});
