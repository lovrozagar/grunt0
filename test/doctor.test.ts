import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { RTK_INSTALL, runDoctor } from "../src/doctor.ts";
import { runInit } from "../src/init.ts";

test("doctor json on temp dir; install text never cargo install rtk", async () => {
  const dir = mkdtempSync(join(tmpdir(), "grunt0-doc-"));
  try {
    await runInit({ cwd: dir, force: false, fixUserConfig: false });
    const report = runDoctor({ cwd: dir, json: true, strict: false });
    expect(RTK_INSTALL).not.toMatch(/(?:^|\n)cargo install rtk/);
    expect(RTK_INSTALL).toMatch(/brew install rtk-ai\/tap\/rtk/);
    expect(report.liveProve).toMatch(/rtk-grok/);
    expect(report.grokHookInstalled).toBe(true);
    expect(typeof report.rtkPresent).toBe("boolean");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
