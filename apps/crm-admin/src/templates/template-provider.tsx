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
import { readStoredPreview, resolveSafeMode, writeSafeMode, writeStoredPreview, type TemplatePreview } from "./template-transfer";

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
  const [preview, setPreviewState] = useState<TemplatePreview | null>(readStoredPreview);
  const [safeMode, setSafeModeState] = useState(() => resolveSafeMode(window.location.search));
  const [scriptErrors, setScriptErrors] = useState<string[]>([]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const template = isAuthenticated ? await apiClient.getActiveUiTemplate() : await apiClient.getPublicUiTemplate();
      setActive(template);
    } catch {
      // A missing/unreachable template endpoint must never block the CRM:
      // fall back to the built-in look.
      setActive(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Preview is an admin-only, signed-in affordance.
  useEffect(() => {
    if (!isAuthenticated && preview) {
      setPreviewState(null);
      writeStoredPreview(null);
    }
  }, [isAuthenticated, preview]);

  useEffect(() => {
    setSafeModeState(resolveSafeMode(location.search));
  }, [location.search]);

  const effective: UiTemplateRuntime | null = preview ?? active;
  const pageId = pageIdForPath(location.pathname);

  // Tokens: always applied (validated values, cannot break the page).
  useEffect(() => {
    const variables = tokensToCssVariables(effective?.tokens);
    const declarations = Object.entries(variables)
      .map(([name, value]) => `  ${name}: ${sanitizeCssValue(value)};`)
      .join("\n");
    upsertStyle(TOKENS_STYLE_ID, declarations ? `:root {\n${declarations}\n}` : null);
  }, [effective?.tokens]);

  // Custom CSS: skipped in safe mode.
  useEffect(() => {
    upsertStyle(CSS_STYLE_ID, !safeMode && effective?.customCss ? effective.customCss : null);
  }, [effective?.customCss, safeMode]);

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

  const scriptUser = useMemo(
    () => (user ? { username: user.username ?? null, roles: [...(user.roles ?? [])] } : null),
    [user]
  );

  // Custom JS: signed-in sessions only (never on the login page), skipped in safe mode.
  const scriptCode = isAuthenticated && !safeMode ? effective?.customJs ?? null : null;
  const scriptTemplateId = effective?.id ?? null;
  const scriptTemplateName = effective?.name ?? "";
  const isPreviewing = Boolean(preview);
  useEffect(() => {
    setScriptErrors([]);
    if (!scriptCode?.trim()) return;
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

  const value = useMemo<TemplateContextValue>(() => {
    const tokens = effective?.tokens ?? {};
    return {
      active,
      effective,
      preview,
      isPreviewing,
      setPreview: (next) => {
        writeStoredPreview(next);
        setPreviewState(next);
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
  }, [active, effective, isLoading, isPreviewing, preview, reload, safeMode, scriptErrors]);

  return <TemplateContext.Provider value={value}>{props.children}</TemplateContext.Provider>;
}

export function useTemplate() {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error("useTemplate must be used within TemplateProvider");
  }
  return context;
}
