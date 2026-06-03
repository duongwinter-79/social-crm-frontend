import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { apiClient, useSessionStore, type UiTextRuntimeOverride } from "@social-crm/api";
import { useI18n, type Lang } from "@/i18n";
import { uiTextByKey } from "./ui-text.registry";

type UiTextValues = Record<string, string | number>;

export type UiTextPreviewOverride = {
  key: string;
  enOverride: string | null;
  viOverride: string | null;
  isActive: boolean;
};

export type UiTextStatus = "default" | "overridden" | "preview" | "unknown";

type UiTextContextValue = {
  text: (key: string, values?: UiTextValues) => string;
  overrides: Record<string, UiTextRuntimeOverride>;
  previewOverrides: Record<string, UiTextPreviewOverride>;
  isPreviewing: boolean;
  isLoading: boolean;
  reload: () => Promise<void>;
  setPreviewOverride: (override: UiTextPreviewOverride) => void;
  clearPreviewOverride: (key: string) => void;
  clearPreview: () => void;
  // In-context editing (v2)
  isEditMode: boolean;
  setEditMode: (on: boolean) => void;
  activeEditKey: string | null;
  activeEditAnchor: HTMLElement | null;
  openEditor: (key: string, anchor?: HTMLElement | null) => void;
  closeEditor: () => void;
  statusFor: (key: string) => UiTextStatus;
};

const UiTextContext = createContext<UiTextContextValue | null>(null);
const PREVIEW_STORAGE_KEY = "crm-admin-ui-text-preview";
const EDIT_MODE_STORAGE_KEY = "crm-admin-ui-text-edit-mode";

function interpolate(template: string, values: UiTextValues = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

function resolveOverride(override: UiTextRuntimeOverride | undefined, lang: Lang) {
  const value = lang === "vi" ? override?.viOverride : override?.enOverride;
  return value?.trim() || null;
}

function getStoredPreviewOverrides(): Record<string, UiTextPreviewOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, UiTextPreviewOverride>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getStoredEditMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(EDIT_MODE_STORAGE_KEY) === "1";
}

function resolvePreviewOverride(override: UiTextPreviewOverride | undefined, lang: Lang) {
  if (!override) return undefined;
  if (!override.isActive) return null;
  const value = lang === "vi" ? override.viOverride : override.enOverride;
  return value?.trim() || null;
}

export function UiTextProvider(props: PropsWithChildren) {
  const { lang } = useI18n();
  const accessToken = useSessionStore((state) => state.accessToken);
  const [overrides, setOverrides] = useState<Record<string, UiTextRuntimeOverride>>({});
  const [previewOverrides, setPreviewOverrides] = useState<Record<string, UiTextPreviewOverride>>(getStoredPreviewOverrides);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(getStoredEditMode);
  const [activeEditKey, setActiveEditKey] = useState<string | null>(null);
  const [activeEditAnchor, setActiveEditAnchor] = useState<HTMLElement | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await apiClient.getUiTextOverrides();
      setOverrides(Object.fromEntries(rows.map((row) => [row.key, row])));
    } catch {
      setOverrides({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setOverrides({});
      setPreviewOverrides({});
      setIsEditMode(false);
      setActiveEditKey(null);
      return;
    }
    void reload();
  }, [accessToken, reload]);

  useEffect(() => {
    if (isEditMode) {
      window.sessionStorage.setItem(EDIT_MODE_STORAGE_KEY, "1");
    } else {
      window.sessionStorage.removeItem(EDIT_MODE_STORAGE_KEY);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (Object.keys(previewOverrides).length === 0) {
      window.sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(previewOverrides));
  }, [previewOverrides]);

  const value = useMemo<UiTextContextValue>(() => {
    const text = (key: string, values?: UiTextValues) => {
      const entry = uiTextByKey.get(key);
      const preview = previewOverrides[key];
      const previewTemplate = resolvePreviewOverride(preview, lang);
      const template = preview
        ? previewTemplate ?? entry?.defaultText[lang] ?? key
        : resolveOverride(overrides[key], lang) ?? entry?.defaultText[lang] ?? key;
      if (!entry && import.meta.env.DEV) {
        console.warn(`Unknown UI text key: ${key}`);
      }
      return interpolate(template, values);
    };
    const setPreviewOverride = (override: UiTextPreviewOverride) => {
      setPreviewOverrides((current) => ({
        ...current,
        [override.key]: override
      }));
    };
    const clearPreviewOverride = (key: string) => {
      setPreviewOverrides((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    };
    const clearPreview = () => setPreviewOverrides({});
    const setEditMode = (on: boolean) => {
      setIsEditMode(on);
      if (!on) {
        setActiveEditKey(null);
        setActiveEditAnchor(null);
      }
    };
    const openEditor = (key: string, anchor?: HTMLElement | null) => {
      setActiveEditKey(key);
      setActiveEditAnchor(anchor ?? null);
    };
    const closeEditor = () => {
      setActiveEditKey(null);
      setActiveEditAnchor(null);
    };
    const statusFor = (key: string): UiTextStatus => {
      if (!uiTextByKey.has(key)) return "unknown";
      if (previewOverrides[key]) return "preview";
      if (resolveOverride(overrides[key], lang)) return "overridden";
      return "default";
    };
    return {
      text,
      overrides,
      previewOverrides,
      isPreviewing: Object.keys(previewOverrides).length > 0,
      isLoading,
      reload,
      setPreviewOverride,
      clearPreviewOverride,
      clearPreview,
      isEditMode,
      setEditMode,
      activeEditKey,
      activeEditAnchor,
      openEditor,
      closeEditor,
      statusFor
    };
  }, [activeEditAnchor, activeEditKey, isEditMode, isLoading, lang, overrides, previewOverrides, reload]);

  return <UiTextContext.Provider value={value}>{props.children}</UiTextContext.Provider>;
}

export function useUiText() {
  const context = useContext(UiTextContext);
  if (!context) {
    throw new Error("useUiText must be used within UiTextProvider");
  }
  return context;
}
