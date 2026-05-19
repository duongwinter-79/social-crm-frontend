export type SearchParamValue = string | number | null | undefined;

export function readPageIndex(params: URLSearchParams) {
  const value = Number(params.get("page") ?? "1");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) - 1 : 0;
}

export function readNumberOption<T extends readonly number[]>(
  params: URLSearchParams,
  key: string,
  options: T,
  fallback: T[number]
): T[number] {
  const value = Number(params.get(key));
  return options.includes(value) ? value : fallback;
}

export function readStringOption<T extends readonly string[]>(
  params: URLSearchParams,
  key: string,
  options: T,
  fallback = ""
) {
  const value = params.get(key) ?? fallback;
  return options.includes(value) ? value : fallback;
}

export function applySearchParamUpdates(
  current: URLSearchParams,
  updates: Record<string, SearchParamValue>,
  defaults: Record<string, SearchParamValue> = {}
) {
  const next = new URLSearchParams(current);
  Object.entries(updates).forEach(([key, value]) => {
    const defaultValue = defaults[key];
    if (value === null || value === undefined || value === "" || String(value) === String(defaultValue ?? "")) {
      next.delete(key);
      return;
    }
    next.set(key, String(value));
  });
  return next;
}
