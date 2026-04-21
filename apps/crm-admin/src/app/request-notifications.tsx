import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import type { AxiosError } from "axios";

type NoticeTone = "error";

type Notice = {
  id: number;
  message: string;
  tone: NoticeTone;
};

type NoticeInput = {
  message: string;
  tone?: NoticeTone;
};

type NotificationContextValue = {
  notify: (input: NoticeInput) => void;
  notifyError: (error: unknown, fallback?: string) => void;
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

export function RequestNotificationsProvider(props: PropsWithChildren) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const lastMessageRef = useRef<{ message: string; at: number } | null>(null);

  const notify = useMemo<NotificationContextValue["notify"]>(
    () => (input) => {
      const message = input.message.trim();
      if (!message) return;

      const now = Date.now();
      if (
        lastMessageRef.current &&
        lastMessageRef.current.message === message &&
        now - lastMessageRef.current.at < 2500
      ) {
        return;
      }

      lastMessageRef.current = { message, at: now };
      const id = now + Math.floor(Math.random() * 1000);

      setNotices((current) => [...current, { id, message, tone: input.tone ?? "error" }]);

      window.setTimeout(() => {
        setNotices((current) => current.filter((notice) => notice.id !== id));
      }, 4500);
    },
    []
  );

  const notifyError = useMemo<NotificationContextValue["notifyError"]>(
    () => (error, fallback) => {
      notify({ message: parseErrorMessage(error, fallback), tone: "error" });
    },
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
      notifyError
    }),
    [notify, notifyError]
  );

  return (
    <NotificationContext.Provider value={value}>
      {props.children}
      <div className="request-notice-stack" aria-live="polite" aria-atomic="true">
        {notices.map((notice) => (
          <div key={notice.id} className={`request-notice request-notice--${notice.tone}`} role="status">
            <div className="request-notice__title">Backend request issue</div>
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
