import type { AdminUiTemplate, UiTemplatePayload, UiTemplateRuntime, UiTemplateTokens } from "@social-crm/api";

/** File format for sharing templates between environments or with the customer. */
export const TEMPLATE_FILE_FORMAT = "social-crm-ui-template";
export const TEMPLATE_FILE_VERSION = 1;

export type TemplateFile = {
  format: typeof TEMPLATE_FILE_FORMAT;
  version: number;
  name: string;
  description: string | null;
  tokens: UiTemplateTokens;
  customCss: string | null;
  customJs: string | null;
};

export function toTemplateFile(template: Pick<AdminUiTemplate, "name" | "description" | "tokens" | "customCss" | "customJs">): TemplateFile {
  return {
    format: TEMPLATE_FILE_FORMAT,
    version: TEMPLATE_FILE_VERSION,
    name: template.name,
    description: template.description ?? null,
    tokens: template.tokens ?? {},
    customCss: template.customCss ?? null,
    customJs: template.customJs ?? null
  };
}

/**
 * Parses an exported template file. Only shape is checked here; the backend
 * validates tokens and sizes when the template is saved.
 */
export function parseTemplateFile(text: string): UiTemplatePayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The file is not valid JSON.");
  }
  const file = parsed as Partial<TemplateFile> | null;
  if (!file || typeof file !== "object" || file.format !== TEMPLATE_FILE_FORMAT) {
    throw new Error(`The file is not a ${TEMPLATE_FILE_FORMAT} export.`);
  }
  if (typeof file.version !== "number" || file.version > TEMPLATE_FILE_VERSION) {
    throw new Error("The file was exported by a newer version of the CRM.");
  }
  if (typeof file.name !== "string" || !file.name.trim()) {
    throw new Error("The template file has no name.");
  }
  const optionalString = (value: unknown, field: string) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") throw new Error(`"${field}" must be text.`);
    return value;
  };
  if (file.tokens !== undefined && (typeof file.tokens !== "object" || file.tokens === null || Array.isArray(file.tokens))) {
    throw new Error('"tokens" must be an object.');
  }
  return {
    name: file.name.trim(),
    description: optionalString(file.description, "description"),
    tokens: file.tokens ?? {},
    customCss: optionalString(file.customCss, "customCss"),
    customJs: optionalString(file.customJs, "customJs")
  };
}

/** A draft shown only in this browser session before it is saved or activated. */
export type TemplatePreview = UiTemplateRuntime & {
  customJs: string | null;
  /** Admin who started the preview; it never applies to anyone else signed in on this tab. */
  ownerUserId?: string | null;
};

const PREVIEW_STORAGE_KEY = "crm-admin-ui-template-preview";
const SAFE_MODE_STORAGE_KEY = "crm-admin-ui-template-safe-mode";
export const SAFE_MODE_QUERY_PARAM = "crm-safe-mode";

function readSession(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode, quota): preview/safe mode just won't persist.
  }
}

export function readStoredPreview(): TemplatePreview | null {
  const raw = readSession(PREVIEW_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TemplatePreview;
    return parsed && typeof parsed === "object" && typeof parsed.name === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredPreview(preview: TemplatePreview | null) {
  writeSession(PREVIEW_STORAGE_KEY, preview ? JSON.stringify(preview) : null);
}

/**
 * Safe mode skips custom CSS and JS so an admin can always reach the editor
 * to fix a template that broke the page. `?crm-safe-mode=1` turns it on for
 * the browser session, `?crm-safe-mode=0` turns it off.
 */
export function resolveSafeMode(search: string): boolean {
  const value = new URLSearchParams(search).get(SAFE_MODE_QUERY_PARAM);
  if (value === "1" || value === "true") {
    writeSession(SAFE_MODE_STORAGE_KEY, "1");
    return true;
  }
  if (value === "0" || value === "false") {
    writeSession(SAFE_MODE_STORAGE_KEY, null);
    return false;
  }
  return readSession(SAFE_MODE_STORAGE_KEY) === "1";
}

export function writeSafeMode(on: boolean) {
  writeSession(SAFE_MODE_STORAGE_KEY, on ? "1" : null);
}

const LOGOUT_REASON_STORAGE_KEY = "crm-admin-logout-reason";
const LOGOUT_REASONS = ["idle", "expired", "manual", "remote"] as const;
export type RememberedLogoutReason = (typeof LOGOUT_REASONS)[number];

/** Carries the sign-out reason across the full reload that follows a template script. */
export function rememberLogoutReason(reason: string | null) {
  writeSession(LOGOUT_REASON_STORAGE_KEY, reason);
}

export function takeRememberedLogoutReason(): RememberedLogoutReason | null {
  const value = readSession(LOGOUT_REASON_STORAGE_KEY);
  writeSession(LOGOUT_REASON_STORAGE_KEY, null);
  return (LOGOUT_REASONS as readonly string[]).includes(value ?? "") ? (value as RememberedLogoutReason) : null;
}
