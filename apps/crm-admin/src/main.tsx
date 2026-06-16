import React from "react";
import ReactDOM from "react-dom/client";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./app/router";
import { RequestNotificationsProvider, emitRequestNotification, getRequestErrorMessage } from "./app/request-notifications";
import { I18nProvider } from "./i18n";
import { UiTextProvider } from "./ui-text/ui-text-provider";
import "./ui-text/ui-text.css";
import "./styles/index.css";

/**
 * Mutations opt into success toasts by passing
 *   meta: { successMessage: { en: 'Lead saved', vi: 'Đã lưu hồ sơ' } }
 * (or a plain string / function for cases that don't need translation).
 *
 * The language is read from localStorage at toast time using the same key
 * as I18nProvider — no React context needed here.
 */
type SuccessMessageInput =
  | string
  | { en: string; vi: string }
  | ((data: unknown) => string | null | undefined);

function resolveSuccessMessage(raw: SuccessMessageInput, data: unknown): string | null | undefined {
  if (typeof raw === "function") return raw(data);
  if (typeof raw === "object") {
    const lang = typeof window !== "undefined" ? window.localStorage.getItem("crm-admin-lang") : null;
    return lang === "vi" ? raw.vi : raw.en;
  }
  return raw;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    },
    mutations: {
      retry: false
    }
  },
  queryCache: new QueryCache({
    onError: (error) => {
      emitRequestNotification({
        message: getRequestErrorMessage(error, { en: "Unable to load data. Please refresh the page.", vi: "Không tải được dữ liệu. Vui lòng tải lại trang." })
      });
    }
  }),
  mutationCache: new MutationCache({
    onSuccess: (data, _variables, _context, mutation) => {
      const meta = mutation.meta as { successMessage?: SuccessMessageInput } | undefined;
      const raw = meta?.successMessage;
      const message = raw !== undefined ? resolveSuccessMessage(raw, data) : undefined;
      if (message) {
        emitRequestNotification({ message, tone: "success" });
      }
    },
    onError: (error) => {
      emitRequestNotification({
        message: getRequestErrorMessage(error, { en: "Unable to complete the request. Please try again.", vi: "Không thể thực hiện yêu cầu. Vui lòng thử lại." })
      });
    }
  })
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RequestNotificationsProvider>
        <I18nProvider>
          <UiTextProvider>
            <BrowserRouter>
              <AppRouter />
            </BrowserRouter>
          </UiTextProvider>
        </I18nProvider>
      </RequestNotificationsProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
