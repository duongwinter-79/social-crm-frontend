import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import {
  decodeJwtUser,
  isAccessTokenStale,
  notifyLoginAcrossTabs,
  useSessionStore
} from "./session";
import type {
  AiExtractionWorkerStatus,
  ZaloNameEnrichmentWorkerStatus,
  AiQueryResult,
  AiSuggestion,
  LeadOrderSuggestion,
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
  CandidateFormalEvaluation,
  CandidateListResponse,
  CandidateRef,
  CandidateSuggestion,
  DashboardStats,
  DocumentChecklistSummary,
  FormStandardRegisterResponse,
  FormStandardStageResult,
  PendingEditSessionOpenResult,
  PendingEditSessionStatus,
  VerifyPendingResult,
  CommitPendingFormPayload,
  CreateLeadPayload,
  DocumentListResponse,
  DocumentRecord,
  HealthStatus,
  ImportBatch,
  ImportBatchListResponse,
  ImportBatchRowListResponse,
  ImportNotesLeadGroup,
  ImportRowDedupStatus,
  Lead,
  LeadQualificationSnapshot,
  LeadTriageEvaluation,
  LeadListResponse,
  LeadTransitions,
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

/**
 * Pull `filename="..."` out of a Content-Disposition header.  Falls back to
 * the RFC 5987 `filename*=UTF-8''...` form when present.
 */
function parseFilenameFromContentDisposition(header: string | undefined | null): string | null {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // fall through to plain match
    }
  }
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch ? plainMatch[1] : null;
}

/**
 * Server response shape after Step 7F: refresh token lives in an httpOnly
 * cookie, so the JSON body only carries the access token.
 */
interface AccessTokenResponse {
  access_token: string;
}

interface LoginPublicKeyResponse {
  keyId: string;
  algorithm: "RSA-OAEP-256";
  publicKey: JsonWebKey;
}

interface EncryptedCredentialPayload {
  keyId: string;
  encryptedPassword: string;
}

