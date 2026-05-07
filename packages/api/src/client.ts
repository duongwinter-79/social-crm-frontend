import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { readStoredTokens, storeTokens, useSessionStore } from "./session";
import type {
  AiQueryResult,
  AdminUser,
  AdminAuditLogListResponse,
  CnvConnectionStatus,
  CnvCustomersResponse,
  CnvResourceListResponse,
  AdminSessionListResponse,
  AdminSystemStatus,
  AdminUserListResponse,
  ApplicationListResponse,
  ApplicationRecord,
  ApiEnvelope,
  AuthTokens,
  AuthUser,
  CandidateFormalEvaluation,
  CandidateListResponse,
  CandidateRef,
  CandidateSuggestion,
  DashboardStats,
  DocumentChecklistSummary,
  DocumentListResponse,
  DocumentRecord,
  HealthStatus,
  Lead,
  LeadQualificationSnapshot,
  LeadTriageEvaluation,
  LeadListResponse,
  LeadProfile,
  LeadTransitions,
  MatchingResult,
  MessageListResponse,
  Order,
  OrderMutationPayload,
  PipelineResponse,
  ThreadListResponse,
  ThreadSummary,
  TrainingFinanceListResponse,
  TrainingFinanceRecord
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

  async getLeadQualification(leadId: string) {
    const response = await this.http.get<ApiEnvelope<LeadQualificationSnapshot> | LeadQualificationSnapshot>(`/leads/${leadId}/qualification`);
    return unwrapEnvelope(response.data);
  }

  async updateLeadQualification(leadId: string, patch: Record<string, unknown>) {
    const response = await this.http.patch<ApiEnvelope<Lead> | Lead>(`/leads/${leadId}/qualification`, patch);
    return unwrapEnvelope(response.data);
  }

  async listThreads(params: { offset: number; limit: number; channel?: string; leadId?: string; analyzeStatus?: string; search?: string }) {
    const response = await this.http.get<ApiEnvelope<ThreadListResponse> | ThreadListResponse>("/interactions/threads", { params });
    return unwrapEnvelope(response.data);
  }

  async listLeadThreads(leadId: string, params: { offset: number; limit: number; channel?: string; analyzeStatus?: string; search?: string }) {
    const response = await this.http.get<ApiEnvelope<ThreadListResponse> | ThreadListResponse>(`/interactions/leads/${leadId}/threads`, { params });
    return unwrapEnvelope(response.data);
  }

  async getThread(id: string) {
    const response = await this.http.get<ApiEnvelope<ThreadSummary> | ThreadSummary>(`/interactions/threads/${id}`);
    return unwrapEnvelope(response.data);
  }

  async listThreadMessages(threadId: string, params: { offset: number; limit: number; direction?: string; type?: string }) {
    const response = await this.http.get<ApiEnvelope<MessageListResponse> | MessageListResponse>(`/interactions/threads/${threadId}/messages`, { params });
    return unwrapEnvelope(response.data);
  }

  async listOrders() {
    const response = await this.http.get<ApiEnvelope<Order[]> | Order[]>("/orders");
    return unwrapEnvelope(response.data);
  }

  async getOrder(id: string) {
    const response = await this.http.get<ApiEnvelope<Order> | Order>(`/orders/${id}`);
    return unwrapEnvelope(response.data);
  }

  async createOrder(payload: OrderMutationPayload & { name: string }) {
    const response = await this.http.post<ApiEnvelope<Order> | Order>("/orders", payload);
    return unwrapEnvelope(response.data);
  }

  async updateOrder(id: string, patch: OrderMutationPayload) {
    const response = await this.http.patch<ApiEnvelope<Order> | Order>(`/orders/${id}`, patch);
    return unwrapEnvelope(response.data);
  }

  async listApplications(params: { offset: number; limit: number; leadId?: string; candidateId?: string; orderId?: string; status?: string }) {
    const response = await this.http.get<ApiEnvelope<ApplicationListResponse> | ApplicationListResponse>("/applications", { params });
    return unwrapEnvelope(response.data);
  }

  async getApplication(id: string) {
    const response = await this.http.get<ApiEnvelope<ApplicationRecord> | ApplicationRecord>(`/applications/${id}`);
    return unwrapEnvelope(response.data);
  }

  async updateApplication(id: string, patch: Record<string, unknown>) {
    const response = await this.http.patch<ApiEnvelope<ApplicationRecord> | ApplicationRecord>(`/applications/${id}`, patch);
    return unwrapEnvelope(response.data);
  }

  async createApplication(payload: { candidateId: string; orderId: string; status?: string; interviewDate?: string; interviewResult?: string; rejectReason?: string }) {
    const response = await this.http.post<ApiEnvelope<ApplicationRecord> | ApplicationRecord>("/applications", payload);
    return unwrapEnvelope(response.data);
  }

  async queryThread(threadId: string, prompt: string) {
    const response = await this.http.post<ApiEnvelope<AiQueryResult> | AiQueryResult>("/ai-extraction/query", {
      threadId,
      prompt
    });
    return unwrapEnvelope(response.data);
  }

  async evaluateLeadTriage(leadId: string, orderId: string) {
    const response = await this.http.post<ApiEnvelope<LeadTriageEvaluation> | LeadTriageEvaluation>("/matching/triage", {
      leadId,
      orderId
    });
    return unwrapEnvelope(response.data);
  }

  async evaluateCandidateMatch(candidateId: string, orderId: string) {
    const response = await this.http.post<ApiEnvelope<CandidateFormalEvaluation> | CandidateFormalEvaluation>("/matching/evaluate-candidate", {
      candidateId,
      orderId
    });
    return unwrapEnvelope(response.data);
  }

  async suggestOrders(candidateId: string) {
    const response = await this.http.get<ApiEnvelope<CandidateSuggestion[]> | CandidateSuggestion[]>(`/matching/suggest/${candidateId}`);
    return unwrapEnvelope(response.data);
  }

  async listCandidates(params: { offset: number; limit: number; leadId?: string; lifecycleStatus?: string; search?: string }) {
    const response = await this.http.get<ApiEnvelope<CandidateListResponse> | CandidateListResponse>("/recruitment/candidates", { params });
    return unwrapEnvelope(response.data);
  }

  async getCandidateByLead(leadId: string) {
    const response = await this.http.get<ApiEnvelope<CandidateRef | null> | CandidateRef | null>(`/recruitment/candidates/by-lead/${leadId}`);
    return unwrapEnvelope(response.data);
  }

  async listDocuments(params: { offset: number; limit: number; leadId?: string; candidateId?: string; docType?: string; status?: string }) {
    const response = await this.http.get<ApiEnvelope<DocumentListResponse> | DocumentListResponse>("/documents", { params });
    return unwrapEnvelope(response.data);
  }

  async getLeadDocumentChecklist(leadId: string) {
    const response = await this.http.get<ApiEnvelope<DocumentChecklistSummary> | DocumentChecklistSummary>(`/documents/lead/${leadId}/checklist`);
    return unwrapEnvelope(response.data);
  }

  async getCandidateDocumentChecklist(candidateId: string) {
    const response = await this.http.get<ApiEnvelope<DocumentChecklistSummary> | DocumentChecklistSummary>(`/documents/candidate/${candidateId}/checklist`);
    return unwrapEnvelope(response.data);
  }

  async createDocument(payload: { leadId: string; candidateId?: string; docType: string; status?: string; fileUrl?: string; storageBucket?: string; issueDate?: string; expiryDate?: string }) {
    const response = await this.http.post<ApiEnvelope<DocumentRecord> | DocumentRecord>("/documents", payload);
    return unwrapEnvelope(response.data);
  }

  async updateDocument(id: string, patch: Record<string, unknown>) {
    const response = await this.http.patch<ApiEnvelope<DocumentRecord> | DocumentRecord>(`/documents/${id}`, patch);
    return unwrapEnvelope(response.data);
  }

  async listTrainingFinance(params: { offset: number; limit: number; leadId?: string; orderId?: string }) {
    const response = await this.http.get<ApiEnvelope<TrainingFinanceListResponse> | TrainingFinanceListResponse>("/training-finance", { params });
    return unwrapEnvelope(response.data);
  }

  async getTrainingFinanceByLead(leadId: string) {
    const response = await this.http.get<ApiEnvelope<TrainingFinanceRecord[]> | TrainingFinanceRecord[]>(`/training-finance/lead/${leadId}`);
    return unwrapEnvelope(response.data);
  }

  async createTrainingFinance(payload: { leadId: string; orderId?: string; orderType?: string; depositStatus?: string; amountPaid?: number; trainingStartDate?: string; trainingProgress?: string; visaDate?: string; departureDate?: string }) {
    const response = await this.http.post<ApiEnvelope<TrainingFinanceRecord> | TrainingFinanceRecord>("/training-finance", payload);
    return unwrapEnvelope(response.data);
  }

  async updateTrainingFinance(id: string, patch: Record<string, unknown>) {
    const response = await this.http.patch<ApiEnvelope<TrainingFinanceRecord> | TrainingFinanceRecord>(`/training-finance/${id}`, patch);
    return unwrapEnvelope(response.data);
  }

  async getPipeline(params: { offset: number; limit: number; stage?: string; search?: string }) {
    const response = await this.http.get<ApiEnvelope<PipelineResponse> | PipelineResponse>("/pipeline", { params });
    return unwrapEnvelope(response.data);
  }

  async listUsers(params: { offset: number; limit: number; search?: string; role?: string; isActive?: boolean }) {
    const response = await this.http.get<ApiEnvelope<AdminUserListResponse> | AdminUserListResponse>("/users", { params });
    return unwrapEnvelope(response.data);
  }

  async getUser(id: string) {
    const response = await this.http.get<ApiEnvelope<AdminUser> | AdminUser>(`/users/${id}`);
    return unwrapEnvelope(response.data);
  }

  async createUser(payload: { username: string; password: string; role?: string; isActive?: boolean }) {
    const response = await this.http.post<ApiEnvelope<AdminUser> | AdminUser>("/users", payload);
    return unwrapEnvelope(response.data);
  }

  async updateUser(id: string, payload: { username?: string; password?: string; role?: string; isActive?: boolean }) {
    const response = await this.http.patch<ApiEnvelope<AdminUser> | AdminUser>(`/users/${id}`, payload);
    return unwrapEnvelope(response.data);
  }

  async getAdminSystemStatus() {
    const response = await this.http.get<ApiEnvelope<AdminSystemStatus> | AdminSystemStatus>("/admin/system-status");
    return unwrapEnvelope(response.data);
  }

  async listAdminAuditLogs(params: { limit: number; action?: string; targetType?: string }) {
    const response = await this.http.get<ApiEnvelope<AdminAuditLogListResponse> | AdminAuditLogListResponse>("/admin/audit-logs", { params });
    return unwrapEnvelope(response.data);
  }

  async listAdminSessions(params: { limit: number; includeRevoked?: boolean }) {
    const response = await this.http.get<ApiEnvelope<AdminSessionListResponse> | AdminSessionListResponse>("/admin/sessions", { params });
    return unwrapEnvelope(response.data);
  }

  async revokeAdminSession(id: string) {
    const response = await this.http.delete<ApiEnvelope<{ success: boolean; sessionId: string; revokedAt: string }> | { success: boolean; sessionId: string; revokedAt: string }>(`/admin/sessions/${id}`);
    return unwrapEnvelope(response.data);
  }

  async testCnvToken() {
    const response = await this.http.get<ApiEnvelope<{ success: boolean; tokenPrefix: string | null }> | { success: boolean; tokenPrefix: string | null }>("/cnv/webhook-admin/test-token");
    return unwrapEnvelope(response.data);
  }

  async getCnvConnectionStatus() {
    const response = await this.http.get<ApiEnvelope<CnvConnectionStatus> | CnvConnectionStatus>("/cnv/webhook-admin/status");
    return unwrapEnvelope(response.data);
  }

  async getCnvConnectLink() {
    const response = await this.http.post<ApiEnvelope<{ success: boolean; url: string }> | { success: boolean; url: string }>("/cnv/webhook-admin/connect-link");
    return unwrapEnvelope(response.data);
  }

  async getCnvInfo() {
    const response = await this.http.get<ApiEnvelope<{ success: boolean; result: unknown }> | { success: boolean; result: unknown }>("/cnv/webhook-admin/info");
    return unwrapEnvelope(response.data);
  }

  async listCnvCustomers(params: Record<string, string | number | boolean | undefined> = {}) {
    const response = await this.http.get<ApiEnvelope<CnvCustomersResponse> | CnvCustomersResponse>("/cnv/webhook-admin/customers", { params });
    return unwrapEnvelope(response.data);
  }

  async listCnvProducts(params: Record<string, string | number | boolean | undefined> = {}) {
    const response = await this.http.get<ApiEnvelope<CnvResourceListResponse> | CnvResourceListResponse>("/cnv/webhook-admin/products", { params });
    return unwrapEnvelope(response.data);
  }

  async listCnvOrders(params: Record<string, string | number | boolean | undefined> = {}) {
    const response = await this.http.get<ApiEnvelope<CnvResourceListResponse> | CnvResourceListResponse>("/cnv/webhook-admin/orders", { params });
    return unwrapEnvelope(response.data);
  }

  async listCnvCustomCollections(params: Record<string, string | number | boolean | undefined> = {}) {
    const response = await this.http.get<ApiEnvelope<CnvResourceListResponse> | CnvResourceListResponse>("/cnv/webhook-admin/custom-collections", { params });
    return unwrapEnvelope(response.data);
  }

  async listCnvSmartCollections(params: Record<string, string | number | boolean | undefined> = {}) {
    const response = await this.http.get<ApiEnvelope<CnvResourceListResponse> | CnvResourceListResponse>("/cnv/webhook-admin/smart-collections", { params });
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

  async disconnectCnv() {
    const response = await this.http.delete<ApiEnvelope<{ success: boolean; disconnected: boolean }> | { success: boolean; disconnected: boolean }>("/cnv/webhook-admin/disconnect");
    return unwrapEnvelope(response.data);
  }
}

export const apiClient = new SocialCrmApiClient();
