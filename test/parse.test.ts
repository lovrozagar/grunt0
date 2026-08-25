import { describe, expect, test } from "vitest";
import { parseAgentSource, parseFrontmatter } from "../src/parse.ts";

describe("parseFrontmatter", () => {
  test("returns body as-is without fence", () => {
    expect(parseFrontmatter("hello")).toEqual({ meta: {}, body: "hello" });
  });
  test("parses simple keys and quoted values", () => {
    const { meta, body } = parseFrontmatter(`---
name: grunt
description: "cheap worker"
tier: grunt
---
body here
`);
    expect(meta.name).toBe("grunt");
    expect(meta.description).toBe("cheap worker");
    expect(meta.tier).toBe("grunt");
    expect(body).toBe("body here");
  });
  test("skips indented and non-kv lines", () => {
    const { meta } = parseFrontmatter(`---
name: x
  nested: ignored-as-top
not a kv
---
`);
    expect(meta.name).toBe("x");
    expect(meta.nested).toBeUndefined();
  });
  test("handles crlf fences", () => {
    const { meta, body } = parseFrontmatter("---\r\nname: a\r\n---\r\nbody");
    expect(meta.name).toBe("a");
    expect(body).toBe("body");
  });
  test("unclosed fence is not frontmatter", () => {
    expect(parseFrontmatter("---\nname: a").meta).toEqual({});
  });
  test("skips tab-indented and invalid keys", () => {
    const { meta } = parseFrontmatter(`---
name: ok
\tnested: no
foo bar: no
:novalue
---
`);
    expect(meta.name).toBe("ok");
    expect(meta.nested).toBeUndefined();
  });
  test("single quotes", () => {
    const { meta } = parseFrontmatter(`---
name: 'grunt'
---
`);
    expect(meta.name).toBe("grunt");
  });
});

describe("parseAgentSource", () => {
  test("empty without frontmatter", () => {
    const { meta, body } = parseAgentSource("plain");
    expect(meta.name).toBe("");
    expect(body).toBe("plain");
    expect(meta.claudecodeTools).toEqual([]);
  });
  test("inline tools list", () => {
    const src = `---
name: grunt
description: parent
tier: grunt
exec: true
claudecode:
  tools: [Read, Grep, Glob, Bash, WebSearch, WebFetch]
  disallowedTools: [Write, Edit]
---
You are grunt.
`;
    const { meta, body } = parseAgentSource(src);
    expect(meta.name).toBe("grunt");
    expect(meta.exec).toBe("true");
    expect(meta.claudecodeTools).toEqual(["Read", "Grep", "Glob", "Bash", "WebSearch", "WebFetch"]);
    expect(meta.claudecodeDisallowed).toEqual(["Write", "Edit"]);
    expect(body).toContain("You are grunt");
  });
  test("dashed tools list", () => {
    const src = `---
name: grunt
claudecode:
  tools:
    - Read
    - Grep
  disallowedTools:
    - Write
---
x
`;
    const { meta } = parseAgentSource(src);
    expect(meta.claudecodeTools).toEqual(["Read", "Grep"]);
    expect(meta.claudecodeDisallowed).toEqual(["Write"]);
  });
  test("missing claudecode section", () => {
    const { meta } = parseAgentSource(`---
name: sergeant
tier: sergeant
---
hi
`);
    expect(meta.claudecodeTools).toEqual([]);
    expect(meta.tier).toBe("sergeant");
  });
  test("empty inline list", () => {
    const { meta } = parseAgentSource(`---
name: x
claudecode:
  tools: []
---
`);
    expect(meta.claudecodeTools).toEqual([]);
  });
  test("same-line section value", () => {
    const { meta } = parseAgentSource(`---
name: x
claudecode: not-a-map
---
`);
    expect(meta.claudecodeTools).toEqual([]);
  });
  test("tools key missing and dashed list stops", () => {
    const { meta } = parseAgentSource(`---
name: x
claudecode:
  other: 1
  tools:
    - Read
    not-an-item
---
`);
    expect(meta.claudecodeTools).toEqual(["Read"]);
  });
  test("non-bracket tools value", () => {
    const { meta } = parseAgentSource(`---
name: x
claudecode:
  tools: Read
---
`);
    expect(meta.claudecodeTools).toEqual([]);
  });
  test("empty comma slots dropped; missing name keys", () => {
    const { meta } = parseAgentSource(`---
claudecode:
  tools: [Read,,Grep]
---
x
`);
    expect(meta.name).toBe("");
    expect(meta.tier).toBe("");
    expect(meta.exec).toBe("");
    expect(meta.description).toBe("");
    expect(meta.claudecodeTools).toEqual(["Read", "Grep"]);
    expect(meta.claudecodeDisallowed).toEqual([]);
  });
  test("inline list must be a closed bracket pair", () => {
    const a = parseAgentSource(`---
name: x
claudecode:
  tools: Read]
---
`);
    expect(a.meta.claudecodeTools).toEqual([]);
    const b = parseAgentSource(`---
name: x
claudecode:
  tools: [Read
---
`);
    expect(b.meta.claudecodeTools).toEqual([]);
  });
  test("section ends at next top-level key", () => {
    const { meta } = parseAgentSource(`---
name: x
claudecode:
  tools: [Read]
tier: grunt
---
`);
    expect(meta.claudecodeTools).toEqual(["Read"]);
    expect(meta.tier).toBe("grunt");
  });
  test("claudecode header with trailing text is ignored", () => {
    const { meta } = parseAgentSource(`---
name: x
claudecode: leftover
  tools: [Read]
---
`);
    expect(meta.claudecodeTools).toEqual([]);
  });
});
