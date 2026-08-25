# grunt0 SPEC

Implementation contract. Top of each group = next. Every line is a testable `[ ]`. Rationale lives in DESIGN.md, not here.

TDD: write the failing test for the box, then the code. A test that can pass while the product is broken is worse than no test.

Canonical contract: this file. `/home/ecomet/Development/grunt0/DESIGN.txt` is the original prompt, not the spec.

Do not implement until this spec is approved.

Tiers (public names, final): **grunt** (smallest) | **sergeant** (medium SKU or alias) | **general** (deep). Default kit agents are exactly those three.

---

## Do not (always in force)

- [ ] never ship a reverse-proxy in front of grok/claude/codex/agy/gemini TUI (`@cascadeflow`, a3m-router, llm-routing, RouteLLM, or a home-grown inference proxy)
- [ ] never add a classifier-only agent whose only job is `route: grunt|sergeant|general` (extra billed hop)
- [ ] never use `inherit` as a model pin in source, overlay output, or goldens
- [ ] never write a model string that is not `providerPin(tier, provider).model`
- [ ] never spawn same-model for a 1-tool lookup (git status, one-file read, ≤10-hit grep)
- [ ] never switch the whole parent session to opus/4.6/pro/gpt-5.4 to run grep/test/curl
- [ ] never put superterse / style churn in the always-on `AGENTS.md` prefix
- [ ] never declare `rtk` as an npm dependency (`dependencies` / `devDependencies` / `optionalDependencies`)
- [ ] never print `cargo install rtk` as the install path (wrong crate: reachingforthejack/rtk)
- [ ] never reimplement rulesync generate/import for rules, commands, skills, subagents
- [ ] never enable the rulesync `hooks` feature in shipped `rulesync.jsonc` (it can wipe `rtk init` PreToolUse)
- [ ] never ship Autorun authors (`schema-author`, `page-author`, `chart-author`, `component-author`, `record-crud`, `trigger-author`, `interaction-author`, `platform-prompt`, `version-control`) or Autorun XML
- [ ] never generate MCP / plugin listings into the cheap prefix by default
- [ ] never set `max_tokens` on agent files until a driver exposes that field
- [ ] never invent a Grok/Gemini/Codex mid-tier model id
- [ ] never require live LLM calls for `bun test` / `npm test`
- [ ] never mock the pin table, overlay, or generator under their own tests
- [ ] never ship more than 3 cheap isolation workers (v0 default is **1**: `grunt`)
- [ ] never ship default kit agents other than `{grunt, sergeant, general}`
- [ ] never ship a default kit agent named `router`, `explore`, `implementer`, or `architect`
- [ ] never treat `rtk hook claude` as sufficient for Grok (camelCase `toolName`/`toolInput`)
- [ ] never instruct **any** default child body (`sergeant`, `general`, isolation `grunt`) to call `spawn_subagent` (v0 is parent-only spawn)
- [ ] never run rulesync `generate({ check: true })` against an already-overlaid consumer working tree
- [ ] never tell overlay to emit `.agents/agents/<name>/agent.md` (rulesync 16.12.0 emits flat `.agents/agents/<name>.md`)
- [ ] never default `postinstall` to `grunt0 sync`

---

## PR1 — repo skeleton + pin table

