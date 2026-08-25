import { expect, test } from "vitest";
import { parseArgs, usage } from "../src/cli.ts";

test("usage lists five commands", () => {
  const u = usage();
  for (const c of ["init", "sync", "check", "doctor", "bench"]) {
    expect(u).toContain(c);
  }
  expect(u).toContain("--json");
  expect(u).toContain("rulesync");
  expect(u).toContain("PATH binary");
});

test("parseArgs help and flags", () => {
  expect(parseArgs(["--help"]).flags.help).toBe(true);
  expect(parseArgs(["-h"]).flags.help).toBe(true);
  expect(parseArgs(["check", "--json"]).flags.json).toBe(true);
  expect(parseArgs(["init", "--force"]).flags.force).toBe(true);
  expect(parseArgs(["doctor", "--strict"]).flags.strict).toBe(true);
  expect(parseArgs(["init", "--fix-user-config"]).flags.fixUserConfig).toBe(true);
});

test("unknown flag and command", () => {
  expect(parseArgs(["--nope"]).unknownFlag).toBe("--nope");
  expect(parseArgs(["explode"]).unknownCommand).toBe("explode");
  expect(parseArgs(["init"]).command).toBe("init");
  expect(parseArgs(["init"]).unknownCommand).toBeUndefined();
});
