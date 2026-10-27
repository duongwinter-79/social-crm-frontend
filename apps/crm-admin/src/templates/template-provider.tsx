import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { useLocation } from "react-router-dom";
import { apiClient, useSessionStore, type UiTemplateRuntime } from "@social-crm/api";
import { useI18n } from "@/i18n";
import { pageIdForPath } from "./template-pages";
import { startTemplateScript } from "./template-runtime";
import { tokensToCssVariables } from "./template-tokens";
import {
  readStoredPreview,
  rememberLogoutReason,
  resolveSafeMode,
  writeSafeMode,
  writeStoredPreview,
  type TemplatePreview
} from "./template-transfer";

const TOKENS_STYLE_ID = "crm-template-tokens";
const CSS_STYLE_ID = "crm-template-css";
const MAX_SCRIPT_ERRORS = 20;

export type TemplateBrand = {
  name: string | null;
  tagline: string | null;
  logoUrl: string | null;
};

type TemplateContextValue = {
  /** Template saved as active on the server (null = built-in default look). */
  active: UiTemplateRuntime | null;
  /** What this browser is showing: the preview draft if any, else `active`. */
  effective: UiTemplateRuntime | null;
  preview: TemplatePreview | null;
  isPreviewing: boolean;
  setPreview: (preview: TemplatePreview) => void;
  clearPreview: () => void;
  safeMode: boolean;
  setSafeMode: (on: boolean) => void;
  scriptErrors: string[];
  brand: TemplateBrand;
  isLoading: boolean;
  reload: () => Promise<void>;
};

const TemplateContext = createContext<TemplateContextValue | null>(null);

// Values come from validated tokens, but preview drafts are unvalidated, so
// never let a value close the declaration or the <style> element.
function sanitizeCssValue(value: string) {
  return value.replace(/[;{}<>]/g, "");
}

function upsertStyle(id: string, css: string | null) {
  const existing = document.getElementById(id);
  if (!css) {
    existing?.remove();
    return;
  }
  const style = existing ?? Object.assign(document.createElement("style"), { id });
  if (style.textContent !== css) style.textContent = css;
  if (!existing) document.head.appendChild(style);
}

function templateSlug(template: UiTemplateRuntime | null) {
  if (!template) return "default";
  return template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "template";
}

