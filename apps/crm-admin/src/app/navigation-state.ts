import { useEffect } from "react";

export type NavigationReturnState = {
  from?: string;
  fromLabel?: string;
};

type RouteLocation = {
  pathname: string;
  search: string;
};

const RETURN_SCROLL_STORAGE_PREFIX = "crm:return-scroll:";

export function currentRoutePath(location: RouteLocation) {
  return `${location.pathname}${location.search}`;
}

export function createReturnState(location: RouteLocation, fromLabel: string): NavigationReturnState {
  return {
    from: currentRoutePath(location),
    fromLabel
  };
}

export function saveRouteScroll(location: RouteLocation) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    scrollStorageKey(currentRoutePath(location)),
    JSON.stringify({ y: window.scrollY })
  );
}

export function useRestoreRouteScroll(location: RouteLocation, ready = true) {
  const path = currentRoutePath(location);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;

    const key = scrollStorageKey(path);
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return;

    window.sessionStorage.removeItem(key);

    let y = 0;
    try {
      const parsed = JSON.parse(raw) as { y?: unknown };
      y = typeof parsed.y === "number" && Number.isFinite(parsed.y) ? parsed.y : 0;
    } catch {
      y = 0;
    }

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: y, left: 0, behavior: "auto" });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [path, ready]);
}

export function resolveReturnState(
  state: unknown,
  fallback: { from: string; fromLabel: string }
): Required<NavigationReturnState> {
  if (state && typeof state === "object") {
    const candidate = state as NavigationReturnState;
    if (candidate.from && isInternalPath(candidate.from)) {
      return {
        from: candidate.from,
        fromLabel: candidate.fromLabel || fallback.fromLabel
      };
    }
  }

  return fallback;
}

function isInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !/^[a-z][a-z0-9+.-]*:/i.test(value);
}

function scrollStorageKey(path: string) {
  return `${RETURN_SCROLL_STORAGE_PREFIX}${path}`;
}
