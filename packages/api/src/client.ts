import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { readStoredTokens, storeTokens, useSessionStore } from "./session";
import type {
  AiQueryResult,
  ApiEnvelope,
  AuthTokens,
  AuthUser,
  CandidateSuggestion,
  DashboardStats,
  HealthStatus,
  Lead,
  LeadListResponse,
  LeadProfile,
  LeadTransitions,
  MatchingResult,
  Order
} from "./types";

const API_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE_URL) ||
  "http://localhost:3000";

function unwrapEnvelope<T>(value: ApiEnvelope<T> | T): T {
  if (value && typeof value === "object" && "data" in (value as ApiEnvelope<T>)) {
    return (value as ApiEnvelope<T>).data;
  }
  return value as T;
}

function decodeJwtPayload(token: string): AuthUser | null {
  try {
    const base64 = token.split(".")[1];
    const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(normalized));
    return {
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles ?? []
    };
  } catch {
    return null;
  }
}

export class SocialCrmApiClient {
  private readonly http: AxiosInstance;
  private refreshPromise: Promise<AuthTokens> | null = null;

  constructor() {
    this.http = axios.create({
      baseURL: `${API_BASE_URL}/api`
    });

    this.http.interceptors.request.use((config) => this.attachToken(config));
    this.http.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => this.handleAuthError(error)
    );
  }

  private attachToken(config: InternalAxiosRequestConfig) {
    const tokens = useSessionStore.getState().tokens ?? readStoredTokens();
    if (tokens?.access_token) {
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    return config;
  }

  private async handleAuthError(error: AxiosError) {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!original || original._retry || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const tokens = useSessionStore.getState().tokens ?? readStoredTokens();
    if (!tokens?.refresh_token) {
      useSessionStore.getState().clearSession();
      return Promise.reject(error);
    }

    original._retry = true;

    if (!this.refreshPromise) {
      this.refreshPromise = this.http
        .post<ApiEnvelope<AuthTokens> | AuthTokens>(
          "/auth/refresh",
          { refresh_token: tokens.refresh_token }
        )
        .then((response) => unwrapEnvelope(response.data))
        .finally(() => {
          this.refreshPromise = null;
        });
    }

    try {
      const nextTokens = await this.refreshPromise;
      storeTokens(nextTokens);
      const user = decodeJwtPayload(nextTokens.access_token);
      useSessionStore.getState().setSession(nextTokens, user);
      original.headers.Authorization = `Bearer ${nextTokens.access_token}`;
      return this.http.request(original);
    } catch (refreshError) {
      useSessionStore.getState().clearSession();
      return Promise.reject(refreshError);
    }
  }

  async login(username: string, password: string) {
    const response = await this.http.post<ApiEnvelope<AuthTokens> | AuthTokens>("/auth/login", { username, password });
    const tokens = unwrapEnvelope(response.data);
    const user = decodeJwtPayload(tokens.access_token);
    useSessionStore.getState().setSession(tokens, user);
    return tokens;
  }

  async getDashboardStats() {
    const response = await this.http.get<ApiEnvelope<DashboardStats> | DashboardStats>("/dashboard/stats");
    return unwrapEnvelope(response.data);
  }

  async getHealth() {
    const response = await this.http.get<ApiEnvelope<HealthStatus> | HealthStatus>("/health");
    return unwrapEnvelope(response.data);
  }

  async listLeads(params: { offset: number; limit: number; source?: string; status?: string; search?: string }) {
    const response = await this.http.get<ApiEnvelope<LeadListResponse> | LeadListResponse>("/leads", { params });
    return unwrapEnvelope(response.data);
  }

  async getLead(id: string) {
    const response = await this.http.get<ApiEnvelope<Lead> | Lead>(`/leads/${id}`);
    return unwrapEnvelope(response.data);
  }

  async getLeadTransitions(id: string) {
    const response = await this.http.get<ApiEnvelope<LeadTransitions> | LeadTransitions>(`/leads/${id}/transitions`);
    return unwrapEnvelope(response.data);
  }

  async updateLead(id: string, patch: Partial<Lead>) {
    const response = await this.http.patch<ApiEnvelope<Lead> | Lead>(`/leads/${id}`, patch);
    return unwrapEnvelope(response.data);
  }

  async getLeadProfile(leadId: string) {
    const response = await this.http.get<ApiEnvelope<LeadProfile> | LeadProfile>(`/leads/${leadId}/profile`);
    return unwrapEnvelope(response.data);
  }

  async upsertLeadProfile(leadId: string, patch: Partial<LeadProfile>) {
    const response = await this.http.patch<ApiEnvelope<LeadProfile> | LeadProfile>(`/leads/${leadId}/profile`, patch);
    return unwrapEnvelope(response.data);
  }

  async listOrders() {
    const response = await this.http.get<ApiEnvelope<Order[]> | Order[]>("/orders");
    return unwrapEnvelope(response.data);
  }

  async queryThread(threadId: string, prompt: string) {
    const response = await this.http.post<ApiEnvelope<AiQueryResult> | AiQueryResult>("/ai-extraction/query", {
      threadId,
      prompt
    });
    return unwrapEnvelope(response.data);
  }

  async evaluateMatching(leadId: string, orderId: string) {
    const response = await this.http.post<ApiEnvelope<MatchingResult> | MatchingResult>("/matching/evaluate", {
      leadId,
      orderId
    });
    return unwrapEnvelope(response.data);
  }

  async suggestOrders(candidateId: string) {
    const response = await this.http.get<ApiEnvelope<CandidateSuggestion[]> | CandidateSuggestion[]>(`/matching/suggest/${candidateId}`);
    return unwrapEnvelope(response.data);
  }

  async testCnvToken() {
    const response = await this.http.get<ApiEnvelope<{ success: boolean; tokenPrefix: string | null }> | { success: boolean; tokenPrefix: string | null }>("/cnv/webhook-admin/test-token");
    return unwrapEnvelope(response.data);
  }

  async getCnvInfo() {
    const response = await this.http.get<ApiEnvelope<{ success: boolean; result: unknown }> | { success: boolean; result: unknown }>("/cnv/webhook-admin/info");
    return unwrapEnvelope(response.data);
  }

  async registerCnvWebhook() {
    const response = await this.http.post<ApiEnvelope<{ success: boolean; result: unknown }> | { success: boolean; result: unknown }>("/cnv/webhook-admin/register");
    return unwrapEnvelope(response.data);
  }

  async removeCnvWebhook() {
    const response = await this.http.delete<ApiEnvelope<{ success: boolean; result: unknown }> | { success: boolean; result: unknown }>("/cnv/webhook-admin/remove");
    return unwrapEnvelope(response.data);
  }
}

export const apiClient = new SocialCrmApiClient();
