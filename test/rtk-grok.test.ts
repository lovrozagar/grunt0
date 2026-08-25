import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";
import { handleStdin, injectUltra, rewriteCommand } from "../src/hooks/rtk-grok.ts";
import { runInit } from "../src/init.ts";
import { packageRoot, stdinHookArtifactPath } from "../src/paths.ts";

const grokGit = JSON.stringify({
  toolName: "Bash",
  toolInput: { command: "git status", description: "show status" },
});

test("fail-open malformed json", () => {
  expect(handleStdin("not-json")).toBe("");
});

test("fail-open missing command", () => {
  expect(handleStdin(JSON.stringify({ toolInput: { description: "x" } }))).toBe("");
});

test("camelCase rewrite preserves description", () => {
  const out = handleStdin(grokGit, {
    whichRtk: () => "/bin/rtk",
    rewrite: (_bin, cmd) => `rtk ${cmd}`,
  });
  const parsed = JSON.parse(out) as {
    hookSpecificOutput: { updatedInput: { command: string; description: string } };
  };
  expect(parsed.hookSpecificOutput.updatedInput.description).toBe("show status");
  expect(parsed.hookSpecificOutput.updatedInput.command).toMatch(/^rtk /);
});

test("snake_case tool_input", () => {
  const out = handleStdin(JSON.stringify({ tool_input: { command: "ls", description: "list" } }), {
    whichRtk: () => "/bin/rtk",
    rewrite: () => "rtk ls --ultra-compact",
  });
  expect(JSON.parse(out).hookSpecificOutput.updatedInput.command).toContain("rtk");
});

test("already rtk injects ultra on grep, not double prefix", () => {
  const out = handleStdin(
    JSON.stringify({ toolInput: { command: "rtk grep foo", description: "g" } }),
    { whichRtk: () => "/bin/rtk", rewrite: () => "should-not-run" },
  );
  expect(JSON.parse(out).hookSpecificOutput.updatedInput.command).toBe(
    "rtk grep --ultra-compact foo",
  );
});

test("already rtk git stays (no ultra inject for git)", () => {
  expect(injectUltra("rtk git status")).toBe("rtk git status");
  expect(
    handleStdin(JSON.stringify({ toolInput: { command: "rtk git status", description: "g" } })),
  ).toBe("");
});

test("missing rtk fail-open", () => {
  expect(handleStdin(grokGit, { whichRtk: () => null, rewrite: () => "x" })).toBe("");
});

test("rewrite timeout/null fail-open", () => {
  expect(
    handleStdin(grokGit, {
      whichRtk: () => "/bin/rtk",
      rewrite: () => null,
    }),
  ).toBe("");
});

test("rewriteCommand empty", () => {
  expect(rewriteCommand("   ")).toBeNull();
});

test("standalone cjs has no grunt0/node_modules import", () => {
  const src = readFileSync(join(packageRoot(), "src", "hooks", "rtk-grok.standalone.cjs"), "utf8");
  expect(src).not.toMatch(/grunt0/);
  expect(src).not.toMatch(/node_modules/);
});

function spawnHook(file: string): { status: number | null; stdout: string; stderr: string } {
  const proc = spawnSync(process.execPath, [file], {
    input: grokGit,
    encoding: "utf8",
    timeout: 8000,
  });
  return { status: proc.status, stdout: proc.stdout ?? "", stderr: proc.stderr ?? "" };
}

test("node dist/hooks/rtk-grok.cjs stdin JSON exits 0", () => {
  const cjs = join(packageRoot(), "dist", "hooks", "rtk-grok.cjs");
  expect(existsSync(cjs)).toBe(true);
  const src = readFileSync(cjs, "utf8");
  expect(src).not.toMatch(/from "/);
  expect(src).toMatch(/require\(/);
  const r = spawnHook(cjs);
  expect(r.status, r.stderr).toBe(0);
  expect(r.stderr).not.toMatch(/require is not defined/);
  if (r.stdout) JSON.parse(r.stdout);
});

test("node dist/hooks/rtk-grok.js is ESM and stdin JSON exits 0", () => {
  const js = join(packageRoot(), "dist", "hooks", "rtk-grok.js");
  expect(existsSync(js)).toBe(true);
  const src = readFileSync(js, "utf8");
  expect(src).toMatch(/export /);
  expect(src).not.toMatch(/\brequire\s*\(/);
  const r = spawnHook(js);
  expect(r.status, r.stderr).toBe(0);
  expect(r.stderr).not.toMatch(/require is not defined/);
  if (r.stdout) JSON.parse(r.stdout);
});

test("dist/index.js exports providerPin and handleStdin", async () => {
  const href = pathToFileURL(join(packageRoot(), "dist", "index.js")).href;
  const mod = (await import(href)) as {
    providerPin: (t: string, p: string) => { model: string } | null;
    handleStdin: (raw: string) => string;
  };
  expect(typeof mod.providerPin).toBe("function");
  expect(typeof mod.handleStdin).toBe("function");
  expect(mod.providerPin("grunt", "claude")?.model).toBe("haiku");
  expect(mod.handleStdin("not-json")).toBe("");
});

test("init-copied .grok/hooks/rtk-grok.js runs under type:module parent", async () => {
  const dir = mkdtempSync(join(tmpdir(), "grunt0-hook-"));
  try {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module", name: "consumer" }));
    await runInit({ cwd: dir, force: false, fixUserConfig: false });
    const hookJs = join(dir, ".grok", "hooks", "rtk-grok.js");
    const hookPkg = JSON.parse(
      readFileSync(join(dir, ".grok", "hooks", "package.json"), "utf8"),
    ) as {
      type: string;
    };
    expect(hookPkg.type).toBe("commonjs");
    expect(readFileSync(hookJs, "utf8")).toBe(readFileSync(stdinHookArtifactPath(), "utf8"));
    const r = spawnHook(hookJs);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stderr).not.toMatch(/require is not defined/);
    if (r.stdout) JSON.parse(r.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
