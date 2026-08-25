import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { kitRoot } from "./paths.ts";

function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const ent of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, ent.name);
    const to = join(dest, ent.name);
    if (ent.isDirectory()) copyDir(from, to);
    else {
      mkdirSync(dirname(to), { recursive: true });
      writeFileSync(to, readFileSync(from));
    }
  }
}

/** Copy canonical kit into dest. No CLI. */
export function copyKit(dest: string): void {
  const kit = kitRoot();
  const rulesyncSrc = join(kit, ".rulesync");
  const jsoncSrc = join(kit, "rulesync.jsonc");
  if (!existsSync(rulesyncSrc) || !existsSync(jsoncSrc)) {
    throw new Error(`kit missing at ${kit}`);
  }
  copyDir(rulesyncSrc, join(dest, ".rulesync"));
  writeFileSync(join(dest, "rulesync.jsonc"), readFileSync(jsoncSrc));
}

export function kitWouldOverwrite(dest: string): boolean {
  return existsSync(join(dest, ".rulesync"));
}

export function assertDir(path: string): void {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error(`not a directory: ${path}`);
  }
}

export function emptyDir(path: string): void {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}
