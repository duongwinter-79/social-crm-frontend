import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * packages/api/src/client.ts auth recovery. Runs in Node with a stubbed
 * `window` and a fake axios adapter standing in for the backend.
 */
/** exp defaults to far future; pass an epoch-seconds value to make a stale token. */
function makeToken(exp = 4_102_444_800) {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "none" })}.${encode({ sub: "u1", username: "linh", roles: ["admin"], exp })}.sig`;
}

async function loadClient(respond: (url: string) => { status: number; data?: unknown }) {
  vi.stubGlobal("window", {
    localStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
    atob: (value: string) => atob(value)
  });
  vi.resetModules();
  const client = await import("../../../../packages/api/src/client");
  const session = await import("../../../../packages/api/src/session");
  const calls: string[] = [];
  const http = (client.apiClient as unknown as { http: { defaults: { adapter: unknown } } }).http;
  http.defaults.adapter = async (config: { url?: string }) => {
    const url = config.url ?? "";
    calls.push(url);
    const { status, data } = respond(url);
    const response = { data: data ?? {}, status, statusText: String(status), headers: {}, config };
    if (status >= 400) {
      throw Object.assign(new Error(`status ${status}`), { isAxiosError: true, config, response });
    }
    return response;
  };
  return { apiClient: client.apiClient, store: session.useSessionStore, calls };
}

describe("auth recovery", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("signs out when the refresh session is rejected, instead of hanging", async () => {
    const { apiClient, store, calls } = await loadClient((url) => ({ status: 401, data: url.includes("refresh") ? { message: "Refresh session expired or revoked" } : {} }));
    store.getState().setSession(makeToken());

    const outcome = await Promise.race([
      apiClient.getDashboardStats().then(() => "resolved", () => "rejected"),
      new Promise((resolve) => setTimeout(() => resolve("hung"), 1000))
    ]);

    expect(outcome).toBe("rejected");
    expect(calls).toEqual(["/dashboard/stats", "/auth/refresh"]);
    expect(store.getState().accessToken).toBeNull();
    expect(store.getState().logoutReason).toBe("expired");
  });

  it("skips its own refresh when another tab refreshed while it waited for the cross-tab lock", async () => {
    // A held lock stands in for another tab mid-refresh.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    vi.stubGlobal("navigator", {
      locks: { request: async (_name: string, _options: unknown, work: () => Promise<unknown>) => { await held; return work(); } }
    });
    const { apiClient, store, calls } = await loadClient((url) => (url.includes("refresh") ? { status: 401 } : { status: 200, data: { leads: 1 } }));
    const stale = makeToken(1);
    store.getState().setSession(stale);

    const pending = apiClient.getDashboardStats();
    // The other tab finishes and broadcasts its fresh token, which this tab adopts.
    const fresh = makeToken();
    store.setState({ accessToken: fresh });
    release();

    await expect(pending).resolves.toBeTruthy();
    expect(calls).toEqual(["/dashboard/stats"]); // no second /auth/refresh with a rotated cookie
    expect(store.getState().accessToken).toBe(fresh);
  });

  it("never signs out a newer session when a refresh from the previous one gives up", async () => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    vi.stubGlobal("navigator", {
      locks: { request: async (_name: string, _options: unknown, work: () => Promise<unknown>) => { await held; return work(); } }
    });
    const { apiClient, store } = await loadClient((url) => (url.includes("logout") ? { status: 200 } : { status: 401 }));
    store.getState().setSession(makeToken());

    const pending = apiClient.getDashboardStats().catch(() => "rejected");
    await new Promise((resolve) => setTimeout(resolve, 0)); // 401 handled, refresh waiting for the lock
    // The user signs out and back in while that refresh waits.
    store.getState().clearSession("manual");
    const fresh = makeToken(4_102_444_801);
    store.getState().setSession(fresh);
    release();

    expect(await pending).toBe("rejected");
    expect(store.getState().accessToken).toBe(fresh);
    expect(store.getState().logoutReason).toBeNull();
  });

  it("retries with a newer token adopted from another tab instead of refreshing again", async () => {
    const t1 = makeToken();
    const t2 = makeToken(4_102_444_801);
    const { apiClient, store, calls } = await loadClient((url) => {
      if (url.includes("refresh")) return { status: 500 };
      if (calls.filter((c) => c === url).length === 1) {
        store.setState({ accessToken: t2 }); // another tab refreshed mid-flight; this tab adopted T2
        return { status: 401 };
      }
      return { status: 200, data: { leads: 1 } };
    });
    store.getState().setSession(t1);

    await expect(apiClient.getDashboardStats()).resolves.toBeTruthy();
    expect(calls).toEqual(["/dashboard/stats", "/dashboard/stats"]);
  });

  it("does not freeze when another tab holds the refresh lock indefinitely", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      locks: {
        request: (_name: string, options: { signal: AbortSignal }, _work: () => Promise<unknown>) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          })
      }
    });
    const fresh = makeToken();
    const { apiClient, store, calls } = await loadClient((url) => (url.includes("refresh") ? { status: 200, data: { access_token: fresh } } : { status: 200, data: { leads: 1 } }));
    store.getState().setSession(makeToken(1)); // stale: needs a refresh

    const pending = apiClient.getDashboardStats();
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(pending).resolves.toBeTruthy();
    expect(calls).toEqual(["/auth/refresh", "/dashboard/stats"]);
    expect(store.getState().accessToken).toBe(fresh);
    vi.useRealTimers();
  });

  it("retries the original request once after a successful refresh", async () => {
    const fresh = makeToken();
    let statsCalls = 0;
    const { apiClient, store } = await loadClient((url) => {
      if (url.includes("refresh")) return { status: 200, data: { access_token: fresh } };
      statsCalls += 1;
      return statsCalls === 1 ? { status: 401 } : { status: 200, data: { leads: 1 } };
    });
    store.getState().setSession(makeToken());

    await expect(apiClient.getDashboardStats()).resolves.toBeTruthy();
    expect(statsCalls).toBe(2);
    expect(store.getState().accessToken).toBe(fresh);
  });
});
