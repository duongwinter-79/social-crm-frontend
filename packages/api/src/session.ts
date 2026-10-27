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
/**
 * Last real user activity (epoch ms), shared by every tab of this browser so
 * the idle timeout reflects the operator, not one tab: a background tab must
 * not sign out someone working in another tab. Not a secret. Cleared on sign-out.
 */
const LAST_ACTIVITY_KEY = "social-crm.last-activity";
/** Throttle for writing shared activity (activity events fire on every mouse move). */
const SHARED_ACTIVITY_WRITE_MS = 15_000;
let lastSharedActivityWrite = 0;

function readSharedActivity(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const value = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeSharedActivity(at: number | null) {
  if (typeof window === "undefined") return;
  try {
    if (at === null) window.localStorage.removeItem(LAST_ACTIVITY_KEY);
    else window.localStorage.setItem(LAST_ACTIVITY_KEY, String(at));
  } catch {
    // Storage blocked: the idle timeout falls back to this tab's own activity.
  }
  lastSharedActivityWrite = at ?? 0;
}

/**
 * True when this browser had a signed-in session whose last activity is older
 * than the idle timeout — e.g. the laptop slept or the browser was closed while
 * signed in. The refresh cookie may still be valid, so the session must be
 * revoked rather than restored.
 */
export function isIdleTimeoutExceeded(now = Date.now()): boolean {
  const lastActivity = readSharedActivity();
  return lastActivity !== null && now - lastActivity > IDLE_TIMEOUT_MINUTES * 60_000;
}

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
  /**
   * Incremented whenever the session ends. A token refresh that started
   * before a sign-out compares epochs and is discarded, so a late response
   * cannot silently sign the user back in.
   */
  sessionEpoch: number;
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
  sessionEpoch: 0,
  setSession: (accessToken) => {
    if (!accessToken) {
      set({ accessToken: null, user: null });
      return;
    }
    // Token rotation (refreshes triggered by background polling) is not user
    // activity; only a fresh sign-in resets the idle clock.
    const isFreshSession = !get().accessToken;
    const now = Date.now();
    set({
      accessToken,
      user: decodeJwtUser(accessToken),
      lastActivityAt: isFreshSession ? now : get().lastActivityAt,
      logoutReason: null
    });
    if (isFreshSession) writeSharedActivity(now);
  },
  clearSession: (reason = "manual") => {
    set({ accessToken: null, user: null, logoutReason: reason, sessionEpoch: get().sessionEpoch + 1 });
    writeSharedActivity(null);
    if (reason === "manual" || reason === "idle") {
      broadcast({ type: "logout" });
    }
  },
  registerActivity: () => {
    const now = Date.now();
    set({ lastActivityAt: now });
    if (now - lastSharedActivityWrite >= SHARED_ACTIVITY_WRITE_MS) writeSharedActivity(now);
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
  const state = useSessionStore.getState();
  useSessionStore.setState({
    accessToken,
    user: decodeJwtUser(accessToken),
    // Another tab refreshing its token is not activity in this one.
    lastActivityAt: state.accessToken ? state.lastActivityAt : Date.now(),
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
export type SessionLifecycleOptions = {
  /**
   * Called after an idle sign-out clears the local session. Must revoke the
   * server-side refresh session; otherwise a page reload silently restores it.
   */
  onIdleTimeout?: () => void;
};

export function startSessionLifecycle(options: SessionLifecycleOptions = {}): () => void {
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
        store.setState({ accessToken: null, user: null, logoutReason: "remote", sessionEpoch: state.sessionEpoch + 1 });
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
    // Activity in any tab of this browser keeps the session alive.
    const lastActivity = Math.max(state.lastActivityAt, readSharedActivity() ?? 0);
    if (Date.now() - lastActivity > idleLimitMs) {
      state.clearSession("idle");
      options.onIdleTimeout?.();
    }
  }

  const ch = getChannel();
  ch?.addEventListener("message", onChannelMessage);
  window.addEventListener("mousemove", onActivity, { passive: true });
  window.addEventListener("keydown", onActivity, { passive: true });
  window.addEventListener("click", onActivity, { passive: true });
  window.addEventListener("pointerdown", onActivity, { passive: true });
  window.addEventListener("wheel", onActivity, { passive: true });

  const idleTimer = window.setInterval(checkIdle, idleIntervalMs);

  return () => {
    ch?.removeEventListener("message", onChannelMessage);
    window.removeEventListener("mousemove", onActivity);
    window.removeEventListener("keydown", onActivity);
    window.removeEventListener("click", onActivity);
    window.removeEventListener("pointerdown", onActivity);
    window.removeEventListener("wheel", onActivity);
    window.clearInterval(idleTimer);
  };
}
