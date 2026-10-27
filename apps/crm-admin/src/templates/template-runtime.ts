/**
 * Runs a template's custom JS with a small, documented `crm` API.
 *
 * The script is admin-authored code and runs with full page access (same as a
 * WordPress/Elementor "custom code" block). The API exists so scripts do not
 * have to fight React: `observe` re-applies to elements React mounts later,
 * `onRouteChange` fires on SPA navigation, and everything registered through
 * the API is torn down when the template is switched, previewed or disabled.
 * See docs/UI_TEMPLATES.md for the public contract.
 */

export const CRM_TEMPLATE_API_VERSION = 1;

export type CrmTemplateRoute = { path: string; page: string };

export interface CrmTemplateApi {
  readonly version: number;
  readonly template: { readonly id: string | null; readonly name: string; readonly preview: boolean };
  readonly user: { readonly username: string | null; readonly roles: readonly string[] } | null;
  lang(): string;
  route(): string;
  page(): string;
  onRouteChange(callback: (route: CrmTemplateRoute) => void): () => void;
  observe(selector: string, callback: (element: Element) => void | (() => void)): () => void;
  addStyle(css: string): () => void;
  setToken(name: string, value: string): void;
  onCleanup(callback: () => void): void;
  log(...args: unknown[]): void;
}

export type TemplateScriptContext = {
  template: { id: string | null; name: string; preview: boolean };
  user: { username: string | null; roles: string[] } | null;
  getLang: () => string;
  getPath: () => string;
  getPage: () => string;
  subscribeRoute: (listener: () => void) => () => void;
  reportError: (message: string) => void;
};

export type TemplateRuntimeEnv = {
  document: Pick<Document, "documentElement" | "head" | "body" | "createElement" | "querySelectorAll">;
  MutationObserver: new (callback: MutationCallback) => Pick<MutationObserver, "observe" | "disconnect">;
  console: Pick<Console, "info">;
};

function describeError(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/** Starts the script; returns a disposer that undoes everything it registered. */
export function startTemplateScript(code: string, context: TemplateScriptContext, env: TemplateRuntimeEnv): () => void {
  const cleanups: Array<() => void> = [];
  const tokensSet = new Set<string>();
  let disposed = false;

  const report = (where: string, error: unknown) => context.reportError(`${where}: ${describeError(error)}`);
  const register = (cleanup: () => void) => {
    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      try {
        cleanup();
      } catch (error) {
        report("cleanup", error);
      }
    };
    cleanups.push(once);
    return once;
  };

  const api: CrmTemplateApi = Object.freeze({
    version: CRM_TEMPLATE_API_VERSION,
    template: Object.freeze({ ...context.template }),
    user: context.user ? Object.freeze({ username: context.user.username, roles: Object.freeze([...context.user.roles]) }) : null,
    lang: () => context.getLang(),
    route: () => context.getPath(),
    page: () => context.getPage(),

    onRouteChange(callback: (route: CrmTemplateRoute) => void) {
      const fire = () => {
        if (disposed) return;
        try {
          callback({ path: context.getPath(), page: context.getPage() });
        } catch (error) {
          report("onRouteChange", error);
        }
      };
      const unsubscribe = register(context.subscribeRoute(fire));
      fire();
      return unsubscribe;
    },

    observe(selector: string, callback: (element: Element) => void | (() => void)) {
      try {
        env.document.querySelectorAll(selector);
      } catch (error) {
        report(`observe("${selector}")`, error);
        return () => undefined;
      }
      const seen = new WeakSet<Element>();
      const elementCleanups: Array<() => void> = [];
      const scan = () => {
        if (disposed) return;
        const matches = Array.from(env.document.querySelectorAll(selector));
        for (const element of matches) {
          if (seen.has(element)) continue;
          seen.add(element);
          try {
            const result = callback(element);
            if (typeof result === "function") elementCleanups.push(result);
          } catch (error) {
            report(`observe("${selector}")`, error);
          }
        }
      };
      const observer = new env.MutationObserver(() => scan());
      observer.observe(env.document.body, { childList: true, subtree: true });
      scan();
      return register(() => {
        observer.disconnect();
        for (const cleanup of elementCleanups) cleanup();
      });
    },

    addStyle(css: string) {
      const style = env.document.createElement("style");
      style.setAttribute("data-crm-template-script-style", "");
      style.textContent = String(css);
      env.document.head.appendChild(style);
      return register(() => style.remove());
    },

    setToken(name: string, value: string) {
      if (!/^--[\w-]+$/.test(name)) {
        report("setToken", new Error(`"${name}" is not a CSS custom property name (expected --name)`));
        return;
      }
      env.document.documentElement.style.setProperty(name, String(value));
      if (!tokensSet.has(name)) {
        tokensSet.add(name);
        register(() => env.document.documentElement.style.removeProperty(name));
      }
    },

    onCleanup(callback: () => void) {
      register(callback);
    },

    log(...args: unknown[]) {
      env.console.info("[crm template]", ...args);
    }
  });

  try {
    const sourceName = (context.template.name || "template").replace(/[^\w-]+/g, "-");
    // Running admin-authored template code is the feature (see file header).
    const run = new Function("crm", `"use strict";\n${code}\n//# sourceURL=crm-template/${sourceName}.js`);
    run(api);
  } catch (error) {
    report("script", error);
  }

  return () => {
    disposed = true;
    for (const cleanup of cleanups.reverse()) cleanup();
    cleanups.length = 0;
  };
}
