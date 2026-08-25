import { runGenerate } from "./generate.ts";
import { applyOverlay } from "./overlay.ts";

export async function runSync(opts: { cwd: string }): Promise<void> {
  try {
    await runGenerate({ inputRoot: opts.cwd, outputRoot: opts.cwd });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`rulesync generate() failed (is rulesync installed?): ${msg}`);
  }
  applyOverlay({ sourceRoot: opts.cwd, outputRoot: opts.cwd });
}
