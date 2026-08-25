import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runGenerate } from "./generate.ts";
import { applyOverlay, diffOverlay, type CheckDiff } from "./overlay.ts";

export type CheckResult = { ok: boolean; diff: CheckDiff };

function copyTree(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const ent of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, ent.name);
    const to = join(dest, ent.name);
    if (ent.isDirectory()) copyTree(from, to);
    else {
      mkdirSync(dirname(to), { recursive: true });
      writeFileSync(to, readFileSync(from));
    }
  }
}

export async function runCheck(opts: { cwd: string; json: boolean }): Promise<CheckResult> {
  if (!existsSync(join(opts.cwd, ".rulesync"))) {
    const diff = { missing: [".rulesync"], stale: [], orphaned: [] };
    if (opts.json) process.stdout.write(JSON.stringify({ ok: false, ...diff }, null, 2) + "\n");
    else process.stderr.write("missing .rulesync (run grunt0 init)\n");
    return { ok: false, diff };
  }
  const tmp = mkdtempSync(join(tmpdir(), "grunt0-check-"));
  try {
    copyTree(join(opts.cwd, ".rulesync"), join(tmp, ".rulesync"));
    if (existsSync(join(opts.cwd, "rulesync.jsonc"))) {
      writeFileSync(join(tmp, "rulesync.jsonc"), readFileSync(join(opts.cwd, "rulesync.jsonc")));
    }
    await runGenerate({ inputRoot: tmp, outputRoot: tmp });
    applyOverlay({ sourceRoot: opts.cwd, outputRoot: tmp });
    const diff = diffOverlay(tmp, opts.cwd);
    const ok = diff.missing.length === 0 && diff.stale.length === 0 && diff.orphaned.length === 0;
    if (opts.json) {
      process.stdout.write(JSON.stringify({ ok, ...diff }, null, 2) + "\n");
    } else if (ok) {
      process.stdout.write("check ok\n");
    } else {
      for (const p of diff.missing) process.stderr.write(`missing ${p}\n`);
      for (const p of diff.stale) process.stderr.write(`stale ${p}\n`);
      for (const p of diff.orphaned) process.stderr.write(`orphaned ${p}\n`);
    }
    return { ok, diff };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
