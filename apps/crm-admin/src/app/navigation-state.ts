export type NavigationReturnState = {
  from?: string;
  fromLabel?: string;
};

type RouteLocation = {
  pathname: string;
  search: string;
};

export function currentRoutePath(location: RouteLocation) {
  return `${location.pathname}${location.search}`;
}

export function createReturnState(location: RouteLocation, fromLabel: string): NavigationReturnState {
  return {
    from: currentRoutePath(location),
    fromLabel
  };
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
