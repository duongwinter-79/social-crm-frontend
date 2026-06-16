import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import type { AxiosError } from "axios";

type NoticeTone = "error" | "success" | "info" | "warning";

type Notice = {
  id: number;
  message: string;
  tone: NoticeTone;
  title?: string;
};

type NoticeInput = {
  message: string;
  tone?: NoticeTone;
  title?: string;
};

type BiCopy = { en: string; vi: string };

type NotificationContextValue = {
  notify: (input: NoticeInput) => void;
  notifyError: (error: unknown, fallback?: string | BiCopy) => void;
  notifySuccess: (message: string, title?: string) => void;
  notifyInfo: (message: string, title?: string) => void;
  notifyWarning: (message: string, title?: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

let notificationHandler: ((input: NoticeInput) => void) | null = null;

export function emitRequestNotification(input: NoticeInput) {
  notificationHandler?.(input);
}

function getLang(): "en" | "vi" {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem("crm-admin-lang") === "vi" ? "vi" : "en";
  } catch {
    return "en";
  }
}

function bi(copy: BiCopy): string {
  return copy[getLang()];
}

// Status codes whose messages are always overridden with safe generic copy.
// Never pass backend detail through for these — it may leak implementation
// info (401/403) or provide no actionable guidance (429/5xx).
const STATUS_OVERRIDE: Record<number, BiCopy> = {
  401: { en: "Your session has expired. Please sign in again.", vi: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." },
  403: { en: "You don't have permission to perform this action.", vi: "Bạn không có quyền thực hiện thao tác này." },
  429: { en: "Too many requests. Please wait a moment before trying again.", vi: "Quá nhiều yêu cầu. Vui lòng chờ một chút rồi thử lại." },
  500: { en: "Something went wrong on our side. Please try again later.", vi: "Đã xảy ra lỗi từ phía máy chủ. Vui lòng thử lại sau." },
  502: { en: "The server is temporarily unavailable. Please try again shortly.", vi: "Máy chủ tạm thời không phản hồi. Vui lòng thử lại sau ít phút." },
  503: { en: "The server is temporarily unavailable. Please try again shortly.", vi: "Máy chủ tạm thời không phản hồi. Vui lòng thử lại sau ít phút." },
  504: { en: "The request timed out. Please try again.", vi: "Yêu cầu đã hết thời gian chờ. Vui lòng thử lại." },
};

// For these codes the backend detail is shown when available; otherwise a
// friendly bilingual fallback is used instead of a raw status code string.
const STATUS_FALLBACK: Record<number, BiCopy> = {
  400: { en: "Invalid request. Please check the details and try again.", vi: "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin và thử lại." },
  404: { en: "The requested item was not found.", vi: "Không tìm thấy dữ liệu yêu cầu." },
  409: { en: "A conflict occurred. The record may have been updated elsewhere.", vi: "Xung đột dữ liệu. Bản ghi có thể đã được cập nhật ở nơi khác." },
  422: { en: "Some information looks incorrect. Please check and try again.", vi: "Thông tin không hợp lệ. Vui lòng kiểm tra lại và thử lại." },
};

const TONE_DEFAULT_TITLES: Record<NoticeTone, BiCopy> = {
  error:   { en: "Request failed",  vi: "Yêu cầu thất bại" },
  success: { en: "Saved",           vi: "Đã lưu" },
  info:    { en: "Notice",          vi: "Thông báo" },
  warning: { en: "Warning",         vi: "Cảnh báo" },
};

const TONE_DEFAULT_TIMEOUT_MS: Record<NoticeTone, number> = {
  error: 4500,
  success: 3000,
  info: 3500,
  warning: 4000
};

function normalizeMessagePart(value: unknown): string | null {
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => normalizeMessagePart(item))
      .filter(Boolean)
      .join(", ");
    return joined || null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  return null;
}

function extractStructuredDetail(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const record = value as {
    message?: unknown;
    error?: unknown;
    statusCode?: unknown;
  };

  const directMessage = normalizeMessagePart(record.message);
  if (directMessage) return directMessage;

  const nestedMessage = extractStructuredDetail(record.message);
  if (nestedMessage) return nestedMessage;

  const directError = normalizeMessagePart(record.error);
  if (directError) return directError;

  return null;
}

function parseErrorMessage(error: unknown, fallback?: string | BiCopy): string {
  const lang = getLang();
  const resolvedFallback =
    fallback === undefined
      ? lang === "vi"
        ? "Không thể thực hiện yêu cầu. Vui lòng thử lại."
        : "Unable to complete the request. Please try again."
      : typeof fallback === "object"
        ? fallback[lang]
        : fallback;

  const axiosError = error as AxiosError<{
    message?: string | string[];
    error?: string | { message?: string | string[] };
    statusCode?: number;
  }>;

  const statusCode = axiosError?.response?.status ?? axiosError?.response?.data?.statusCode;

  if (typeof statusCode === "number" && statusCode in STATUS_OVERRIDE) {
    return bi(STATUS_OVERRIDE[statusCode]);
  }

  const responseData = axiosError?.response?.data;
  const detail =
    extractStructuredDetail(responseData?.message) ||
    normalizeMessagePart(responseData?.message) ||
    extractStructuredDetail(responseData?.error) ||
    (typeof responseData?.error === "object"
      ? normalizeMessagePart((responseData.error as { message?: unknown })?.message)
      : normalizeMessagePart(responseData?.error)) ||
    normalizeMessagePart(responseData) ||
    normalizeMessagePart(axiosError?.message) ||
    (error instanceof Error ? normalizeMessagePart(error.message) : null);

  if (typeof statusCode === "number" && statusCode in STATUS_FALLBACK) {
    return detail ?? bi(STATUS_FALLBACK[statusCode]);
  }

  return detail ?? resolvedFallback;
}

export function RequestNotificationsProvider(props: PropsWithChildren) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const lastMessageRef = useRef<{ message: string; tone: NoticeTone; at: number } | null>(null);

  const notify = useMemo<NotificationContextValue["notify"]>(
    () => (input) => {
      const message = input.message.trim();
      if (!message) return;

      const tone = input.tone ?? "error";

      const now = Date.now();
      if (
        lastMessageRef.current &&
        lastMessageRef.current.message === message &&
        lastMessageRef.current.tone === tone &&
        now - lastMessageRef.current.at < 2500
      ) {
        return;
      }

      lastMessageRef.current = { message, tone, at: now };
      const id = now + Math.floor(Math.random() * 1000);

      setNotices((current) => [...current, { id, message, tone, title: input.title }]);

      window.setTimeout(() => {
        setNotices((current) => current.filter((notice) => notice.id !== id));
      }, TONE_DEFAULT_TIMEOUT_MS[tone]);
    },
    []
  );

  const notifyError = useMemo<NotificationContextValue["notifyError"]>(
    () => (error, fallback) => {
      notify({ message: parseErrorMessage(error, fallback), tone: "error" });
    },
    [notify]
  );

  const notifySuccess = useMemo<NotificationContextValue["notifySuccess"]>(
    () => (message, title) => notify({ message, tone: "success", title }),
    [notify]
  );

  const notifyInfo = useMemo<NotificationContextValue["notifyInfo"]>(
    () => (message, title) => notify({ message, tone: "info", title }),
    [notify]
  );

  const notifyWarning = useMemo<NotificationContextValue["notifyWarning"]>(
    () => (message, title) => notify({ message, tone: "warning", title }),
    [notify]
  );

  useEffect(() => {
    notificationHandler = notify;
    return () => {
      if (notificationHandler === notify) {
        notificationHandler = null;
      }
    };
  }, [notify]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notify,
      notifyError,
      notifySuccess,
      notifyInfo,
      notifyWarning
    }),
    [notify, notifyError, notifySuccess, notifyInfo, notifyWarning]
  );

  return (
    <NotificationContext.Provider value={value}>
      {props.children}
      <div className="request-notice-stack" aria-live="polite" aria-atomic="true">
        {notices.map((notice) => (
          <div key={notice.id} className={`request-notice request-notice--${notice.tone}`} role="status">
            <div className="request-notice__title">{notice.title ?? bi(TONE_DEFAULT_TITLES[notice.tone])}</div>
            <div className="request-notice__message">{notice.message}</div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useRequestNotifications() {
  const value = useContext(NotificationContext);
  if (!value) {
    throw new Error("useRequestNotifications must be used within RequestNotificationsProvider");
  }
  return value;
}

export function getRequestErrorMessage(error: unknown, fallback?: string | BiCopy) {
  return parseErrorMessage(error, fallback);
}
