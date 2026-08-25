export type AgentMeta = {
  name: string;
  description: string;
  tier: string;
  exec: string;
  claudecodeTools: string[];
  claudecodeDisallowed: string[];
};

function unquote(value: string): string {
  const t = value.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseInlineList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];
  const inner = trimmed.slice(1, -1).trim();
  if (inner.length === 0) return [];
  const out: string[] = [];
  for (const part of inner.split(",")) {
    const item = unquote(part);
    if (item.length > 0) out.push(item);
  }
  return out;
}

function splitFrontmatter(content: string): { raw: string; body: string } | null {
  if (!content.startsWith("---")) return null;
  const rest = content.slice(3).replace(/^\r?\n/, "");
  const end = rest.search(/\r?\n---\r?\n?/);
  if (end < 0) return null;
  const raw = rest.slice(0, end);
  const after = rest.slice(end).replace(/^\r?\n---\r?\n?/, "");
  return { raw, body: after.trim() };
}

/** Parse kit `.rulesync/subagents/*.md` frontmatter (simple YAML subset). */
export function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const split = splitFrontmatter(content);
  if (!split) return { meta: {}, body: content.trim() };
  const meta: Record<string, string> = {};
  for (const line of split.raw.split(/\r?\n/)) {
    if (line.startsWith(" ") || line.startsWith("\t")) continue;
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const key = line.slice(0, colon);
    if (!/^[A-Za-z0-9_-]+$/.test(key)) continue;
    meta[key] = unquote(line.slice(colon + 1));
  }
  return { meta, body: split.body };
}

function sectionLines(raw: string, section: string): string[] {
  const lines = raw.split(/\r?\n/);
  const header = `${section}:`;
  const start = lines.findIndex(
    (l) => l === header || l.startsWith(`${header} `) || l.startsWith(`${header}\t`),
  );
  if (start < 0) return [];
  if (lines[start] !== header) return [];
  const collected: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] as string;
    if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("\t")) break;
    collected.push(line);
  }
  return collected;
}

function listFromLines(lines: string[], key: string): string[] {
  const header = `${key}:`;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    const trimmed = line.trim();
    if (trimmed.startsWith(header)) {
      const rest = trimmed.slice(header.length).trim();
      if (rest.startsWith("[")) return parseInlineList(rest);
      const out: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const itemLine = lines[j] as string;
        const t = itemLine.trim();
        if (!t.startsWith("- ")) break;
        out.push(unquote(t.slice(2)));
      }
      return out;
    }
  }
  return [];
}

export function parseAgentSource(content: string): { meta: AgentMeta; body: string } {
  const split = splitFrontmatter(content);
  if (!split) {
    return {
      meta: {
        name: "",
        description: "",
        tier: "",
        exec: "",
        claudecodeTools: [],
        claudecodeDisallowed: [],
      },
      body: content.trim(),
    };
  }
  const { meta, body } = parseFrontmatter(content);
  const claude = sectionLines(split.raw, "claudecode");
  return {
    meta: {
      name: meta.name ?? "",
      description: meta.description ?? "",
      tier: meta.tier ?? "",
      exec: meta.exec ?? "",
      claudecodeTools: listFromLines(claude, "tools"),
      claudecodeDisallowed: listFromLines(claude, "disallowedTools"),
    },
    body,
  };
}
