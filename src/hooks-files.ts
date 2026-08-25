import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stdinHookArtifactPath } from "./paths.ts";

export const HOOKS_DIR_PACKAGE_JSON = `{
	"type": "commonjs"
}
`;

export const RTK_HOOK_JSON = `{
	"hooks": {
		"PreToolUse": [
			{
				"matcher": "Bash",
				"hooks": [
					{
						"type": "command",
						"command": "node rtk-grok.js",
						"timeout": 5
					}
				]
			}
		]
	}
}
`;

export function stdinHookSource(): string {
  return readFileSync(stdinHookArtifactPath(), "utf8");
}

export function writeGrokHookFiles(cwd: string): void {
  const dir = join(cwd, ".grok", "hooks");
  mkdirSync(dir, { recursive: true });
  const cjs = stdinHookSource();
  writeFileSync(join(dir, "rtk-grok.js"), cjs);
  writeFileSync(join(dir, "rtk-grok.cjs"), cjs);
  writeFileSync(join(dir, "package.json"), HOOKS_DIR_PACKAGE_JSON);
  writeFileSync(join(dir, "rtk.json"), RTK_HOOK_JSON);
}