export function TemplateProvider(props: PropsWithChildren) {
  const location = useLocation();
  const { lang } = useI18n();
  const accessToken = useSessionStore((state) => state.accessToken);
  const user = useSessionStore((state) => state.user);
  const isAuthenticated = Boolean(accessToken);

  const [active, setActive] = useState<UiTemplateRuntime | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [storedPreview, setPreviewState] = useState<TemplatePreview | null>(readStoredPreview);
  const [safeMode, setSafeModeState] = useState(() => resolveSafeMode(window.location.search));
  const [scriptErrors, setScriptErrors] = useState<string[]>([]);

  // Ignore responses from superseded requests (e.g. the public fetch started
  // before sign-in resolving after the authenticated one).
  const latestRequest = useRef(0);
  const reload = useCallback(async () => {
    const request = ++latestRequest.current;
    setIsLoading(true);
    try {
      const template = isAuthenticated ? await apiClient.getActiveUiTemplate() : await apiClient.getPublicUiTemplate();
      if (request === latestRequest.current) setActive(template);
    } catch {
      // A missing/unreachable template endpoint must never block the CRM:
      // fall back to the built-in look.
      if (request === latestRequest.current) setActive(null);
    } finally {
      if (request === latestRequest.current) setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Preview is an admin-only, signed-in affordance: drop it on sign-out. Only a
  // real signed-in → signed-out change counts; on page load the token is null
  // until the session bootstrap finishes, and the stored preview must survive that.
  const wasAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      setPreviewState(null);
      writeStoredPreview(null);
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  // A stored preview only ever applies to the admin who started it. A session
  // can end while no page is open (browser closed, laptop asleep), so the next
  // person signing in on this tab must not inherit an admin's draft CSS/JS.
  const currentUserId = user?.userId ?? null;
  const currentUserIsAdmin = Boolean(user?.roles?.includes("admin"));
  const previewBelongsToUser = Boolean(
    storedPreview && currentUserId && currentUserIsAdmin && storedPreview.ownerUserId === currentUserId
  );
  const preview = previewBelongsToUser ? storedPreview : null;
  useEffect(() => {
    if (storedPreview && currentUserId && !previewBelongsToUser) {
      setPreviewState(null);
      writeStoredPreview(null);
    }
  }, [currentUserId, previewBelongsToUser, storedPreview]);

  useEffect(() => {
    setSafeModeState(resolveSafeMode(location.search));
  }, [location.search]);

  const effective: UiTemplateRuntime | null = preview ?? active;
  const pageId = pageIdForPath(location.pathname);
  // Nothing admin-authored beyond validated tokens may run where passwords are typed.
  const isLoginPage = pageId === "login";

  // Tokens: always applied (validated values, cannot break the page).
  useEffect(() => {
    const variables = tokensToCssVariables(effective?.tokens);
    const declarations = Object.entries(variables)
      .map(([name, value]) => `  ${name}: ${sanitizeCssValue(value)};`)
      .join("\n");
    upsertStyle(TOKENS_STYLE_ID, declarations ? `:root {\n${declarations}\n}` : null);
  }, [effective?.tokens]);

  // Custom CSS: skipped in safe mode and on the login page (attribute selectors
  // on the password input could leak what is typed).
  const customCss = !safeMode && !isLoginPage ? effective?.customCss ?? null : null;
  useEffect(() => {
    upsertStyle(CSS_STYLE_ID, customCss);
  }, [customCss]);

  // Lazy routes inject their own CSS later; keep template styles last in
  // <head> so they win ties against it.
  useEffect(() => {
    const keepLast = () => {
      const styles = [TOKENS_STYLE_ID, CSS_STYLE_ID]
        .map((id) => document.getElementById(id))
        .filter((style): style is HTMLElement => Boolean(style));
      const tail = Array.from(document.head.children).slice(-styles.length);
      if (styles.some((style, index) => tail[index] !== style)) {
        for (const style of styles) document.head.appendChild(style);
      }
    };
    const observer = new MutationObserver(keepLast);
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const body = document.body;
    body.setAttribute("data-crm-page", pageId);
    body.setAttribute("data-crm-template", templateSlug(effective));
    if (safeMode) body.setAttribute("data-crm-safe-mode", "");
    else body.removeAttribute("data-crm-safe-mode");
  }, [effective, pageId, safeMode]);

  // Route + language feed for running scripts, without restarting them.
  const routeListeners = useRef(new Set<() => void>());
  const pathRef = useRef(location.pathname);
  const langRef = useRef(lang);
  langRef.current = lang;
  useEffect(() => {
    pathRef.current = location.pathname;
    for (const listener of Array.from(routeListeners.current)) listener();
  }, [location.pathname]);

  // Keyed on primitives: every token refresh builds a new `user` object, and
  // restarting the script on each refresh would re-run its side effects.
  const scriptUsername = user?.username ?? null;
  const scriptRoles = (user?.roles ?? []).join(",");
  const scriptUser = useMemo(
    () => (isAuthenticated ? { username: scriptUsername, roles: scriptRoles ? scriptRoles.split(",") : [] } : null),
    [isAuthenticated, scriptRoles, scriptUsername]
  );

  // Custom JS: signed-in sessions only, never on the login page, skipped in safe mode.
  const scriptCode = isAuthenticated && !safeMode && !isLoginPage ? effective?.customJs ?? null : null;
  const scriptHasRun = useRef(false);
  const scriptRanForUserId = useRef<string | null>(null);
  const scriptUserIdRef = useRef(currentUserId);
  scriptUserIdRef.current = currentUserId;

  // This tab can switch users without signing out (it adopts another tab's
  // sign-in). Whatever the previous user's script left outside the crm API
  // must not live on in the new user's session: reload so it starts clean.
  useEffect(() => {
    if (scriptHasRun.current && currentUserId && scriptRanForUserId.current && currentUserId !== scriptRanForUserId.current) {
      scriptHasRun.current = false;
      window.location.reload();
    }
  }, [currentUserId]);
  const scriptTemplateId = effective?.id ?? null;
  const scriptTemplateName = effective?.name ?? "";
  const isPreviewing = Boolean(preview);
  useEffect(() => {
    setScriptErrors([]);
    if (!scriptCode?.trim()) return;
    scriptHasRun.current = true;
    scriptRanForUserId.current = scriptUserIdRef.current;
    return startTemplateScript(
      scriptCode,
      {
        template: { id: scriptTemplateId, name: scriptTemplateName, preview: isPreviewing },
        user: scriptUser,
        getLang: () => langRef.current,
        getPath: () => pathRef.current,
        getPage: () => pageIdForPath(pathRef.current),
        subscribeRoute: (listener) => {
          routeListeners.current.add(listener);
          return () => routeListeners.current.delete(listener);
        },
        reportError: (message) => {
          console.error(`[crm template] ${message}`);
          setScriptErrors((current) => [...current, message].slice(-MAX_SCRIPT_ERRORS));
        }
      },
      { document, MutationObserver, console }
    );
  }, [isPreviewing, scriptCode, scriptTemplateId, scriptTemplateName, scriptUser]);

  // A script can leave listeners, timers or patched globals that the crm API
  // cannot undo. Once one has run, signing out (manual, idle, expired, other
  // tab) must not keep that page alive for the next person's login, so load
  // /login fresh. Every sign-out path has already revoked the server session
  // before clearing it here (idle and manual revoke first, "remote" comes from
  // a tab that did), so the reload cannot restore it.
  useEffect(() => {
    if (!scriptHasRun.current || (isAuthenticated && !isLoginPage)) return;
    scriptHasRun.current = false;
    rememberLogoutReason(useSessionStore.getState().logoutReason);
    window.location.replace("/login");
  }, [isAuthenticated, isLoginPage]);

  const value = useMemo<TemplateContextValue>(() => {
    const tokens = effective?.tokens ?? {};
    return {
      active,
      effective,
      preview,
      isPreviewing,
      setPreview: (next) => {
        const owned = { ...next, ownerUserId: currentUserId };
        writeStoredPreview(owned);
        setPreviewState(owned);
      },
      clearPreview: () => {
        writeStoredPreview(null);
        setPreviewState(null);
      },
      safeMode,
      setSafeMode: (on) => {
        writeSafeMode(on);
        setSafeModeState(on);
      },
      scriptErrors,
      brand: {
        name: tokens.brandName ?? null,
        tagline: tokens.brandTagline ?? null,
        logoUrl: tokens.logoUrl ?? null
      },
      isLoading,
      reload
    };
  }, [active, currentUserId, effective, isLoading, isPreviewing, preview, reload, safeMode, scriptErrors]);

  return <TemplateContext.Provider value={value}>{props.children}</TemplateContext.Provider>;
}

export function useTemplate() {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error("useTemplate must be used within TemplateProvider");
  }
  return context;
}
