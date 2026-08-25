import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { writeGrokHookFiles } from "./hooks-files.ts";
import { copyKit, kitWouldOverwrite } from "./kit.ts";
import { runSync } from "./sync.ts";

export type InitOpts = {
  cwd: string;
  force: boolean;
  fixUserConfig: boolean;
  grokHome?: string;
};

export const DEFAULT_MODEL_BLURB = `Default model = grunt pin (session parent is grunt):
  Grok user  ~/.grok/config.toml
    [models]
    default = "grok-4.5"
    [subagents.models]
    explore = "grok-4.5"
    grunt = "grok-4.5"
  Claude: haiku (user/project default)
  Codex: gpt-5.4-mini
  Antigravity / Gemini: gemini-2.5-flash (best-effort)
Project Grok config cannot set [models] default. --fix-user-config is opt-in.
`;

export async function runInit(opts: InitOpts): Promise<void> {
  if (kitWouldOverwrite(opts.cwd) && !opts.force) {
    throw new Error(".rulesync already exists (pass --force to overwrite)");
  }
  copyKit(opts.cwd);
  writeGrokHookFiles(opts.cwd);
  await runSync({ cwd: opts.cwd });
  process.stdout.write(
    "init ok — generated agents, pins, hooks. session default still needs the user-config one-liner below.\n",
  );
  process.stdout.write(DEFAULT_MODEL_BLURB);
  if (!opts.fixUserConfig) return;
  const home = opts.grokHome ?? process.env.GROK_HOME ?? join(homedir(), ".grok");
  mkdirSync(home, { recursive: true });
  const cfg = join(home, "config.toml");
  let existing = existsSync(cfg) ? readFileSync(cfg, "utf8") : "";
  if (!existing.includes("[models]")) existing += `\n[models]\ndefault = "grok-4.5"\n`;
  if (!existing.includes("[subagents.models]")) {
    existing += `\n[subagents.models]\nexplore = "grok-4.5"\ngrunt = "grok-4.5"\n`;
  }
  writeFileSync(cfg, existing);
}
