// Small word-level diff for short UI strings. No external dependency —
// an LCS over whitespace-delimited tokens is plenty for labels/headers and
// avoids the diacritic noise a character diff produces on Vietnamese text.

export type DiffSegment = {
  type: "same" | "add" | "remove";
  value: string;
};

function tokenize(value: string): string[] {
  // Keep the whitespace runs as their own tokens so re-joining is lossless.
  return value.length ? value.split(/(\s+)/).filter((part) => part.length > 0) : [];
}

export function diffWords(before: string, after: string): DiffSegment[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;

  // LCS length table.
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const segments: DiffSegment[] = [];
  const push = (type: DiffSegment["type"], value: string) => {
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.value += value;
    else segments.push({ type, value });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push("remove", a[i]);
      i += 1;
    } else {
      push("add", b[j]);
      j += 1;
    }
  }
  while (i < n) push("remove", a[i++]);
  while (j < m) push("add", b[j++]);

  return segments;
}

export function UiTextDiff(props: { before: string; after: string; className?: string }) {
  const segments = diffWords(props.before, props.after);
  const unchanged = segments.every((segment) => segment.type === "same");
  if (unchanged) {
    return <span className={`text-xs text-slate-400 ${props.className ?? ""}`}>No change from default</span>;
  }
  return (
    <span className={`text-xs leading-5 ${props.className ?? ""}`}>
      {segments.map((segment, index) => {
        if (segment.type === "same") {
          return (
            <span key={index} className="text-slate-500">
              {segment.value}
            </span>
          );
        }
        if (segment.type === "remove") {
          return (
            <span key={index} className="rounded bg-rose-100 text-rose-700 line-through decoration-rose-400">
              {segment.value}
            </span>
          );
        }
        return (
          <span key={index} className="rounded bg-emerald-100 text-emerald-700">
            {segment.value}
          </span>
        );
      })}
    </span>
  );
}
