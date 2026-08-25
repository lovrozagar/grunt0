export type CliFlags = {
  help: boolean;
  json: boolean;
  force: boolean;
  strict: boolean;
  fixUserConfig: boolean;
};

export type ParsedCli = {
  command: string | undefined;
  flags: CliFlags;
  unknownFlag: string | undefined;
  unknownCommand: string | undefined;
};

const COMMANDS = ["init", "sync", "check", "doctor", "bench"] as const;
export type Command = (typeof COMMANDS)[number];

export function usage(): string {
  return `grunt0 — model-fluent kit / generator / overlay (not an inference proxy)

Usage: grunt0 <command> [flags]

Commands:
  init     copy kit into cwd
  sync     rulesync generate() then overlay
  check    overlay(generate-to-temp) vs disk
  doctor   rtk + hooks + default-model + inherit scan
  bench    fixture token/$ comparison

Flags:
  --help              this text
  --json              machine-readable output (check, doctor, bench)
  --force             overwrite existing .rulesync on init
  --strict            doctor exits non-zero on missing rtk
  --fix-user-config   opt-in write of GROK_HOME config (never default)

Node >=22. npm dep: rulesync@^16.12.0 (pulls Effect/Octokit/MCP SDK/etc).
rtk is a PATH binary, not an npm dependency: brew install rtk-ai/tap/rtk
`;
}

export function parseArgs(argv: string[]): ParsedCli {
  const flags: CliFlags = {
    help: false,
    json: false,
    force: false,
    strict: false,
    fixUserConfig: false,
  };
  let command: string | undefined;
  let unknownFlag: string | undefined;
  let unknownCommand: string | undefined;
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      flags.help = true;
      continue;
    }
    if (arg === "--json") {
      flags.json = true;
      continue;
    }
    if (arg === "--force") {
      flags.force = true;
      continue;
    }
    if (arg === "--strict") {
      flags.strict = true;
      continue;
    }
    if (arg === "--fix-user-config") {
      flags.fixUserConfig = true;
      continue;
    }
    if (arg.startsWith("-")) {
      unknownFlag = arg;
      continue;
    }
    if (!command) {
      command = arg;
      if (!(COMMANDS as readonly string[]).includes(arg)) unknownCommand = arg;
      continue;
    }
    unknownCommand = arg;
  }
  return { command, flags, unknownFlag, unknownCommand };
}

export async function start(argv = process.argv.slice(2)): Promise<void> {
  try {
    const parsed = parseArgs(argv);
    if (parsed.flags.help || parsed.command === undefined) {
      process.stdout.write(usage());
      if (parsed.command === undefined && !parsed.flags.help) process.exitCode = 1;
      return;
    }
    if (parsed.unknownFlag) {
      process.stderr.write(`unknown flag: ${parsed.unknownFlag}\n${usage()}`);
      process.exitCode = 1;
      return;
    }
    if (parsed.unknownCommand) {
      process.stderr.write(`unknown command: ${parsed.unknownCommand}\n${usage()}`);
      process.exitCode = 1;
      return;
    }
    const { dispatch } = await import("./dispatch.ts");
    await dispatch(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${msg}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void start();
}