- [ ] package name is `@lovrozagar/grunt0` (decided); bin is `grunt0`
- [ ] `package.json`: `"type": "module"`, `engines.node >= 22` (rulesync 16.12.0 requires Node 22), `publishConfig.access: public`, `packageManager: bun@1.3.11` (or current bun), MIT, `author: lovrozagar`, repository `https://github.com/lovrozagar/grunt0`
- [ ] `package.json` `"dependencies"` includes `"rulesync": "^16.12.0"`
- [ ] `package.json` does not list `rtk` under any dependency class
- [ ] match oat checkout: TypeScript ESM (`module: NodeNext`), vitest + `@vitest/coverage-v8`, oxlint, oxfmt, commitlint conventional
- [ ] `.commitlintrc.json` types: `build,chore,ci,config,docs,feat,fix,perf,refactor,revert,style,test`
- [ ] `.githooks/commit-msg` gates commitlint (oat pattern: real commitlint if present, inline fallback otherwise)
- [ ] `prepare` script sets `core.hooksPath` to `.githooks` when unset
- [ ] `bin/grunt0.js` shebang `#!/usr/bin/env node`, imports compiled `dist/cli.js`
- [ ] `src/cli.ts` parse stub + `src/index.ts` compile; `tsc -p tsconfig.json` emits `dist/` with `.d.ts`
- [ ] LICENSE MIT Copyright (c) 2026 lovrozagar
- [ ] README stub: kit/generator not a proxy; Node ≥22; rulesync is the npm dep (and its graph); rtk is a PATH binary
- [ ] `PROVIDERS` = `claude | grok | codex | antigravity | gemini`
- [ ] tiers are `grunt | sergeant | general`
- [ ] 3-slot claude: grunt=`haiku`, sergeant=`sonnet`, general=`opus`; all three model strings distinct
- [ ] 2-slot grok: grunt=`grok-4.5`, general=`grok-4.6`, `providerPin("sergeant", "grok").model === providerPin("general", "grok").model`
- [ ] 2-slot antigravity: grunt=`gemini-2.5-flash`, general=`gemini-2.5-pro`, sergeant model aliases to general
- [ ] 2-slot gemini: same ids as antigravity; sergeant model aliases to general
- [ ] 2-slot codex: grunt=`gpt-5.4-mini`, general=`gpt-5.4`, sergeant model aliases to general
- [ ] every provider has explicit grunt+general model strings (non-empty, not `inherit`)
- [ ] grok grunt pin includes `effort: "low"`; grok sergeant pin includes `effort: "medium"`; grok general pin includes `effort: "high"`
- [ ] codex grunt pin includes `effort: "low"` and `sandbox: "read-only"`
- [ ] `isExec` may promote a grunt sandbox from `read-only` to `workspace-write`; that promotion is overlay, not a second model id
- [ ] grunt still has no Write tool after that sandbox promotion
- [ ] codex sergeant pin and codex general pin are identical (`effort: "medium"`, `sandbox: "workspace-write"`, same model)
- [ ] `isTwoSlot("claude")` is false
- [ ] `isTwoSlot(p)` is true for `grok`, `codex`, `antigravity`, `gemini`
- [ ] `isInherit(pin)` is true iff missing model or model === `"inherit"`
- [ ] `isExec(meta)` true for `exec: true|yes|1`
- [ ] `providerPin(tier, provider)` returns `null` for unknown provider (tested, not thrown-and-swallowed)
- [ ] `providerPin` never returns a pin whose `model` is `"inherit"`
- [ ] `resolveAgentTier({ tier, name })` explicit `tier` first: `grunt|sergeant|general`
- [ ] `resolveAgentTier` legacy tier/name aliases (overlay of consumer-added agents only, not shipped kit names): `router`→`grunt`; `medium`/`think`/`implementer`→`sergeant`; `deep`/`architect`→`general`; `explore`→`grunt`
- [ ] `resolveAgentTier` name map for shipped names: `grunt`→`grunt`, `sergeant`→`sergeant`, `general`→`general`
- [ ] after aliases, unknown name **throws**
- [ ] `resolveAgentTier({})` throws (POC `resolveTier({}) === "think"` footgun is forbidden)
- [ ] `resolveAgentTier({ name: "unknown-agent" })` throws
- [ ] no `resolveTier` silent-deep fallback exists in `src/pins.ts`
- [ ] public exports from `src/pins.ts` / `src/index.ts` are `resolveAgentTier`, `providerPin`, `isTwoSlot`, `isInherit`, `isExec` (no `resolveTier`)
- [ ] pin-matrix test: 3-slot grunt ≠ sergeant ≠ general; 2-slot sergeant.model === general.model; no pin is inherit
- [ ] every exported function from `src/pins.ts` has unit tests
- [ ] `src/parse.ts` frontmatter stub exists and has unit tests (needed by later overlay; no overlay module in this PR)
- [ ] vitest coverage thresholds in this PR apply only to `src/pins.ts` and `src/parse.ts` (not overlay/cli modules that do not exist yet)
- [ ] `bun run test` / `npm test` runs vitest with v8 coverage on those modules
- [ ] CI workflow: bun install frozen, fmt:check, oxlint, tsc --noEmit, vitest

---

## PR2 — overlay (surgical rewriter) + goldens

