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

type NotificationContextValue = {
  notify: (input: NoticeInput) => void;
  notifyError: (error: unknown, fallback?: string) => void;
  notifySuccess: (message: string, title?: string) => void;
  notifyInfo: (message: string, title?: string) => void;
  notifyWarning: (message: string, title?: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

let notificationHandler: ((input: NoticeInput) => void) | null = null;

export function emitRequestNotification(input: NoticeInput) {
  notificationHandler?.(input);
}

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
    if (!trimmed) return null;

    const throttlerMatch = trimmed.match(/ThrottlerException:\s*(.+)$/i);
    if (throttlerMatch?.[1]) {
      return throttlerMatch[1].trim();
    }

    return trimmed;
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
  if (directMessage) {
    return directMessage;
  }

  const nestedMessage = extractStructuredDetail(record.message);
  if (nestedMessage) {
    return nestedMessage;
  }

  const directError = normalizeMessagePart(record.error);
  if (directError) {
    return directError;
  }

  return null;
}

function parseErrorMessage(error: unknown, fallback = "Unable to complete the request. Please try again.") {
  const axiosError = error as AxiosError<{
    message?: string | string[];
    error?: string | { message?: string | string[] };
    statusCode?: number;
  }>;
  const statusCode = axiosError?.response?.status ?? axiosError?.response?.data?.statusCode;
  const responseData = axiosError?.response?.data;
  const responseMessage =
    extractStructuredDetail(responseData?.message) ||
    normalizeMessagePart(responseData?.message);
  const nestedMessage =
    extractStructuredDetail(responseData?.error) ||
    (typeof responseData?.error === "object"
      ? normalizeMessagePart((responseData.error as { message?: unknown })?.message)
      : normalizeMessagePart(responseData?.error));
  const rawBodyMessage = normalizeMessagePart(responseData);
  const axiosMessage = normalizeMessagePart(axiosError?.message);
  const defaultMessage = normalizeMessagePart(fallback) ?? fallback;

  const detail =
    responseMessage ||
    nestedMessage ||
    rawBodyMessage ||
    axiosMessage ||
    (error instanceof Error ? normalizeMessagePart(error.message) : null) ||
    defaultMessage;

  if (statusCode === 429) {
    return `429 Too Many Requests: ${detail}`;
  }

  if (statusCode === 401) {
    return `401 Unauthorized: ${detail}`;
  }

  if (typeof statusCode === "number") {
    return `${statusCode}: ${detail}`;
  }

  return detail;
}

const TONE_DEFAULT_TITLES: Record<NoticeTone, string> = {
  error: "Backend request issue",
  success: "Saved",
  info: "Notice",
  warning: "Warning"
};

const TONE_DEFAULT_TIMEOUT_MS: Record<NoticeTone, number> = {
  error: 4500,
  success: 3000,
  info: 3500,
  warning: 4000
};

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
            <div className="request-notice__title">{notice.title ?? TONE_DEFAULT_TITLES[notice.tone]}</div>
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

export function getRequestErrorMessage(error: unknown, fallback?: string) {
  return parseErrorMessage(error, fallback);
}
