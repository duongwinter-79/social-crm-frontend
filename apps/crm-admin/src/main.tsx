import React from "react";
import ReactDOM from "react-dom/client";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./app/router";
import { RequestNotificationsProvider, emitRequestNotification, getRequestErrorMessage } from "./app/request-notifications";
import { I18nProvider } from "./i18n";
import "./styles/index.css";

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