- [ ] overlay is a rewriter + extra-file writer, not a second generator of rules/commands/skills/subagents
- [ ] overlay input is the disk tree **after** `generate()` from `rulesync@^16.12.0` plus `.rulesync/subagents/*.md` frontmatter
- [ ] overlay does not call a parallel walk of `.claude/commands` to emit provider files
- [ ] goldens start from a committed fixture produced by real `rulesync@16.12.0` `generate()` of a minimal kit tree
- [ ] overlay reads pin source from `.rulesync/subagents/*.md` (`tier:`, `exec:`, `name:`), not from generated provider files
- [ ] `resolveAgentTier` is the only tier resolver overlay calls (no second name-map in overlay)
- [ ] overlay writes `model` exclusively via `providerPin(resolveAgentTier(meta), provider).model`
- [ ] overlay patches `tools` and Claude `disallowedTools` from `.rulesync/subagents` nested sections onto generated agent files
- [ ] after overlay, `.claude/agents/grunt.md` allows Bash and does not allow Write
- [ ] after overlay, `.claude/agents/{sergeant,general}.md` contain zero `spawn_subagent` strings
- [ ] after overlay, `.grok/agents/{sergeant,general}.md` contain zero `spawn_subagent` strings
- [ ] overlay never writes the literal string `inherit`
- [ ] after overlay, `.claude/agents/<name>.md` exists for each of `{grunt, sergeant, general}` and pins a claude id only (`haiku`/`sonnet`/`opus`)
- [ ] after overlay, `.grok/agents/<name>.md` exists for each of `{grunt, sergeant, general}` and pins a grok id only (never `haiku`/`sonnet`/`opus`)
- [ ] after overlay, `.codex/agents/<name>.toml` exists for each of `{grunt, sergeant, general}` and sets `model`, `model_reasoning_effort`, `sandbox_mode` from the pin (exec may promote sandbox)
- [ ] after overlay, `.agents/agents/<name>.md` (flat file, not `<name>/agent.md`) exists for each of `{grunt, sergeant, general}` and pins a gemini id
- [ ] overlay does not write `.agents/agents/<name>/agent.md`
- [ ] overlay does not emit `.claude/agents/explore.md`, `.grok/agents/explore.md`, or `.grok/roles/explore.toml` from the default kit
- [ ] overlay does not emit default agents named `router`, `implementer`, or `architect`
- [ ] overlay owns `.gemini/**` because rulesync 16.12.0 has no `geminicli` target
- [ ] `.gemini/agents/` goldens are labeled shape snapshots, not a live Gemini CLI driver contract
- [ ] grok `grunt` copies have `agents_md: false` after overlay
- [ ] grok `grunt` (exec) does not have `permission_mode: plan` after overlay
- [ ] overlay writes `.grok/roles/<name>.toml` for **all three** default agents (`grunt`, `sergeant`, `general`)
- [ ] each grok role toml sets `model` from `providerPin`, `reasoning_effort` from the pin when present, and `default_capability_mode`
- [ ] grok role `grunt.toml` has `default_capability_mode = "execute"` (read + shell, **no file edits**)
- [ ] grok roles `sergeant.toml` and `general.toml` have `default_capability_mode = "all"` (never `"execute"`)
- [ ] no file in the overlay output tree contains the substring `inherit`
- [ ] `grunt` stays on the grunt model for every provider
- [ ] `sergeant` pins sergeant; on 2-slot providers that model string equals general
- [ ] `general` pins general
- [ ] overlay-owned extra files are listed in a plan: roles, personas, `.gemini/**`, copied hook artifact
- [ ] overlay `checkPlan` reports `missing` / `stale` / `orphaned` with exact relative paths for overlay-owned files
- [ ] a unit test greps every overlay output file for `inherit` and expects zero matches
- [ ] a test documents that 2-slot “if unsure → sergeant” is not cheaper (same model id as general)
- [ ] PR2 tests do not invoke `grunt0 init`, `grunt0 sync`, or `--fix-user-config` (those are PR5)
- [ ] PR2 tests never write `$HOME` or `~/.grok/config.toml`

---

## PR3 — rulesync kit templates (`kit/` canonical)

