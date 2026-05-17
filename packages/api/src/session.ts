import { create } from "zustand";
import type { AuthUser } from "./types";

/**
 * Step 7F migrated the refresh token to an httpOnly cookie. The frontend now
 * only handles the short-lived access token, kept in memory (Zustand) and
 * never persisted. This closes the localStorage XSS exposure and prevents
 * scripts from reading either token.
 *
 * Cross-tab sync uses BroadcastChannel rather than the storage event because
 * we no longer write tokens to localStorage. Browsers without BroadcastChannel
 * (very old) fall through to per-tab session — acceptable degradation.
 */

const LEGACY_ACCESS_KEY = "social-crm.access-token";
const LEGACY_REFRESH_KEY = "social-crm.refresh-token";
const SESSION_CHANNEL_NAME = "social-crm-session";

/** Decoded JWT payload subset we rely on. */
export interface DecodedAccessToken {
  user: AuthUser | null;
  /** Unix epoch seconds. Null when the token has no exp claim or fails to parse. */
  expiresAt: number | null;
}

function decodeJwt(token: string): DecodedAccessToken {
  if (typeof window === "undefined") return { user: null, expiresAt: null };
  try {
    const base64 = token.split(".")[1];
    const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(normalized));
    return {
      user: {
        userId: payload.sub,
        username: payload.username,
        roles: payload.roles ?? []
      },
      expiresAt: typeof payload.exp === "number" ? payload.exp : null
    };
  } catch {
    return { user: null, expiresAt: null };
  }
}

export function decodeJwtUser(token: string): AuthUser | null {
  return decodeJwt(token).user;
}

export function getAccessTokenExpiresAt(token: string | null | undefined): number | null {
  if (!token) return null;
  return decodeJwt(token).expiresAt;
}

export function isAccessTokenStale(secondsBefore: number, token: string | null | undefined): boolean {
  const exp = getAccessTokenExpiresAt(token);
  if (exp === null) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp - now <= secondsBefore;
}

/**
 * One-shot migration: clear any legacy refresh / access token rows in
 * localStorage that older versions of the app wrote. Idempotent.
 */
function clearLegacyStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_ACCESS_KEY);
  window.localStorage.removeItem(LEGACY_REFRESH_KEY);
}

/**
 * Cross-tab session events. Sent on logout (so other tabs drop the access
 * token) and on login (so other tabs adopt the new token without a reload).
 */
type SessionEvent =
  | { type: "login"; access_token: string }
  | { type: "logout" };

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
  return channel;
}

function broadcast(event: SessionEvent) {
  const ch = getChannel();
  if (ch) ch.postMessage(event);
}

interface SessionState {
  user: AuthUser | null;
  /** Short-lived access token. In-memory only — never written to disk. */
  accessToken: string | null;
  /** Last meaningful UI activity (epoch ms). Drives the idle timeout. */
  lastActivityAt: number;
  /** Reason for the most recent logout, surfaced on the login screen. */
  logoutReason: "idle" | "expired" | "manual" | "remote" | null;
  setSession: (accessToken: string | null) => void;
  clearSession: (reason?: SessionState["logoutReason"]) => void;
  registerActivity: () => void;
  consumeLogoutReason: () => SessionState["logoutReason"];
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  accessToken: null,
  lastActivityAt: Date.now(),
  logoutReason: null,
  setSession: (accessToken) => {
    if (!accessToken) {
      set({ accessToken: null, user: null });
      return;
    }
    set({
      accessToken,
      user: decodeJwtUser(accessToken),
      lastActivityAt: Date.now(),
      logoutReason: null
    });
  },
  clearSession: (reason = "manual") => {
    set({ accessToken: null, user: null, logoutReason: reason });
    if (reason === "manual" || reason === "idle") {
      broadcast({ type: "logout" });
    }
  },
  registerActivity: () => {
    set({ lastActivityAt: Date.now() });
  },
  consumeLogoutReason: () => {
    const reason = get().logoutReason;
    set({ logoutReason: null });
    return reason;
  }
}));

/**
 * Adopt a token coming from another tab (cross-tab login sync). Internal use
 * by the session lifecycle; not part of the public API.
 */
function adoptTokenFromBroadcast(accessToken: string) {
  useSessionStore.setState({
    accessToken,
    user: decodeJwtUser(accessToken),
    lastActivityAt: Date.now(),
    logoutReason: null
  });
}

/**
 * Notify other tabs that this tab just received a fresh access token. Called
 * after login and after a successful refresh.
 */
export function notifyLoginAcrossTabs(accessToken: string) {
  broadcast({ type: "login", access_token: accessToken });
}

/** Idle timeout, in minutes. Operator with no activity for this long is logged out. */
export const IDLE_TIMEOUT_MINUTES = 30;

/**
 * Set up cross-tab sync (via BroadcastChannel) and idle timeout. Call once at
 * app boot. Returns a teardown function for hot-reload safety.
 */
export function startSessionLifecycle(): () => void {
  if (typeof window === "undefined") return () => undefined;

  // One-time legacy cleanup. Older builds wrote tokens to localStorage; clear
  // them so a stale refresh_token can't be exfiltrated by an XSS sidewinder.
  clearLegacyStorage();

  const store = useSessionStore;

  function onChannelMessage(event: MessageEvent<SessionEvent>) {
    const data = event.data;
    if (!data) return;
    if (data.type === "logout") {
      const state = store.getState();
      if (state.accessToken) {
        store.setState({ accessToken: null, user: null, logoutReason: "remote" });
      }
    } else if (data.type === "login" && data.access_token) {
      adoptTokenFromBroadcast(data.access_token);
    }
  }

  function onActivity() {
    if (store.getState().accessToken) {
      store.getState().registerActivity();
    }
  }

  const idleIntervalMs = 30_000;
  const idleLimitMs = IDLE_TIMEOUT_MINUTES * 60_000;

  function checkIdle() {
    const state = store.getState();
    if (!state.accessToken) return;
    if (Date.now() - state.lastActivityAt > idleLimitMs) {
      state.clearSession("idle");
    }
  }

  const ch = getChannel();
  ch?.addEventListener("message", onChannelMessage);
  window.addEventListener("mousemove", onActivity, { passive: true });
  window.addEventListener("keydown", onActivity, { passive: true });
  window.addEventListener("click", onActivity, { passive: true });

  const idleTimer = window.setInterval(checkIdle, idleIntervalMs);

  return () => {
    ch?.removeEventListener("message", onChannelMessage);
    window.removeEventListener("mousemove", onActivity);
    window.removeEventListener("keydown", onActivity);
    window.removeEventListener("click", onActivity);
    window.clearInterval(idleTimer);
  };
}
