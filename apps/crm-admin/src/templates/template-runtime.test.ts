import { describe, expect, it } from "vitest";
import { startTemplateScript, type TemplateRuntimeEnv, type TemplateScriptContext } from "./template-runtime";

/** Just enough DOM for the runtime: elements matched by selector, styles, observers. */
function createFakeEnv() {
  const elements = new Map<string, Element[]>();
  const observers = new Set<() => void>();
  const rootStyle = new Map<string, string>();
  const headStyles: Array<{ textContent: string; removed: boolean }> = [];
  const info: unknown[][] = [];

  const env = {
    document: {
      documentElement: {
        style: {
          setProperty: (name: string, value: string) => void rootStyle.set(name, value),
          removeProperty: (name: string) => {
            rootStyle.delete(name);
            return "";
          }
        }
      },
      head: {
        appendChild: (node: { textContent: string; removed: boolean }) => {
          headStyles.push(node);
          return node;
        }
      },
      body: {},
      createElement: () => {
        const style = { textContent: "", removed: false, setAttribute: () => undefined, remove: () => (style.removed = true) };
        return style;
      },
      querySelectorAll: (selector: string) => {
        if (selector.includes("!!")) throw new SyntaxError(`'${selector}' is not a valid selector`);
        return elements.get(selector) ?? [];
      }
    },
    MutationObserver: class {
      private readonly callback: () => void;
      constructor(callback: () => void) {
        this.callback = callback;
      }
      observe() {
        observers.add(this.callback);
      }
      disconnect() {
        observers.delete(this.callback);
      }
    },
    console: { info: (...args: unknown[]) => void info.push(args) }
  } as unknown as TemplateRuntimeEnv;

  const mount = (selector: string, element: Element) => {
    elements.set(selector, [...(elements.get(selector) ?? []), element]);
    for (const callback of Array.from(observers)) callback();
  };
  return { env, mount, observers, rootStyle, headStyles, info };
}

function createContext() {
  const routeListeners = new Set<() => void>();
  const errors: string[] = [];
  let path = "/dashboard";
  const context: TemplateScriptContext = {
    template: { id: "t1", name: "Ocean", preview: false },
    user: { username: "admin", roles: ["admin"] },
    getLang: () => "vi",
    getPath: () => path,
    getPage: () => path.slice(1),
    subscribeRoute: (listener) => {
      routeListeners.add(listener);
      return () => routeListeners.delete(listener);
    },
    reportError: (message) => void errors.push(message)
  };
  const navigate = (next: string) => {
    path = next;
    for (const listener of Array.from(routeListeners)) listener();
  };
  return { context, navigate, routeListeners, errors };
}

describe("startTemplateScript", () => {
  it("exposes template, user and page info to the script", () => {
    const { env, info } = createFakeEnv();
    const { context } = createContext();
    startTemplateScript("crm.log(crm.version, crm.template.name, crm.user.username, crm.lang(), crm.page())", context, env);
    expect(info).toEqual([["[crm template]", 1, "Ocean", "admin", "vi", "dashboard"]]);
  });

  it("fires onRouteChange immediately and on navigation, until disposed", () => {
    const { env } = createFakeEnv();
    const { context, navigate, routeListeners } = createContext();
    const seen: string[] = [];
    (globalThis as Record<string, unknown>).__seen = seen;
    const dispose = startTemplateScript("crm.onRouteChange(({ page }) => globalThis.__seen.push(page));", context, env);
    navigate("/leads");
    expect(seen).toEqual(["dashboard", "leads"]);
    dispose();
    navigate("/orders");
    expect(seen).toEqual(["dashboard", "leads"]);
    expect(routeListeners.size).toBe(0);
    delete (globalThis as Record<string, unknown>).__seen;
  });

  it("observe() handles existing and later-mounted elements once each, and undoes per-element work", () => {
    const { env, mount, observers } = createFakeEnv();
    const { context } = createContext();
    const first = { id: "a" } as unknown as Element;
    const second = { id: "b" } as unknown as Element;
    mount(".card", first);
    const log: string[] = [];
    (globalThis as Record<string, unknown>).__log = log;
    const dispose = startTemplateScript(
      'crm.observe(".card", (el) => { globalThis.__log.push("on " + el.id); return () => globalThis.__log.push("off " + el.id); });',
      context,
      env
    );
    mount(".card", second);
    mount(".card", second);
    expect(log).toEqual(["on a", "on b"]);
    dispose();
    expect(log).toEqual(["on a", "on b", "off a", "off b"]);
    expect(observers.size).toBe(0);
    delete (globalThis as Record<string, unknown>).__log;
  });

  it("removes styles and tokens it added when disposed", () => {
    const { env, rootStyle, headStyles } = createFakeEnv();
    const { context } = createContext();
    const dispose = startTemplateScript(
      'crm.addStyle("body{}"); crm.setToken("--crm-indigo-600", "1 2 3"); crm.setToken("--crm-indigo-600", "4 5 6");',
      context,
      env
    );
    expect(rootStyle.get("--crm-indigo-600")).toBe("4 5 6");
    expect(headStyles).toHaveLength(1);
    dispose();
    expect(rootStyle.size).toBe(0);
    expect(headStyles[0].removed).toBe(true);
  });

  it("reports errors instead of throwing — a broken template never breaks the CRM", () => {
    const { env } = createFakeEnv();
    const { context, navigate, errors } = createContext();
    expect(() => startTemplateScript("this is not javascript", context, env)).not.toThrow();
    expect(errors[0]).toMatch(/^script: SyntaxError/);

    startTemplateScript('crm.onRouteChange(() => { throw new Error("boom"); }); crm.observe("a!!b", () => {}); crm.setToken("color", "red");', context, env);
    navigate("/leads");
    expect(errors.slice(1)).toEqual([
      "onRouteChange: Error: boom",
      expect.stringMatching(/^observe\("a!!b"\): SyntaxError/),
      expect.stringMatching(/^setToken: Error: "color" is not a CSS custom property/),
      "onRouteChange: Error: boom"
    ]);
  });

  it("runs in strict mode and cannot reassign the crm API", () => {
    const { env } = createFakeEnv();
    const { context, errors } = createContext();
    startTemplateScript("crm.version = 2;", context, env);
    expect(errors[0]).toMatch(/^script: TypeError/);
  });
});