- [ ] package `kit/` is the canonical kit; repo `.rulesync/` is a later copy (PR5/PR7), not a second SoT
- [ ] kit SoT paths are `kit/.rulesync/**` and `kit/rulesync.jsonc`, not `.claude/`
- [ ] shipped `rulesync.jsonc` targets are exactly `agentsmd`, `claudecode`, `grokcli`, `codexcli`, `antigravity-cli`
- [ ] shipped `rulesync.jsonc` does not name a `geminicli` target
- [ ] shipped features are `rules`, `commands`, `subagents`, `skills` only
- [ ] shipped `rulesync.jsonc` does not enable `mcp`
- [ ] shipped `rulesync.jsonc` does not enable `hooks`
- [ ] `gitignoreTargetsOnly` is `true` in shipped `rulesync.jsonc`
- [ ] `kit/.rulesync/rules/overview.md` is pointer-style: cascade table + “parent = grunt; escalate by spawn” + pointers to `.rulesync/reference/*.md`
- [ ] `overview.md` frontmatter does **not** list `claudecode` in `targets`
- [ ] `kit/.rulesync/rules/CLAUDE.md` exists with `targets: [claudecode]` and body exactly `@AGENTS.md` (plus optional blank lines)
- [ ] running `generate()` twice on the kit produces identical `AGENTS.md` bytes
- [ ] generated `AGENTS.md` from the default kit is ≤ 80 lines
- [ ] generated `AGENTS.md` does not contain superterse style rules
- [ ] Grok-relevant prefix bytes (overview body) appear once: `AGENTS.md` has them; `CLAUDE.md` is only `@AGENTS.md` so Grok does not load a duplicate full prefix
- [ ] `kit/.rulesync/reference/cascade.md` documents the **shipped** protocol: only the parent (grunt session) calls `spawn_subagent`
- [ ] `cascade.md` may note Claude _can_ nest (depth ≥ 2) and Grok cannot; that note is capability, not child instructions
- [ ] `cascade.md` contains the golden strings `need: grunt job:`, `resume_from`, and pre-spawn (grunt isolation first, then up-spawn with verdict)
- [ ] default subagents are exactly `grunt`, `sergeant`, `general`
- [ ] kit does not contain `explore.md`, `router.md`, `implementer.md`, or `architect.md`
- [ ] `grunt.md` is both parent persona and isolation worker: cheap tools in-session + rtk; spawn aside another grunt only for fat dumps; spawn up to sergeant/general
- [ ] `grunt.md` contains `resume_from` and pre-spawn instructions; it is the only default agent body that may mention `spawn_subagent`
- [ ] kit source `grunt.md` puts allowlists in nested `claudecode.tools` (and equivalent per-target sections), not only a top-level `tools:` key
- [ ] `grunt.md` nested allowlist includes Read, Grep, Glob, Bash, WebSearch, WebFetch; no Write
- [ ] `grunt.md` `exec: true`
- [ ] `grunt.md` isolation output contract is `verdict:` ≤8 lines when spawned for a fat dump (`job: search|exec|web|test`)
- [ ] `sergeant.md` is sergeant tier; may Write/Edit; enough prose to not wreck yaml/xml
- [ ] `general.md` is general tier; nasty multi-file, design, hard debug; enough prose
- [ ] `sergeant.md` and `general.md` instruct: do not call `spawn_subagent`; if a fat dump is needed, return `need: grunt job: search|exec|web|test query:…` and stop
- [ ] `sergeant.md` and `general.md` contain zero `spawn_subagent` strings
- [ ] cheap isolation reports (spawned grunt) are superterse; sergeant/general keep enough prose
- [ ] `/terse` skill exists and is not inlined into `AGENTS.md` or `overview.md`
- [ ] `/verbose` skill exists and is not inlined into `AGENTS.md` or `overview.md`
- [ ] overlay emits `.grok/personas/superterse.toml`; parent `AGENTS.md` still does not churn
- [ ] specialization for grep/find/curl/web_search/playwright/vitest lives in spawn task `job:` (`search|exec|web|test`) on **grunt**, not extra agent files
- [ ] kit tests copy `kit/` into a temp dir (no `grunt0 init` CLI)
- [ ] kit tests run `generate()` from `rulesync@16.12.0` then overlay
- [ ] kit tests assert generated agent names === `{grunt, sergeant, general}`
- [ ] kit tests assert no Autorun author names present
- [ ] mutating the terse skill file does not change `overview.md` bytes
- [ ] mutating the terse skill file does not change generated `AGENTS.md` bytes

---

## PR4 — RTK adapters + doctor

