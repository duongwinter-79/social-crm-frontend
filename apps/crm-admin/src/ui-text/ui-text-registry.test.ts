import { describe, expect, it } from "vitest";
import { uiTextRegistry } from "./ui-text.registry";

/**
 * Guard rails for the UI-text registry. These run under `npm test` so a stale
 * <UiText id> (or a text("key") that no longer matches the registry) fails CI
 * instead of silently rendering the raw key in production.
 *
 * Source is read with Vite's import.meta.glob (raw, eager) rather than node fs
 * so the test type-checks under the app's vite/client-only tsconfig.
 */

const rawModules = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true
}) as Record<string, string>;

const sourceFiles = Object.entries(rawModules).filter(([path]) => !/\.test\.tsx?$/.test(path));

// Keys referenced from JSX/components:
//   - <UiText id="..."> render seam
//   - text("...") imperative resolver (attributes, etc.)
function collectUsedKeys() {
  const used = new Map<string, string[]>();
  const patterns = [/<UiText\s+[^>]*\bid="([^"]+)"/g, /\btext\(\s*"([^"]+)"/g];
  for (const [path, source] of sourceFiles) {
    for (const re of patterns) {
      re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(source))) {
        const list = used.get(match[1]) ?? [];
        list.push(path);
        used.set(match[1], list);
      }
    }
  }
  return used;
}

describe("ui-text registry", () => {
  const keys = uiTextRegistry.map((entry) => entry.key);
  const keySet = new Set(keys);

  it("has no duplicate keys", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const key of keys) {
      if (seen.has(key)) dupes.push(key);
      seen.add(key);
    }
    expect(dupes).toEqual([]);
  });

  it("every key carries non-empty EN + VI defaults", () => {
    const bad = uiTextRegistry
      .filter((e) => !e.defaultText?.en?.trim() || !e.defaultText?.vi?.trim())
      .map((e) => e.key);
    expect(bad).toEqual([]);
  });

  it("default text respects its own maxLength", () => {
    const over = uiTextRegistry
      .filter((e) => e.maxLength && (e.defaultText.en.length > e.maxLength || e.defaultText.vi.length > e.maxLength))
      .map((e) => `${e.key} (max ${e.maxLength})`);
    expect(over).toEqual([]);
  });

  it("every <UiText id> / text() key referenced in source exists in the registry", () => {
    const used = collectUsedKeys();
    const missing: string[] = [];
    for (const [key, files] of used) {
      if (!keySet.has(key)) {
        missing.push(`${key}  ←  ${[...new Set(files)].join(", ")}`);
      }
    }
    expect(missing, `Unknown UI-text keys referenced in source:\n${missing.join("\n")}`).toEqual([]);
  });

  it("reports registry keys that are not referenced anywhere (warning only)", () => {
    // Broad scan: a key counts as referenced if its quoted literal appears in
    // any source file. This catches indirect references (e.g. navTextKeys maps
    // a route to "shell.nav.*.label", then renders <UiText id={keys.label} />).
    const allSource = sourceFiles.map(([, source]) => source).join("\n");
    const unused = keys.filter((key) => !allSource.includes(`"${key}"`));
    if (unused.length) {
      console.warn(`[ui-text] ${unused.length} registry key(s) not referenced in source:\n  ${unused.join("\n  ")}`);
    }
    expect(Array.isArray(unused)).toBe(true);
  });
});
