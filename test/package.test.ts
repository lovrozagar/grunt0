import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { packageRoot } from "../src/paths.ts";

describe("package.json", () => {
  const pkg = JSON.parse(readFileSync(join(packageRoot(), "package.json"), "utf8")) as Record<
    string,
    unknown
  >;

  test("name bin engines rulesync no rtk", () => {
    expect(pkg.name).toBe("@lovrozagar/grunt0");
    expect((pkg.bin as { grunt0: string }).grunt0).toBe("./bin/grunt0.js");
    expect((pkg.engines as { node: string }).node).toBe(">=22");
    expect((pkg.dependencies as { rulesync: string }).rulesync).toBe("^16.12.0");
    const deps = {
      ...(pkg.dependencies as object),
      ...(pkg.devDependencies as object),
      ...(pkg.optionalDependencies as object),
    };
    expect(Object.keys(deps)).not.toContain("rtk");
    expect(pkg.license).toBe("MIT");
    expect((pkg.publishConfig as { access: string }).access).toBe("public");
  });
});
