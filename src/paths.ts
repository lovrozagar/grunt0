import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function packageRoot(start = dirname(fileURLToPath(import.meta.url))): string {
  let dir = start;
  for (;;) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
        if (pkg.name === "@lovrozagar/grunt0") return dir;
      } catch {
        /* keep walking */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error("package root not found");
    dir = parent;
  }
}

export function kitRoot(): string {
  return join(packageRoot(), "kit");
}

/** Zero-dep CJS stdin hook. Never the ESM `dist/hooks/rtk-grok.js` tsc emit. */
export function stdinHookArtifactPath(): string {
  const built = join(packageRoot(), "dist", "hooks", "rtk-grok.cjs");
  if (existsSync(built)) return built;
  return join(packageRoot(), "src", "hooks", "rtk-grok.standalone.cjs");
}

export function hookArtifactPath(): string {
  return stdinHookArtifactPath();
}
