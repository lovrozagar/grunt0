import { existsSync } from "node:fs";
import { join } from "node:path";
import { generate } from "rulesync";

export async function runGenerate(opts: { inputRoot: string; outputRoot: string }): Promise<void> {
  const configPath = join(opts.inputRoot, "rulesync.jsonc");
  if (existsSync(configPath)) {
    await generate({
      inputRoot: opts.inputRoot,
      outputRoots: [opts.outputRoot],
      configPath,
      silent: true,
    });
    return;
  }
  await generate({
    inputRoot: opts.inputRoot,
    outputRoots: [opts.outputRoot],
    silent: true,
  });
}