- [ ] rtk is detected as a PATH binary: `rtk --version` **and** `rtk gain` (wrong-crate `rtk` without `gain` is treated as missing)
- [ ] missing rtk: fail-open (hooks no-op, doctor warns, exit 0 for hook mode, non-zero for `doctor` when `--strict`)
- [ ] install text is `brew install rtk-ai/tap/rtk` and/or `curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh` — never `cargo install rtk`
- [ ] name-collision note: reachingforthejack/rtk vs rtk-ai/rtk; `rtk gain` is the discriminator
- [ ] Claude: doctor expects `rtk init` PreToolUse matcher present; overlay/sync must not drop it
- [ ] Grok adapter understands camelCase `toolName`/`toolInput` **and** snake_case `tool_input`
- [ ] Grok adapter fail-open: parse error, missing rtk, timeout, no rewrite → empty stdout, exit 0
- [ ] Grok adapter stdout rewrite uses `hookSpecificOutput.updatedInput` equal to the **full** original tool input object with only `command` replaced (preserve `description` and every other key)
- [ ] Grok adapter timeout ≤ 3s
- [ ] Grok adapter injects `--ultra-compact` on rtk subcommands that accept it (grep/rg/curl/wget/vitest/jest/pytest/test/lint/tsc/npm/npx/read/find/diff/json/log/playwright/cargo/ruff/prettier/format)
- [ ] Grok adapter does not double-prefix if command already starts with `rtk`
- [ ] one PreToolUse matcher string is `Bash`; Grok’s alias maps it to `run_terminal_command` (not two hook files)
- [ ] adapter source is TypeScript; tests import `rewriteCommand` and `handleStdin` from `src/hooks/rtk-grok.ts`
- [ ] build emits `dist/hooks/rtk-grok.js` as a **zero-dependency** artifact (no `import`/`require` of grunt0 or node_modules)
- [ ] `dist/hooks/rtk-grok.js` is runnable with `node dist/hooks/rtk-grok.js` (stdin JSON → stdout JSON or empty)
- [ ] Python POC stdin/stdout pairs are committed fixtures; Node `handleStdin` must match them (no `python3` at consumer runtime)
- [ ] PR4 tests run doctor against temp dirs; they do not implement `grunt0 init` copy
- [ ] SessionStart advisory is specified per driver: Claude = merge-preserve a SessionStart entry in `.claude/settings.json` without replacing the hooks object; Grok = `.grok/hooks/rtk.json` (or a sibling json in that dir); Codex/agy = documented best-effort caveat
- [ ] SessionStart advisory never blocks the session (exit 0)
- [ ] `grunt0 doctor` reports: rtk present+correct crate; grok hook installed; claude rtk PreToolUse matcher present; default model is **grunt** pin (user grok config if readable); unused mcp/plugin listing count; inherit scan
- [ ] `grunt0 doctor --json` emits machine-readable JSON with those fields
- [ ] doctor does not assume grok rtk works: prints “live-prove: /hooks lists rtk-grok; git status → rtk git status”
- [ ] doctor default-model docs include Grok `[models] default = "grok-4.5"` and belt-and-suspenders `[subagents.models] explore = "grok-4.5"` and `grunt = "grok-4.5"` (user config; project cannot set it; built-in explore is **not** a kit file)
- [ ] live-prove grok rtk (manual/nightly, not `bun test`): new session, `/hooks` lists rtk-grok, `git status` executes `rtk git status`, `grep x` executes `rtk grep --ultra-compact x`
- [ ] live-prove hook `command` string against `/hooks` (JSON-relative `node rtk-grok.js` vs cwd-relative); pin whichever the live TUI actually runs
- [ ] unit tests drive the adapter with fixture stdin JSON (Grok camelCase, Claude snake_case, already-rtk, missing binary, timeout, malformed JSON)

---

## PR5 — CLI init / sync / check

