import { create } from "zustand";
import type { AuthTokens, AuthUser } from "./types";

const ACCESS_KEY = "social-crm.access-token";
const REFRESH_KEY = "social-crm.refresh-token";

export function readStoredTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;

  const access_token = window.localStorage.getItem(ACCESS_KEY);
  const refresh_token = window.localStorage.getItem(REFRESH_KEY);
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

export function storeTokens(tokens: AuthTokens | null) {
  if (typeof window === "undefined") return;
  if (!tokens) {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    return;
  }
  window.localStorage.setItem(ACCESS_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

interface SessionState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  setSession: (tokens: AuthTokens | null, user?: AuthUser | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  tokens: readStoredTokens(),
  setSession: (tokens, user = null) => {
    storeTokens(tokens);
    set({ tokens, user });
  },
  clearSession: () => {
    storeTokens(null);
    set({ tokens: null, user: null });
  }
}));