function arrayBufferToBase64(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export class SocialCrmApiClient {
  private readonly http: AxiosInstance;
  /** In-flight refresh request shared across concurrent callers (single-flight). */
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.http = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      // Required so the httpOnly refresh cookie travels with /auth/refresh and /auth/logout.
      withCredentials: true
    });

    this.http.interceptors.request.use((config) => this.attachToken(config));
    this.http.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => this.handleAuthError(error)
    );
  }

  /**
   * Attach the bearer token. If the access token is within 30 seconds of
   * expiry, refresh proactively to avoid a 401-then-retry round trip.
   *
   * Skips refresh on the auth endpoints (no token to attach for login;
   * /auth/refresh manages its own flow via the cookie).
   */
  private async attachToken(config: InternalAxiosRequestConfig) {
    const url = config.url ?? "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/login-key") ||
      url.includes("/auth/refresh");

    const accessToken = useSessionStore.getState().accessToken;
    if (!accessToken) return config;

    if (!isAuthEndpoint && isAccessTokenStale(30, accessToken)) {
      try {
        const fresh = await this.runRefresh();
        config.headers.Authorization = `Bearer ${fresh}`;
        return config;
      } catch {
        // Fall through and let the request 401 — handleAuthError will clean up.
      }
    }

    config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  }

  private async handleAuthError(error: AxiosError) {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!original || original._retry || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const accessToken = useSessionStore.getState().accessToken;
    if (!accessToken) {
      // Already cleared — propagate the error so the caller sees the 401.
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const nextAccess = await this.runRefresh();
      original.headers.Authorization = `Bearer ${nextAccess}`;
      return this.http.request(original);
    } catch (refreshError) {
      useSessionStore.getState().clearSession("expired");
      return Promise.reject(refreshError);
    }
  }

  /**
   * Single-flight refresh. The httpOnly cookie carries the refresh token
   * automatically — we POST an empty body. Returns the fresh access token.
   */
  private runRefresh(): Promise<string> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.http
        .post<ApiEnvelope<AccessTokenResponse> | AccessTokenResponse>("/auth/refresh", {})
        .then((response) => {
          const next = unwrapEnvelope(response.data).access_token;
          useSessionStore.getState().setSession(next);
          notifyLoginAcrossTabs(next);
          return next;
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  /**
   * On page load there is no in-memory access token, but a valid httpOnly
   * refresh cookie may still exist from a prior session. Try a single refresh.
   * Returns true if a session was restored, false if the user must log in.
   */
  async bootstrapSession(): Promise<boolean> {
    try {
      await this.runRefresh();
      return true;
    } catch {
      // No valid cookie or refresh failed — user is unauthenticated.
      return false;
    }
  }

  async login(username: string, password: string) {
    const credential = await this.encryptPasswordCredential(password);
    const response = await this.http.post<ApiEnvelope<AccessTokenResponse> | AccessTokenResponse>(
      "/auth/login",
      { username, ...credential }
    );
    const accessToken = unwrapEnvelope(response.data).access_token;
    useSessionStore.getState().setSession(accessToken);
    notifyLoginAcrossTabs(accessToken);
    return { accessToken, user: decodeJwtUser(accessToken) };
  }

  private async encryptPasswordCredential(password: string): Promise<EncryptedCredentialPayload> {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      throw new Error("Secure credential encryption is not available in this browser.");
    }

    const keyResponse = await this.http.get<ApiEnvelope<LoginPublicKeyResponse> | LoginPublicKeyResponse>("/auth/login-key");
    const loginKey = unwrapEnvelope(keyResponse.data);
    const publicKey = await subtle.importKey(
      "jwk",
      loginKey.publicKey,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );
    const encrypted = await subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      new TextEncoder().encode(password)
    );

    return {
      keyId: loginKey.keyId,
      encryptedPassword: arrayBufferToBase64(encrypted)
    };
  }

  /**
   * Logout: tells the server to revoke the refresh session and clear the
   * cookie, then drops the access token locally. Cross-tab logout fires via
   * BroadcastChannel inside clearSession().
   */
  async logout() {
    try {
      await this.http.post("/auth/logout", {}).catch(() => undefined);
    } finally {
      useSessionStore.getState().clearSession("manual");
    }
  }

  async getDashboardStats() {
    const response = await this.http.get<ApiEnvelope<DashboardStats> | DashboardStats>("/dashboard/stats");
    return unwrapEnvelope(response.data);
  }

  // ── Zalo name enrichment worker (admin) ─────────────────────────────
  async getZaloEnrichmentWorkerStatus(): Promise<ZaloNameEnrichmentWorkerStatus> {
    const response = await this.http.get<ApiEnvelope<ZaloNameEnrichmentWorkerStatus> | ZaloNameEnrichmentWorkerStatus>(
      "/webhook/zalo/enrich-names/status"
    );
    return unwrapEnvelope(response.data);
  }

  async triggerZaloEnrichmentWorker(): Promise<ZaloNameEnrichmentWorkerStatus> {
    const response = await this.http.post<ApiEnvelope<ZaloNameEnrichmentWorkerStatus> | ZaloNameEnrichmentWorkerStatus>(
      "/webhook/zalo/enrich-names/trigger",
      {}
    );
    return unwrapEnvelope(response.data);
  }

  // ── AI extraction worker (admin) ─────────────────────────────────────

  async getAiExtractionWorkerStatus(): Promise<AiExtractionWorkerStatus> {
    const response = await this.http.get<ApiEnvelope<AiExtractionWorkerStatus> | AiExtractionWorkerStatus>(
      "/ai-extraction/worker/status"
    );
    return unwrapEnvelope(response.data);
  }

  async triggerAiExtractionWorker(): Promise<AiExtractionWorkerStatus> {
    const response = await this.http.post<ApiEnvelope<AiExtractionWorkerStatus> | AiExtractionWorkerStatus>(
      "/ai-extraction/worker/trigger",
      {}
    );
    return unwrapEnvelope(response.data);
  }

  // ── Imports (xlsx upload) ────────────────────────────────────────────

  async previewLeadsImport(file: File): Promise<ImportBatch> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await this.http.post<ApiEnvelope<ImportBatch> | ImportBatch>(
      "/imports/leads/preview",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return unwrapEnvelope(response.data);
  }

  async listImportBatches(params: { limit?: number; offset?: number } = {}) {
    const response = await this.http.get<ApiEnvelope<ImportBatchListResponse> | ImportBatchListResponse>(
      "/imports/leads",
      { params }
    );
    return unwrapEnvelope(response.data);
  }

  async getImportBatch(id: string): Promise<ImportBatch> {
    const response = await this.http.get<ApiEnvelope<ImportBatch> | ImportBatch>(`/imports/leads/${id}`);
    return unwrapEnvelope(response.data);
  }

  async listImportBatchRows(
    id: string,
    params: { limit?: number; offset?: number; dedupStatus?: ImportRowDedupStatus } = {}
  ) {
    const response = await this.http.get<
      ApiEnvelope<ImportBatchRowListResponse> | ImportBatchRowListResponse
    >(`/imports/leads/${id}/rows`, { params });
    return unwrapEnvelope(response.data);
  }

  async applyImportBatch(id: string): Promise<{ id: string; status: string; message?: string }> {
    const response = await this.http.post<
      | ApiEnvelope<{ id: string; status: string; message?: string }>
      | { id: string; status: string; message?: string }
    >(`/imports/leads/${id}/apply`);
    return unwrapEnvelope(response.data);
  }

  async cancelImportBatch(id: string): Promise<ImportBatch> {
    const response = await this.http.post<ApiEnvelope<ImportBatch> | ImportBatch>(
      `/imports/leads/${id}/cancel`,
      {}
    );
    return unwrapEnvelope(response.data);
  }

  // ── Operator-triggered notes extraction (preview/apply gate) ─────────

  async triggerImportNotesExtraction(id: string) {
    const response = await this.http.post<
      | ApiEnvelope<{ id: string; status: string; message?: string }>
      | { id: string; status: string; message?: string }
    >(`/imports/leads/${id}/extract-notes`, {});
    return unwrapEnvelope(response.data);
  }

  async listImportNotesSuggestions(id: string): Promise<ImportNotesLeadGroup[]> {
    const response = await this.http.get<ApiEnvelope<ImportNotesLeadGroup[]> | ImportNotesLeadGroup[]>(
      `/imports/leads/${id}/notes-suggestions`
    );
    return unwrapEnvelope(response.data);
  }

  async applyImportNotesSuggestions(
    id: string,
    selections: Array<{ leadId: string; fieldNames: string[] }>
  ): Promise<{ applied: number; skipped: number; skipReasons?: Record<string, number> }> {
    const response = await this.http.post<
      ApiEnvelope<{ applied: number; skipped: number; skipReasons?: Record<string, number> }> | { applied: number; skipped: number; skipReasons?: Record<string, number> }
    >(`/imports/leads/${id}/apply-suggestions`, { selections });
    return unwrapEnvelope(response.data);
  }

  async getHealth() {
    const response = await this.http.get<ApiEnvelope<HealthStatus> | HealthStatus>("/health");
    return unwrapEnvelope(response.data);
  }

  async listLeads(params: {
    offset: number;
    limit: number;
    source?: string;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const response = await this.http.get<ApiEnvelope<LeadListResponse> | LeadListResponse>("/leads", { params });
    return unwrapEnvelope(response.data);
  }

  /**
   * Download leads as CSV using the current filter set. Returns a Blob plus
   * the server-suggested filename (from Content-Disposition) so the caller
   * can trigger a browser download.
   */
  async exportLeadsCsv(params: { source?: string; status?: string; search?: string; dateFrom?: string; dateTo?: string; lang?: "vi" | "en" } = {}) {
    const response = await this.http.get<Blob>("/leads/export.csv", {
      params: { lang: params.lang ?? "vi", ...params },
      responseType: "blob"
    });
    const filename = parseFilenameFromContentDisposition(response.headers["content-disposition"]) ?? `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    return { blob: response.data, filename };
  }

  async exportOrdersCsv(params: { lang?: "vi" | "en" } = {}) {
    const response = await this.http.get<Blob>("/orders/export.csv", {
      params: { lang: params.lang ?? "vi" },
      responseType: "blob"
    });
    const filename = parseFilenameFromContentDisposition(response.headers["content-disposition"]) ?? `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    return { blob: response.data, filename };
  }

  async getLead(id: string) {
    const response = await this.http.get<ApiEnvelope<Lead> | Lead>(`/leads/${id}`);
    return unwrapEnvelope(response.data);
  }

  async createLead(payload: CreateLeadPayload) {
    const response = await this.http.post<ApiEnvelope<Lead> | Lead>("/leads", payload);
    return unwrapEnvelope(response.data);
  }

  async getLeadTransitions(id: string) {
    const response = await this.http.get<ApiEnvelope<LeadTransitions> | LeadTransitions>(`/leads/${id}/transitions`);
    return unwrapEnvelope(response.data);
  }

  async updateLead(id: string, patch: Partial<Lead> & { disqualifiedReason?: string }) {
    const response = await this.http.patch<ApiEnvelope<Lead> | Lead>(`/leads/${id}`, patch);
    return unwrapEnvelope(response.data);
  }

  /**
   * Roll a disqualified lead back to its previous pipeline state. Backend
   * clears all disqualification metadata and writes an admin audit row.
   */
  async restoreLead(id: string) {
    const response = await this.http.post<ApiEnvelope<Lead> | Lead>(`/leads/${id}/restore`);
    return unwrapEnvelope(response.data);
  }

  async getLeadQualification(leadId: string) {
    const response = await this.http.get<ApiEnvelope<LeadQualificationSnapshot> | LeadQualificationSnapshot>(`/leads/${leadId}/qualification`);
    return unwrapEnvelope(response.data);
  }

  async getLeadAiSuggestions(leadId: string) {
    const response = await this.http.get<ApiEnvelope<AiSuggestion[]> | AiSuggestion[]>(`/leads/${leadId}/ai-suggestions`);
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

  async getMessageMedia(messageId: string) {
    const response = await this.http.get<Blob>(`/interactions/messages/${messageId}/media`, {
      responseType: "blob"
    });
    return response.data;
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

  async deleteApplication(id: string) {
    const response = await this.http.delete<ApiEnvelope<{ deleted: boolean; id: string }> | { deleted: boolean; id: string }>(`/applications/${id}`);
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

  /**
   * Operator-triggered structured AI extraction. Runs the same processThread
   * path the event listener and worker use, with per-thread debounce ignored.
   * Writes LeadAiSuggestion rows + applies the auto-apply allowlist + recomputes
   * lead score.
   */
  /**
   * `scanMode`:
   *   - `"new_only"` (default) — process only inbound text messages with
   *     `aiScannedAt IS NULL`. Cheap; matches the worker / inbound listener.
   *   - `"include_scanned"` — operator-triggered full rescan; reprocesses
   *     previously scanned messages too. Use after AI prompt changes or to
   *     fix missed extraction. Suggestions can supersede older ones, but
   *     verified lead fields stay authoritative.
   */
  async processThreadExtraction(args: {
    leadId: string;
    threadId: string;
    maxBatches?: number;
    scanMode?: "new_only" | "include_scanned";
  }) {
    const response = await this.http.post<
      | ApiEnvelope<{ threadId: string; leadId: string; triggered: boolean; mode?: string; scanMode?: string }>
      | { threadId: string; leadId: string; triggered: boolean; mode?: string; scanMode?: string }
    >("/ai-extraction/process-thread", args);
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

  /**
   * Lead-stage auto-suggest. Returns top-N orders ranked by triage score —
   * works at lead screening stage, before a candidate record exists.
   * Implements PDF automation #2.
   */
  async suggestOrdersForLead(leadId: string, params: { limit?: number } = {}) {
    const response = await this.http.get<ApiEnvelope<LeadOrderSuggestion[]> | LeadOrderSuggestion[]>(
      `/matching/suggest-for-lead/${leadId}`,
      { params }
    );
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

  async getFormStandardRegister(params: { offset: number; limit: number; status?: string; search?: string; leadId?: string }) {
    const response = await this.http.get<ApiEnvelope<FormStandardRegisterResponse> | FormStandardRegisterResponse>("/documents/form-standard/register", { params });
    return unwrapEnvelope(response.data);
  }

  async createDocument(payload: { leadId: string; candidateId?: string; docType: string; status?: string; fileUrl?: string; storageBucket?: string; issueDate?: string; expiryDate?: string }) {
    const response = await this.http.post<ApiEnvelope<DocumentRecord> | DocumentRecord>("/documents", payload);
    return unwrapEnvelope(response.data);
  }

  async unlinkFormStandardDocument(leadId: string): Promise<void> {
    await this.http.delete(`/documents/form-standard/${leadId}`);
  }

  // ── Staging-first upload flow ─────────────────────────────────────────────

  async stageFormStandard(payload: {
    file: File;
    onUploadProgress?: (progress: number) => void;
  }): Promise<FormStandardStageResult> {
    const formData = new FormData();
    formData.append("file", payload.file);
    const response = await this.http.post<ApiEnvelope<FormStandardStageResult> | FormStandardStageResult>(
      "/documents/form-standard/upload-pending",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (!payload.onUploadProgress || !event.total) return;
          payload.onUploadProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        }
      }
    );
    return unwrapEnvelope(response.data);
  }

  async getPendingDownloadUrl(pendingId: string, download = false): Promise<{ url: string; filename: string } | null> {
    const qs = download ? "?download=true" : "";
    const res = await this.http.get<
      ApiEnvelope<{ url: string | null; filename?: string }> | { url: string | null; filename?: string }
    >(`/documents/form-standard/pending/${pendingId}/download-url${qs}`);
    const resolved = unwrapEnvelope(res.data);
    if (!resolved.url) return null;
    return { url: resolved.url, filename: resolved.filename ?? `pending-${pendingId}` };
  }

  async openPendingEditSession(pendingId: string): Promise<PendingEditSessionOpenResult> {
    const res = await this.http.post<ApiEnvelope<PendingEditSessionOpenResult> | PendingEditSessionOpenResult>(
      `/documents/form-standard/pending/${pendingId}/edit-session`,
    );
    return unwrapEnvelope(res.data);
  }

  async pollPendingEditSession(pendingId: string): Promise<PendingEditSessionStatus> {
    const res = await this.http.get<ApiEnvelope<PendingEditSessionStatus> | PendingEditSessionStatus>(
      `/documents/form-standard/pending/${pendingId}/edit-session/status`,
    );
    return unwrapEnvelope(res.data);
  }

  async closePendingEditSession(pendingId: string): Promise<void> {
    await this.http.delete(`/documents/form-standard/pending/${pendingId}/edit-session`);
  }

  async verifyPending(pendingId: string, leadId?: string): Promise<VerifyPendingResult> {
    const qs = leadId ? `?leadId=${encodeURIComponent(leadId)}` : "";
    const res = await this.http.post<ApiEnvelope<VerifyPendingResult> | VerifyPendingResult>(
      `/documents/form-standard/pending/${pendingId}/verify${qs}`,
    );
    return unwrapEnvelope(res.data);
  }

  async commitPendingForm(pendingId: string, payload: CommitPendingFormPayload): Promise<DocumentRecord> {
    const res = await this.http.post<ApiEnvelope<DocumentRecord> | DocumentRecord>(
      `/documents/form-standard/pending/${pendingId}/commit`,
      payload,
    );
    return unwrapEnvelope(res.data);
  }

  async cancelPending(pendingId: string): Promise<void> {
    await this.http.delete(`/documents/form-standard/pending/${pendingId}`);
  }

  async updateDocument(id: string, patch: Record<string, unknown>) {
    const response = await this.http.patch<ApiEnvelope<DocumentRecord> | DocumentRecord>(`/documents/${id}`, patch);
    return unwrapEnvelope(response.data);
  }

  async verifyDocument(id: string, body: { action: "approve" | "reject"; rejectionReason?: string }) {
    const response = await this.http.patch<ApiEnvelope<DocumentRecord> | DocumentRecord>(`/documents/${id}/verify`, body);
    return unwrapEnvelope(response.data);
  }

  /**
   * Resolve a document to a usable URL.
   *
   * For R2 documents the backend returns a short-lived presigned URL. The
   * caller opens or embeds that URL directly — the browser navigates to it
   * natively, which avoids the CORS issue that arises when axios follows a
   * cross-origin redirect to R2.
   *
   * For local-disk documents the backend returns { url: null }; in that case
   * this method falls back to fetching the file as a blob through the streaming
   * endpoint and building a local object URL.
   */
  async getDocumentUrl(id: string, download = false): Promise<{ url: string; filename: string; isObjectUrl: boolean }> {
    const qs = download ? "?download=true" : "";
    const result = await this.http.get<
      ApiEnvelope<{ url: string | null; filename?: string }> | { url: string | null; filename?: string }
    >(`/documents/${id}/download-url${qs}`);
    const resolved = unwrapEnvelope(result.data);
    if (resolved.url) {
      return { url: resolved.url, filename: resolved.filename ?? `document-${id}`, isObjectUrl: false };
    }
    // Local disk fallback — stream through backend and create an object URL
    const endpoint = download ? "download" : "file";
    const response = await this.http.get<Blob>(`/documents/${id}/${endpoint}`, { responseType: "blob" });
    const filename = parseFilenameFromContentDisposition(response.headers["content-disposition"]) ?? `document-${id}`;
    return { url: window.URL.createObjectURL(response.data), filename, isObjectUrl: true };
  }

  async getDocumentFile(id: string, mode: "file" | "download" = "file") {
    const response = await this.http.get<Blob>(`/documents/${id}/${mode}`, {
      responseType: "blob"
    });
    const filename = parseFilenameFromContentDisposition(response.headers["content-disposition"]) ?? `document-${id}`;
    return { blob: response.data, filename };
  }

  async listTrainingFinance(params: { offset: number; limit: number; leadId?: string; orderId?: string; applicationId?: string }) {
    const response = await this.http.get<ApiEnvelope<TrainingFinanceListResponse> | TrainingFinanceListResponse>("/training-finance", { params });
    return unwrapEnvelope(response.data);
  }

  async getTrainingFinance(id: string) {
    const response = await this.http.get<ApiEnvelope<TrainingFinanceRecord> | TrainingFinanceRecord>(`/training-finance/${id}`);
    return unwrapEnvelope(response.data);
  }

  async getTrainingFinanceByLead(leadId: string) {
    const response = await this.http.get<ApiEnvelope<TrainingFinanceRecord[]> | TrainingFinanceRecord[]>(`/training-finance/lead/${leadId}`);
    return unwrapEnvelope(response.data);
  }

  async createTrainingFinance(payload: { leadId: string; orderId?: string; applicationId?: string; orderType?: string; depositStatus?: string; amountPaid?: number; trainingStartDate?: string; trainingProgress?: string; visaDate?: string; departureDate?: string }) {
    const response = await this.http.post<ApiEnvelope<TrainingFinanceRecord> | TrainingFinanceRecord>("/training-finance", payload);
    return unwrapEnvelope(response.data);
  }

  async updateTrainingFinance(id: string, patch: Record<string, unknown>) {
    const response = await this.http.patch<ApiEnvelope<TrainingFinanceRecord> | TrainingFinanceRecord>(`/training-finance/${id}`, patch);
    return unwrapEnvelope(response.data);
  }

  async deleteTrainingFinance(id: string) {
    const response = await this.http.delete<ApiEnvelope<{ deleted: boolean; id: string }> | { deleted: boolean; id: string }>(`/training-finance/${id}`);
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
    const credential = await this.encryptPasswordCredential(payload.password);
    const { password: _password, ...rest } = payload;
    const response = await this.http.post<ApiEnvelope<AdminUser> | AdminUser>("/users", {
      ...rest,
      ...credential
    });
    return unwrapEnvelope(response.data);
  }

  async updateUser(id: string, payload: { username?: string; password?: string; role?: string; isActive?: boolean }) {
    const { password, ...rest } = payload;
    const body = password
      ? {
          ...rest,
          ...(await this.encryptPasswordCredential(password))
        }
      : rest;
    const response = await this.http.patch<ApiEnvelope<AdminUser> | AdminUser>(`/users/${id}`, body);
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

  // CNV integration is no longer surfaced in the UI. The methods below remain
  // so the API client surface stays stable for any future re-enablement, but
  // no admin screen consumes them today. Do not add new UI callers.
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
