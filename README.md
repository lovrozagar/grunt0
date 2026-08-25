# grunt0

Model-fluent **kit / generator / overlay** for AI coding agents. Not an inference reverse-proxy.

Parent session is **grunt** (smallest model). Spawn **sergeant** for feature work and **general** for nasty multi-file / design. Fat dumps spawn another **grunt** aside. Children never call `spawn_subagent` (Grok depth 1).

| Tier     | Claude | Grok                           | Codex        | Antigravity / Gemini |
| -------- | ------ | ------------------------------ | ------------ | -------------------- |
| grunt    | haiku  | grok-4.5                       | gpt-5.4-mini | gemini-2.5-flash     |
| sergeant | sonnet | grok-4.6 (same SKU as general) | gpt-5.4      | gemini-2.5-pro       |
| general  | opus   | grok-4.6                       | gpt-5.4      | gemini-2.5-pro       |

If a provider has fewer than three models, sergeant and general share the **same model id**. Do not invent mid-tier ids.

## Install

```bash
npm i -D @lovrozagar/grunt0
# Node >=22
```

Runtime npm dependency: **`rulesync@^16.12.0`** (pulls Effect, Octokit, MCP SDK, commander, etc.).

**rtk is not an npm package.** It is an optional PATH binary (Rust Token Killer):

```bash
brew install rtk-ai/tap/rtk
# or
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh
```

Discriminator: `rtk gain`. Never `cargo install rtk` (wrong crate: reachingforthejack/rtk).

## Commands

```bash
grunt0 init              # copy kit + generate + overlay (ready to use)
grunt0 sync              # after you edit .rulesync: generate + overlay
grunt0 check             # vs disk; prints "check ok" or missing/stale/orphaned
grunt0 doctor            # rtk, hooks, default model, inherit scan
grunt0 doctor --json
grunt0 doctor --strict   # non-zero if rtk crate missing
grunt0 bench             # fixture token/$ vs naive-general
grunt0 bench --json
```

`--fix-user-config` (init) may write `GROK_HOME` / `~/.grok/config.toml`. Off by default. Tests never touch real `$HOME`.

Consumer scripts:

```json
{
  "scripts": {
    "grunt0": "grunt0",
    "grunt0:sync": "grunt0 sync",
    "grunt0:check": "grunt0 check"
  }
}
```

No silent `postinstall` sync.

## Default model (parent = grunt)

Grok user config (project cannot set this):

```toml
[models]
default = "grok-4.5"
[subagents.models]
explore = "grok-4.5"
grunt = "grok-4.5"
```

Claude: haiku. Codex: gpt-5.4-mini. Antigravity/Gemini: gemini-2.5-flash (best-effort).

## Spawn protocol

Only the parent grunt session calls `spawn_subagent`. Sergeant/general return `need: grunt job: search|exec|web|test query:…` and stop. Parent sibling-spawns grunt, then `resume_from` the child with the `verdict:`. Tiny lookups stay in-session + rtk.

## Non-goals

No reverse-proxy. No classifier-only hop. No per-tool agents (jobs live on grunt). No Autorun authors. No `inherit` pins. No live LLM in `bun test`.

## License

MIT
