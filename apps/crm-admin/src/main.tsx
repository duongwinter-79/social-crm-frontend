import React from "react";
import ReactDOM from "react-dom/client";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./app/router";
import { RequestNotificationsProvider, emitRequestNotification, getRequestErrorMessage } from "./app/request-notifications";
import { I18nProvider } from "./i18n";
import "./styles/index.css";

/**
 * Mutations opt into success toasts by passing
 *   meta: { successMessage: 'Lead saved' }
 * (or successMessage as a function of the mutation result for dynamic copy).
 *
 * This avoids the spammy alternative of toasting every mutation by default.
 */
type SuccessMessageInput = string | ((data: unknown) => string | null | undefined);

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
        message: getRequestErrorMessage(error, "Unable to load data from the backend.")
      });
    }
  }),
  mutationCache: new MutationCache({
    onSuccess: (data, _variables, _context, mutation) => {
      const meta = mutation.meta as { successMessage?: SuccessMessageInput } | undefined;
      const raw = meta?.successMessage;
      const message =
        typeof raw === "function"
          ? raw(data)
          : raw;
      if (message) {
        emitRequestNotification({ message, tone: "success" });
      }
    },
    onError: (error) => {
      emitRequestNotification({
        message: getRequestErrorMessage(error, "Unable to complete the backend request.")
      });
    }
  })
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RequestNotificationsProvider>
        <I18nProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </I18nProvider>
      </RequestNotificationsProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
