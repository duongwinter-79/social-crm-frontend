import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Idle sign-out (packages/api/src/session.ts). Runs in Node, so a minimal
 * `window` (localStorage shared "across tabs", atob, listeners, timers) is
 * stubbed before the module loads.
 */
const MINUTE = 60_000;

function makeToken(username: string) {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "none" })}.${encode({ sub: "u1", username, roles: ["admin"], exp: 4_102_444_800 })}.sig`;
}

async function loadSession() {
  const storage = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key)
    },
    atob: (value: string) => atob(value),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    setInterval: (fn: () => void, ms: number) => setInterval(fn, ms),
    clearInterval: (id: ReturnType<typeof setInterval>) => clearInterval(id)
  });
  vi.resetModules();
  const session = await import("../../../../packages/api/src/session");
  return { session, storage };
}

describe("idle sign-out", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-27T09:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts the idle clock on sign-in, and token refreshes do not reset it", async () => {
    const { session, storage } = await loadSession();
    const store = session.useSessionStore;
    store.getState().setSession(makeToken("linh"));
    const signedInAt = store.getState().lastActivityAt;
    expect(storage.get("social-crm.last-activity")).toBe(String(signedInAt));

    vi.advanceTimersByTime(10 * MINUTE);
    store.getState().setSession(makeToken("linh")); // background refresh
    expect(store.getState().lastActivityAt).toBe(signedInAt);
    expect(storage.get("social-crm.last-activity")).toBe(String(signedInAt));
  });

  it("signs out after 30 idle minutes and revokes the server session", async () => {
    const { session } = await loadSession();
    const store = session.useSessionStore;
    const onIdleTimeout = vi.fn();
    const stop = session.startSessionLifecycle({ onIdleTimeout });
    store.getState().setSession(makeToken("linh"));

    vi.advanceTimersByTime(31 * MINUTE);
    expect(store.getState().accessToken).toBeNull();
    expect(store.getState().logoutReason).toBe("idle");
    expect(onIdleTimeout).toHaveBeenCalledTimes(1);
    stop();
  });

  it("does not sign out while the operator is active in another tab", async () => {
    const { session, storage } = await loadSession();
    const store = session.useSessionStore;
    const onIdleTimeout = vi.fn();
    const stop = session.startSessionLifecycle({ onIdleTimeout });
    store.getState().setSession(makeToken("linh"));

    // This tab sees no activity; another tab keeps writing the shared clock.
    for (let minute = 1; minute <= 40; minute++) {
      vi.advanceTimersByTime(MINUTE);
      storage.set("social-crm.last-activity", String(Date.now()));
    }
    expect(store.getState().accessToken).not.toBeNull();
    expect(onIdleTimeout).not.toHaveBeenCalled();
    stop();
  });

  it("throttles shared activity writes and clears them on sign-out", async () => {
    const { session, storage } = await loadSession();
    const store = session.useSessionStore;
    store.getState().setSession(makeToken("linh"));
    const first = storage.get("social-crm.last-activity");

    vi.advanceTimersByTime(5_000);
    store.getState().registerActivity();
    expect(storage.get("social-crm.last-activity")).toBe(first);
    vi.advanceTimersByTime(15_000);
    store.getState().registerActivity();
    expect(storage.get("social-crm.last-activity")).toBe(String(Date.now()));

    const epoch = store.getState().sessionEpoch;
    store.getState().clearSession("manual");
    expect(storage.has("social-crm.last-activity")).toBe(false);
    // In-flight refreshes compare this to discard tokens that arrive after sign-out.
    expect(store.getState().sessionEpoch).toBe(epoch + 1);
  });

  it("flags a session left signed in past the timeout (browser closed or asleep)", async () => {
    const { session, storage } = await loadSession();
    expect(session.isIdleTimeoutExceeded()).toBe(false); // never signed in here
    storage.set("social-crm.last-activity", String(Date.now() - 29 * MINUTE));
    expect(session.isIdleTimeoutExceeded()).toBe(false);
    storage.set("social-crm.last-activity", String(Date.now() - 31 * MINUTE));
    expect(session.isIdleTimeoutExceeded()).toBe(true);
  });
});
