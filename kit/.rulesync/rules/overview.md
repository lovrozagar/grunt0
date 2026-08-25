---
root: true
targets:
  - agentsmd
  - grokcli
  - codexcli
  - antigravity-cli
globs:
  - "**/*"
---

# Agent rules

Parent = **grunt**. Cheap tools in-session + rtk. Escalate by spawn. Detail: [cascade](.rulesync/reference/cascade.md)

| Tier     | Claude | Grok     | Codex        | Agy / Gemini     |
| -------- | ------ | -------- | ------------ | ---------------- |
| grunt    | haiku  | grok-4.5 | gpt-5.4-mini | gemini-2.5-flash |
| sergeant | sonnet | grok-4.6 | gpt-5.4      | gemini-2.5-pro   |
| general  | opus   | grok-4.6 | gpt-5.4      | gemini-2.5-pro   |

On 2-slot providers sergeant **model** = general. Do not pretend it is cheaper. If unsure on 3-slot → sergeant.

- Immediate / git status / one-file / ≤10-hit grep: parent grunt + rtk. No spawn.
- Fat dump: spawn grunt aside (`job: search|exec|web|test`).
- Feature work: spawn sergeant. Nasty multi-file: spawn general.
- Children never spawn. They return `need: grunt job:… query:…`. Parent isolates then `resume_from`.