- [ ] `grunt0 init` copies canonical `kit/` into cwd: `.rulesync/**`, `rulesync.jsonc`
- [ ] `grunt0 init` copies `dist/hooks/rtk-grok.js` byte-for-byte to `.grok/hooks/rtk-grok.js`
- [ ] `grunt0 init` writes `.grok/hooks/rtk.json` with matcher `Bash` and command pinned in PR4 live-prove (until then: `node rtk-grok.js`, JSON-relative)
- [ ] `grunt0 init` prints default-model one-liners (grok user `~/.grok/config.toml` default = grunt pin, claude haiku, codex mini, agy/gemini flash) and Grok `[subagents.models]` explore/grunt pins
- [ ] `grunt0 init` refuses to overwrite existing `.rulesync` files without `--force` (tested)
- [ ] `grunt0 init` does not invent MCP servers
- [ ] `grunt0 init` does not write `~/.grok/config.toml` unless `--fix-user-config` is passed
- [ ] tests for `--fix-user-config` use a temp `GROK_HOME`; default path never touches the real `$HOME`
- [ ] `grunt0 sync` calls `generate()` **in-process** from the `rulesync` package (not a PATH spawn of the `rulesync` binary)
- [ ] `grunt0 sync` runs overlay after `generate()` (overlay always last)
- [ ] `grunt0 sync` does not drop a Claude PreToolUse matcher whose command contains `rtk` (merge-preserve)
- [ ] `grunt0 sync` fails clearly if the `rulesync` package cannot be imported
- [ ] `grunt0 check` computes `expected = applyOverlay(generate({ outputRoots: [tempDir] }))` and byte-compares `expected` to cwd disk
- [ ] `grunt0 check` does **not** call `generate({ check: true })` on the consumer working tree
- [ ] after `grunt0 sync`, `grunt0 check` exits 0 (overlaid pins do not fail check)
- [ ] `grunt0 check` includes `AGENTS.md` in the compared set
- [ ] `grunt0 check` includes `.grok/hooks/rtk-grok.js` bytes vs `dist/hooks/rtk-grok.js`
- [ ] `grunt0 check` includes overlay-owned roles, personas, and pinned agent files
- [ ] `grunt0 check` never writes cwd
- [ ] `grunt0 check` exit 1 on missing/stale/orphaned; prints the exact relative paths
- [ ] a hand-edit of generated `AGENTS.md` fails `grunt0 check`
- [ ] a hand-edit of a generated agent file fails `grunt0 check`
- [ ] `grunt0 check --json` emits missing/stale/orphaned arrays
- [ ] `grunt0 --help` lists `init`, `sync`, `check`, `doctor`, `bench`
- [ ] unknown command / unknown flag → non-zero + usage (tested)
- [ ] consumer scripts documented: `"grunt0": "grunt0"`, `"grunt0:sync": "grunt0 sync"`, `"grunt0:check": "grunt0 check"`
- [ ] every CLI command has tests (temp dirs, real filesystem, no mocked overlay)
- [ ] `src/index.ts` exports pin table + overlay + check helpers used by tests and programmatic consumers
- [ ] round-trip test: copy kit → `generate()` → overlay → check clean (this is the PR5 filesystem integration; PR3 kit tests stay CLI-free)

---

## PR6 — benchmarks

- [ ] `grunt0 bench` compares three paths on fixtures: `naive-general`, `naive-grunt-only`, `grunt0-cascade`
- [ ] fixtures are recorded command outputs (raw + rtk-compressed), not live LLM
- [ ] at least one search-heavy fixture pair is committed bytes from a real `rtk <cmd> --ultra-compact` run versus the raw command (not hand-shrunk)
- [ ] tokenizer is a local estimate (documented encoding, e.g. cl100k as a yardstick); not billed vendor counts
- [ ] accounting formula is implemented as: `tokens(path) = prefix + tool_dumps + spawn_tax * n_spawns + child_bodies`
- [ ] `prefix` is the estimate of the always-on `AGENTS.md` bytes for that path
- [ ] `tool_dumps` is the sum of fixture dump tokens (raw for naive-general; rtk-compressed for cascade cheap tools)
- [ ] `spawn_tax` is a named constant in `kit/bench/prices.json` (child window overhead); cascade isolation and up-spawns increment `n_spawns`
- [ ] `child_bodies` is the estimate of spawned agent bodies included in the child window
- [ ] `$` estimate is `tokens_in * price_in + tokens_out * price_out` using `kit/bench/prices.json`
- [ ] 2-slot sergeant tokens are priced at the **general** row for that provider (no fictional mid-tier rate)
- [ ] 3-slot sergeant tokens are priced at the **sergeant** row
- [ ] naive-general: parent general, `n_spawns = 0`, raw dumps, general prices
- [ ] naive-grunt-only: parent grunt, rtk dumps, `n_spawns = 0`, no sergeant/general spawn (quality not scored)
- [ ] grunt0-cascade: tiny prefix, rtk dumps for cheap tools, isolation spawn of grunt only for fat dumps, one sergeant or general spawn
- [ ] mixed workload fixture: search-heavy (git status, grep, read) + one hard implement
- [ ] test: cascade **token estimate < naive-general** on the mixed fixture
- [ ] test: cascade **$ estimate < naive-general** on the mixed fixture
- [ ] test: cascade isolation path token estimate < “general parent eats raw dump”
- [ ] search-heavy fixture gate: cascade token estimate is ≤ 50% of naive-general on that fixture
- [ ] the 50% figure is a fixture gate, not a vendor-billing claim (stated in bench `--help` and JSON `disclaimer` field)
- [ ] `grunt0 bench --json` writes the report including formula fields, prices used, and disclaimer
- [ ] exit 1 if cascade does not beat naive-general on $ and tokens
- [ ] `bun test` does not call network LLM endpoints

