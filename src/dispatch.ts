import type { ParsedCli } from "./cli.ts";
import { runBench } from "./bench.ts";
import { runCheck } from "./check.ts";
import { runDoctor } from "./doctor.ts";
import { runInit } from "./init.ts";
import { runSync } from "./sync.ts";

export async function dispatch(parsed: ParsedCli): Promise<void> {
  const cwd = process.cwd();
  switch (parsed.command) {
    case "init":
      await runInit({
        cwd,
        force: parsed.flags.force,
        fixUserConfig: parsed.flags.fixUserConfig,
      });
      return;
    case "sync":
      await runSync({ cwd });
      return;
    case "check": {
      const result = await runCheck({ cwd, json: parsed.flags.json });
      process.exitCode = result.ok ? 0 : 1;
      return;
    }
    case "doctor": {
      const result = await runDoctor({
        cwd,
        json: parsed.flags.json,
        strict: parsed.flags.strict,
      });
      process.exitCode = result.ok ? 0 : 1;
      return;
    }
    case "bench": {
      const result = await runBench({ json: parsed.flags.json });
      process.exitCode = result.ok ? 0 : 1;
      return;
    }
    default:
      process.stderr.write(`unknown command: ${parsed.command}\n`);
      process.exitCode = 1;
  }
}
