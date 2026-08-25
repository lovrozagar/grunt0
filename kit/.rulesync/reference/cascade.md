---
tags: [cascade]
---

# Cascade

Shipped protocol: **parent-only spawn**. Only the parent grunt session calls `spawn_subagent`. Sergeant and general never spawn. Isolation is a **grunt sibling**.

Capability note (not child instructions): Claude can nest when max subagent depth ≥ 2. Grok cannot (depth 1). v0 ignores nesting.

## Parent grunt

1. Immediate / tiny lookup (git status, one-file read, ≤10-hit grep): do it here + rtk. Do not spawn.
2. Fat dump: `spawn_subagent` type=grunt with `job: search|exec|web|test`. Isolated window. Expect `verdict:`.
3. Feature implement: spawn sergeant. Nasty multi-file / design / hard debug: spawn general.
4. 3-slot unsure → sergeant, not general. 2-slot unsure → still sergeant (same model as general; not cheaper).

## Pre-spawn

When a dump is known up front: spawn grunt isolation first, then up-spawn sergeant/general with the `verdict:` in the prompt. No `need:` round-trip.

## Late dump (`need:` + `resume_from`)

If sergeant/general still needs a fat dump: it returns `need: grunt job: search|exec|web|test query:…` and **stops** (must complete). Parent sibling-spawns grunt, then `spawn_subagent` of the same type with `resume_from: <child id>` and the verdict in the new prompt. Do not fresh-spawn the child.

## Isolation grunt `verdict:`

```
verdict: ok|fail|empty
n: <count>
- path:line — fact
```

Fail: first 3 error lines. ≤8 lines. No dumps, recap, HTML, JSON, full logs.