---

## PR7 — dogfood + docs + publish

- [ ] README is the operator manual (install, init, sync, check, doctor, bench, parent-only spawn, rtk, rulesync, default models, non-goals)
- [ ] README lists the actual runtime npm dependency (`rulesync@^16.12.0` and that it pulls Effect/Octokit/MCP SDK/etc.) and that rtk is not an npm dep
- [ ] GitHub README and npm page both exist (owned-package convention)
- [ ] AGENTS.md in this repo is the tiny pointer-style root (dogfood the cache contract)
- [ ] CLAUDE.md in this repo is `@AGENTS.md` only (dogfood the stub split)
- [ ] `kit/` remains canonical; repo `.rulesync/` is produced by `node dist/cli.js init --force` after PR5, not hand-edited as a second SoT
- [ ] dogfood bootstrap cycle called out: not a v0 merge blocker if CI still tests init into a temp dir
- [ ] `grunt0 check` is in CI
- [ ] `files` field publishes `bin/`, `dist/`, `kit/`, `README.md`, `LICENSE`, `SPEC.md`
- [ ] `prepublishOnly` builds
- [ ] release workflow: tag `v*` → npm public (oat-style, trusted publishing)
- [ ] live: grok with no `/model` → session is grunt pin (`grok-4.5`) after documented user-config one-liner (not `bun test`)
- [ ] live: “where is X” = parent grunt greps itself (rtk), not a spawn, not 4.6
- [ ] live: spawn general on Grok, ask it to spawn grunt → child returns `need: grunt job:…` and does not call `spawn_subagent`
- [ ] live claude: session haiku; haiku greps; general = opus; parent sibling-spawns grunt (v0 does not require nested child spawn)
- [ ] `/config-agents` shows grunt = cheap, sergeant = medium (2-slot alias), general = deep
- [ ] after a long turn, cache_read > 0 or investigate prefix drift (mcp/skills listing) — documented procedure, not a new package
- [ ] Codex/agy/gemini default-model one-liners stay documented best-effort; live boxes are human-prove, not `bun test`

---

## Cascade encoding (kit bodies — tested via goldens)

- [ ] grunt standing rules: immediate = no tools; cheap tools = this session + rtk; fat dump = spawn grunt aside (`job:`); sergeant = feature implement; general = nasty multi-file
- [ ] if unsure on **3-slot** → sergeant, not general
- [ ] if unsure on **2-slot** → still sergeant (same model as general); do not pretend it is cheaper
- [ ] parent on grunt does not spawn another grunt for git status / one-file read / 10-hit grep
- [ ] only the parent grunt session calls `spawn_subagent`; sergeant/general return `need: grunt job: search|exec|web|test query:…` and stop
- [ ] after `need:`, parent sibling-spawns grunt, then `spawn_subagent` of the same type with `resume_from: <child id>` and the verdict in the new prompt
- [ ] when a dump is known up front, parent pre-spawns grunt then up-spawns with verdict (no `need:` round-trip)
- [ ] verdict contract on isolation grunt: `verdict: ok|fail|empty`, `n:`, `path:line — fact`, fail first 3 error lines, ≤8 lines, no dumps

---

## Testing bar (cross-cutting)

- [ ] every exported function has tests
- [ ] every CLI command has tests
- [ ] generators round-trip (init → sync → check clean) in PR5+
- [ ] pin matrix exhaustive (PR1 boxes)
- [ ] PR1 coverage 100% lines/fns/branches/statements on `src/pins.ts` and `src/parse.ts`
- [ ] later PRs add 100% coverage on `src/overlay.ts`, `src/hooks/rtk-grok.ts`, CLI parse as those files land
- [ ] do not require 100.00% of comments/bin shims
- [ ] do not leave untested branches in pin/alias/sync logic
