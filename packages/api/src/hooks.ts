import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { AiSuggestion, ImportRowDedupStatus, OrderMutationPayload, PendingEditSessionStatus } from "./types";

export type BackgroundExtractionStatus = "idle" | "starting" | "running" | "completed" | "timeout" | "failed";

// ── Zalo name enrichment worker (admin) ──────────────────────────────

export function useZaloEnrichmentWorkerStatusQuery(opts: { pollWhileRunning?: boolean } = {}) {
  return useQuery({
    queryKey: ["zalo", "enrichment-worker", "status"],
    queryFn: () => apiClient.getZaloEnrichmentWorkerStatus(),
    refetchInterval: (query) => {
      if (!opts.pollWhileRunning) return false;
      const data = query.state.data as { running?: boolean } | undefined;
      return data?.running ? 2000 : false;
    }
  });
}

export function useTriggerZaloEnrichmentWorkerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.triggerZaloEnrichmentWorker(),
    onSuccess: (status) => {
      queryClient.setQueryData(["zalo", "enrichment-worker", "status"], status);
    },
    meta: { successMessage: { en: "Zalo enrichment worker triggered", vi: "Đã kích hoạt worker làm giàu tên Zalo" } }
  });
}

// ── AI extraction worker (admin) ──────────────────────────────────────

export function useAiExtractionWorkerStatusQuery(opts: { pollWhileRunning?: boolean } = {}) {
  return useQuery({
    queryKey: ["ai-extraction", "worker", "status"],
    queryFn: () => apiClient.getAiExtractionWorkerStatus(),
    refetchInterval: (query) => {
      if (!opts.pollWhileRunning) return false;
      const data = query.state.data as { running?: boolean } | undefined;
      return data?.running ? 2000 : false;
    }
  });
}

export function useTriggerAiExtractionWorkerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.triggerAiExtractionWorker(),
    onSuccess: (status) => {
      queryClient.setQueryData(["ai-extraction", "worker", "status"], status);
    },
    meta: { successMessage: { en: "AI worker triggered", vi: "Đã kích hoạt worker AI" } }
  });
}

// ── Bulk import (xlsx) ────────────────────────────────────────────────

export function useImportBatchesQuery(params: { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ["imports", "batches", params],
    queryFn: () => apiClient.listImportBatches(params)
  });
}

export function useImportBatchQuery(id: string | undefined, opts: { pollWhileActive?: boolean } = {}) {
  return useQuery({
    queryKey: ["imports", "batch", id],
    queryFn: () => apiClient.getImportBatch(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      if (!opts.pollWhileActive) return false;
      const data = query.state.data as
        | { status?: string; aiPending?: number }
        | undefined;
      // Keep polling while:
      //   1. The apply phase is running (`status === "applying"`), OR
      //   2. The apply phase finished but the AI worker is still chewing
      //      through imported free text (`aiPending > 0`).
      if (data?.status === "applying") return 2000;
      if ((data?.aiPending ?? 0) > 0) return 5000;
      return false;
    }
  });
}

export function useImportBatchRowsQuery(
  id: string | undefined,
  params: { limit?: number; offset?: number; dedupStatus?: ImportRowDedupStatus } = {}
) {
  return useQuery({
    queryKey: ["imports", "batch", id, "rows", params],
    queryFn: () => apiClient.listImportBatchRows(id as string, params),
    enabled: Boolean(id)
  });
}

export function usePreviewLeadsImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => apiClient.previewLeadsImport(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imports", "batches"] });
    },
    meta: { successMessage: { en: "Preview ready", vi: "Xem trước sẵn sàng" } }
  });
}

export function useApplyImportBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.applyImportBatch(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["imports", "batches"] });
      queryClient.invalidateQueries({ queryKey: ["imports", "batch", id] });
    },
    meta: { successMessage: { en: "Import started", vi: "Đã bắt đầu nhập dữ liệu" } }
  });
}

// Notes extraction — operator-triggered preview + apply gate.
export function useImportNotesSuggestionsQuery(
  id: string | undefined,
  opts: { pollWhileEmpty?: boolean } = {}
) {
  return useQuery({
    queryKey: ["imports", "batch", id, "notes-suggestions"],
    queryFn: () => apiClient.listImportNotesSuggestions(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      if (!opts.pollWhileEmpty) return false;
      const data = query.state.data as unknown[] | undefined;
      // The extract endpoint is async — poll until suggestions actually
      // appear, then stop. Caller flips `pollWhileEmpty` true on click.
      return data && data.length > 0 ? false : 2000;
    }
  });
}

export function useTriggerImportNotesExtractionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.triggerImportNotesExtraction(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["imports", "batch", id, "notes-suggestions"] });
    },
    meta: { successMessage: { en: "Notes extraction started", vi: "Đã bắt đầu trích xuất ghi chú" } }
  });
}

export function useApplyImportNotesSuggestionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: string;
      selections: Array<{ leadId: string; fieldNames: string[] }>;
    }) => apiClient.applyImportNotesSuggestions(args.id, args.selections),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["imports", "batch", args.id, "notes-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    meta: { successMessage: { en: "Suggestions applied", vi: "Đã áp dụng gợi ý AI" } }
  });
}

export function useCancelImportBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.cancelImportBatch(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["imports", "batches"] });
      queryClient.invalidateQueries({ queryKey: ["imports", "batch", id] });
    },
    meta: { successMessage: { en: "Import cancelled", vi: "Đã huỷ nhập dữ liệu" } }
  });
}

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiClient.getDashboardStats()
  });
}

export function useHealthQuery() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 30000
  });
}

export function useLeadsQuery(params: {
  offset: number;
  limit: number;
  source?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ["leads", params],
    queryFn: () => apiClient.listLeads(params),
    refetchInterval: 60000
  });
}

export function useLeadDetailQuery(id?: string) {
  return useQuery({
    queryKey: ["lead", id],
    queryFn: () => apiClient.getLead(id as string),
    enabled: Boolean(id)
  });
}

export function useLeadTransitionsQuery(id?: string) {
  return useQuery({
    queryKey: ["lead", id, "transitions"],
    queryFn: () => apiClient.getLeadTransitions(id as string),
    enabled: Boolean(id)
  });
}

export function useLeadQualificationQuery(leadId?: string) {
  return useQuery({
    queryKey: ["lead", leadId, "qualification"],
    queryFn: () => apiClient.getLeadQualification(leadId as string),
    enabled: Boolean(leadId)
  });
}

export function useLeadAiSuggestionsQuery(leadId?: string) {
  return useQuery({
    queryKey: ["lead", leadId, "ai-suggestions"],
    queryFn: () => apiClient.getLeadAiSuggestions(leadId as string),
    enabled: Boolean(leadId)
  });
}

/**
 * Lead-stage order suggestions — top-N orders ranked by the triage engine.
 * Available immediately at screening stage; does not require a candidate.
 */
export function useLeadOrderSuggestionsQuery(leadId?: string, limit = 5) {
  return useQuery({
    queryKey: ["lead", leadId, "order-suggestions", limit],
    queryFn: () => apiClient.suggestOrdersForLead(leadId as string, { limit }),
    enabled: Boolean(leadId)
  });
}

export function useThreadsQuery(params: { offset: number; limit: number; channel?: string; leadId?: string; analyzeStatus?: string; search?: string }) {
  return useQuery({
    queryKey: ["threads", params],
    queryFn: () => apiClient.listThreads(params),
    refetchInterval: 60000
  });
}

export function useLeadThreadsQuery(leadId?: string, params: { offset: number; limit: number; channel?: string; analyzeStatus?: string; search?: string } = { offset: 0, limit: 20 }) {
  return useQuery({
    queryKey: ["threads", "lead", leadId, params],
    queryFn: () => apiClient.listLeadThreads(leadId as string, params),
    enabled: Boolean(leadId)
  });
}

export function useThreadDetailQuery(id?: string) {
  return useQuery({
    queryKey: ["threads", id],
    queryFn: () => apiClient.getThread(id as string),
    enabled: Boolean(id)
  });
}

export function useThreadMessagesQuery(threadId?: string, params: { offset: number; limit: number; direction?: string; type?: string } = { offset: 0, limit: 50 }) {
  return useQuery({
    queryKey: ["threads", threadId, "messages", params],
    queryFn: () => apiClient.listThreadMessages(threadId as string, params),
    enabled: Boolean(threadId)
  });
}

export function useOrdersQuery() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => apiClient.listOrders()
  });
}

export function useOrderDetailQuery(id?: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => apiClient.getOrder(id as string),
    enabled: Boolean(id)
  });
}

export function useApplicationsQuery(
  params: { offset: number; limit: number; leadId?: string; candidateId?: string; orderId?: string; status?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["applications", params],
    queryFn: () => apiClient.listApplications(params),
    enabled: options?.enabled ?? true,
  });
}

export function useApplicationDetailQuery(id?: string) {
  return useQuery({
    queryKey: ["application", id],
    queryFn: () => apiClient.getApplication(id as string),
    enabled: Boolean(id)
  });
}

export function useCandidateByLeadQuery(leadId?: string) {
  return useQuery({
    queryKey: ["candidate", "by-lead", leadId],
    queryFn: () => apiClient.getCandidateByLead(leadId as string),
    enabled: Boolean(leadId)
  });
}

export function useCandidatesQuery(params: { offset: number; limit: number; leadId?: string; lifecycleStatus?: string; search?: string }) {
  return useQuery({
    queryKey: ["candidates", params],
    queryFn: () => apiClient.listCandidates(params)
  });
}

export function useDocumentsQuery(params: { offset: number; limit: number; leadId?: string; candidateId?: string; docType?: string; status?: string }) {
  return useQuery({
    queryKey: ["documents", params],
    queryFn: () => apiClient.listDocuments(params)
  });
}

export function useLeadDocumentChecklistQuery(leadId?: string) {
  return useQuery({
    queryKey: ["documents", "lead-checklist", leadId],
    queryFn: () => apiClient.getLeadDocumentChecklist(leadId as string),
    enabled: Boolean(leadId)
  });
}

export function useCandidateDocumentChecklistQuery(candidateId?: string) {
  return useQuery({
    queryKey: ["documents", "candidate-checklist", candidateId],
    queryFn: () => apiClient.getCandidateDocumentChecklist(candidateId as string),
    enabled: Boolean(candidateId)
  });
}

export function useFormStandardRegisterQuery(
  params: { offset: number; limit: number; status?: string; search?: string; leadId?: string } | undefined,
  options?: { enabled?: boolean },
) {
  const safeParams = params ?? { offset: 0, limit: 25 };
  return useQuery({
    queryKey: ["documents", "form-standard-register", safeParams],
    queryFn: () => apiClient.getFormStandardRegister(safeParams),
    enabled: options?.enabled ?? true,
  });
}

export function useTrainingFinanceQuery(params: { offset: number; limit: number; leadId?: string; orderId?: string; applicationId?: string }) {
  return useQuery({
    queryKey: ["training-finance", params],
    queryFn: () => apiClient.listTrainingFinance(params)
  });
}

export function useTrainingFinanceByLeadQuery(leadId?: string) {
  return useQuery({
    queryKey: ["training-finance", "lead", leadId],
    queryFn: () => apiClient.getTrainingFinanceByLead(leadId as string),
    enabled: Boolean(leadId)
  });
}

export function usePipelineQuery(params: { offset: number; limit: number; stage?: string; search?: string }) {
  return useQuery({
    queryKey: ["pipeline", params],
    queryFn: () => apiClient.getPipeline(params)
  });
}

export function useUsersQuery(params: { offset: number; limit: number; search?: string; role?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => apiClient.listUsers(params)
  });
}

export function useUserDetailQuery(id?: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => apiClient.getUser(id as string),
    enabled: Boolean(id)
  });
}

export function useAdminSystemStatusQuery() {
  return useQuery({
    queryKey: ["admin", "system-status"],
    queryFn: () => apiClient.getAdminSystemStatus()
  });
}

export function useAdminAuditLogsQuery(params: { limit: number; action?: string; targetType?: string }) {
  return useQuery({
    queryKey: ["admin", "audit-logs", params],
    queryFn: () => apiClient.listAdminAuditLogs(params)
  });
}

export function useAdminSessionsQuery(params: { limit: number; includeRevoked?: boolean }) {
  return useQuery({
    queryKey: ["admin", "sessions", params],
    queryFn: () => apiClient.listAdminSessions(params)
  });
}

export function useSuggestedOrdersQuery(candidateId?: string) {
  return useQuery({
    queryKey: ["matching", "suggest", candidateId],
    queryFn: () => apiClient.suggestOrders(candidateId as string),
    enabled: Boolean(candidateId)
  });
}

export function useUpdateLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => apiClient.updateLead(id, patch),
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.setQueryData(["lead", lead.id], lead);
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id, "transitions"] });
    },
    meta: { successMessage: { en: "Lead updated", vi: "Đã cập nhật ứng viên" } }
  });
}

export function useRestoreLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.restoreLead(id),
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.setQueryData(["lead", lead.id], lead);
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id, "transitions"] });
    },
    meta: { successMessage: { en: "Lead restored", vi: "Đã khôi phục ứng viên" } }
  });
}

export function useUpdateLeadQualificationMutation(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) => apiClient.updateLeadQualification(leadId, patch),
    onSuccess: (lead) => {
      queryClient.setQueryData(["lead", lead.id], lead);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", leadId, "qualification"] });
      queryClient.invalidateQueries({ queryKey: ["lead", leadId, "ai-suggestions"] });
    },
    meta: { successMessage: { en: "Qualification saved", vi: "Đã lưu thông tin đánh giá" } }
  });
}

export function useAiQueryMutation() {
  return useMutation({
    mutationFn: ({ threadId, prompt }: { threadId: string; prompt: string }) => apiClient.queryThread(threadId, prompt)
  });
}

export function useProcessThreadExtractionMutation() {
  const queryClient = useQueryClient();
  const pollRef = useRef<number | null>(null);
  const [backgroundStatus, setBackgroundStatus] = useState<BackgroundExtractionStatus>("idle");

  const clearPoll = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const mutation = useMutation({
    mutationFn: (args: {
      leadId: string;
      threadId: string;
      maxBatches?: number;
      scanMode?: "new_only" | "include_scanned";
    }) => apiClient.processThreadExtraction(args),
    onMutate: () => {
      clearPoll();
      setBackgroundStatus("starting");
    },
    onSuccess: (_data, vars) => {
      const suggestionsKey = ["lead", vars.leadId, "ai-suggestions"];
      const leadKey = ["lead", vars.leadId];
      const startCount =
        queryClient.getQueryData<AiSuggestion[]>(suggestionsKey)?.length ?? 0;
      const startLead = queryClient.getQueryData<any>(leadKey);
      const startThread = startLead?.threads?.find?.((thread: any) => thread.id === vars.threadId);
      const startLastAiExtractedAt = startThread?.lastAiExtractedAt ?? null;

      let elapsed = 0;
      const intervalMs = 3000;
      const timeoutMs = 60000;
      setBackgroundStatus("running");

      pollRef.current = window.setInterval(async () => {
        elapsed += intervalMs;

        try {
          const [suggestions, lead] = await Promise.all([
            apiClient.getLeadAiSuggestions(vars.leadId),
            apiClient.getLead(vars.leadId)
          ]);

          queryClient.setQueryData(suggestionsKey, suggestions);
          queryClient.setQueryData(leadKey, lead);

          const nextThread = lead.threads?.find((thread) => thread.id === vars.threadId);
          const nextCount = suggestions.length;
          const nextLastAiExtractedAt = nextThread?.lastAiExtractedAt ?? null;
          const analyzeStatus = nextThread?.analyzeStatus ?? null;
          const finished =
            nextCount !== startCount ||
            (nextLastAiExtractedAt && nextLastAiExtractedAt !== startLastAiExtractedAt) ||
            (analyzeStatus && analyzeStatus !== "analyzing");

          if (finished || elapsed >= timeoutMs) {
            clearPoll();
            setBackgroundStatus(finished ? "completed" : "timeout");
            queryClient.invalidateQueries({ queryKey: ["lead", vars.leadId, "qualification"] });
            queryClient.invalidateQueries({ queryKey: ["lead", vars.leadId, "transitions"] });
            queryClient.invalidateQueries({ queryKey: ["lead", vars.leadId, "order-suggestions"] });
            queryClient.invalidateQueries({ queryKey: ["thread", vars.threadId, "messages"] });
            queryClient.invalidateQueries({ queryKey: ["leads"] });
          }
        } catch {
          if (elapsed >= timeoutMs) {
            clearPoll();
            setBackgroundStatus("failed");
          }
        }
      }, intervalMs);
    },
    onError: () => {
      clearPoll();
      setBackgroundStatus("failed");
    },
    meta: { successMessage: { en: "AI extraction started", vi: "Đã bắt đầu trích xuất AI" } }
  });

  return {
    ...mutation,
    backgroundStatus,
    resetBackgroundStatus: () => {
      clearPoll();
      setBackgroundStatus("idle");
    }
  };
}

export function useMatchingEvaluationMutation() {
  return useMutation({
    mutationFn: ({ leadId, orderId }: { leadId: string; orderId: string }) => apiClient.evaluateLeadTriage(leadId, orderId)
  });
}

export function useCandidateMatchingEvaluationMutation() {
  return useMutation({
    mutationFn: ({ candidateId, orderId }: { candidateId: string; orderId: string }) => apiClient.evaluateCandidateMatch(candidateId, orderId)
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OrderMutationPayload & { name: string }) => apiClient.createOrder(payload),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.setQueryData(["order", order.id], order);
    },
    meta: { successMessage: { en: "Order created", vi: "Đã tạo đơn hàng" } }
  });
}

export function useUpdateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: OrderMutationPayload }) => apiClient.updateOrder(id, patch),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.setQueryData(["order", order.id], order);
    },
    meta: { successMessage: { en: "Order updated", vi: "Đã cập nhật đơn hàng" } }
  });
}

export function useUpdateApplicationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => apiClient.updateApplication(id, patch),
    onSuccess: (application) => {
      queryClient.setQueryData(["application", application.id], application);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    meta: { successMessage: { en: "Application updated", vi: "Đã cập nhật hồ sơ ứng tuyển" } }
  });
}

export function useDeleteApplicationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteApplication(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["training-finance"] });
    },
    meta: { successMessage: { en: "Application deleted", vi: "Đã xoá hồ sơ ứng tuyển" } }
  });
}

export function useCreateApplicationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { candidateId: string; orderId: string; status?: string; interviewDate?: string; interviewResult?: string; rejectReason?: string }) =>
      apiClient.createApplication(payload),
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.setQueryData(["application", application.id], application);
    },
    meta: { successMessage: { en: "Application created", vi: "Đã tạo hồ sơ ứng tuyển" } }
  });
}

export function useCreateDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { leadId: string; candidateId?: string; docType: string; status?: string; fileUrl?: string; storageBucket?: string; issueDate?: string; expiryDate?: string }) =>
      apiClient.createDocument(payload),
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (document.lead_id) {
        queryClient.invalidateQueries({ queryKey: ["documents", "lead-checklist", document.lead_id] });
      }
      if (document.candidate_id) {
        queryClient.invalidateQueries({ queryKey: ["documents", "candidate-checklist", document.candidate_id] });
      }
    },
    meta: { successMessage: { en: "Document added", vi: "Đã thêm giấy tờ" } }
  });
}

export function useLeadsSearchQuery(search: string) {
  return useQuery({
    queryKey: ["leads", "search", search],
    queryFn: () => apiClient.listLeads({ offset: 0, limit: 40, search: search || undefined }),
    enabled: search.length >= 1,
    staleTime: 10_000,
  });
}

// ── Staging-first upload flow ─────────────────────────────────────────────

export function useStageFormStandardMutation() {
  return useMutation({
    mutationFn: (payload: { file: File; onUploadProgress?: (progress: number) => void }) =>
      apiClient.stageFormStandard(payload),
  });
}

export function useOpenPendingEditSessionMutation() {
  return useMutation({
    mutationFn: (pendingId: string) => apiClient.openPendingEditSession(pendingId),
  });
}

export function useClosePendingEditSessionMutation() {
  return useMutation({
    mutationFn: (pendingId: string) => apiClient.closePendingEditSession(pendingId),
  });
}

export function usePendingEditSessionStatusQuery(pendingId: string | null, opts: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: ["documents", "pending", pendingId, "edit-session-status"],
    queryFn: () => apiClient.pollPendingEditSession(pendingId as string),
    enabled: Boolean(pendingId) && Boolean(opts.poll),
    refetchInterval: (query) => {
      if (!opts.poll) return false;
      const data = query.state.data as PendingEditSessionStatus | undefined;
      return data?.status === "active" ? 5000 : false;
    },
  });
}

export function useVerifyPendingMutation() {
  return useMutation({
    mutationFn: ({ pendingId, leadId }: { pendingId: string; leadId?: string }) =>
      apiClient.verifyPending(pendingId, leadId),
  });
}

export function useCommitPendingFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pendingId, payload }: {
      pendingId: string;
      payload: Parameters<typeof apiClient.commitPendingForm>[1];
    }) => apiClient.commitPendingForm(pendingId, payload),
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (document.lead_id) {
        queryClient.invalidateQueries({ queryKey: ["documents", "lead-checklist", document.lead_id] });
        queryClient.invalidateQueries({ queryKey: ["lead", document.lead_id, "transitions"] });
      }
      queryClient.invalidateQueries({ queryKey: ["documents", "form-standard-register"] });
    },
    meta: { successMessage: { en: "Form verified and linked", vi: "Đã xác nhận và gắn hồ sơ" } }
  });
}

export function useCancelPendingMutation() {
  return useMutation({
    mutationFn: (pendingId: string) => apiClient.cancelPending(pendingId),
  });
}

export function useCreateLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof apiClient.createLead>[0]) =>
      apiClient.createLead(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    meta: { successMessage: { en: "Lead created", vi: "Đã tạo ứng viên" } }
  });
}

export function useUnlinkFormStandardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => apiClient.unlinkFormStandardDocument(leadId),
    onSuccess: (_void, leadId) => {
      queryClient.invalidateQueries({ queryKey: ["documents", "form-standard-register"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documents", "lead-checklist", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead", leadId, "transitions"] });
    },
    meta: { successMessage: { en: "Document unlinked", vi: "Hồ sơ đã được huỷ liên kết" } }
  });
}

export function useUpdateDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => apiClient.updateDocument(id, patch),
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (document.lead_id) {
        queryClient.invalidateQueries({ queryKey: ["documents", "lead-checklist", document.lead_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["documents", "form-standard-register"] });
      if (document.candidate_id) {
        queryClient.invalidateQueries({ queryKey: ["documents", "candidate-checklist", document.candidate_id] });
      }
    },
    meta: { successMessage: { en: "Document updated", vi: "Đã cập nhật giấy tờ" } }
  });
}

export function useVerifyDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, rejectionReason }: { id: string; action: "approve" | "reject"; rejectionReason?: string }) =>
      apiClient.verifyDocument(id, { action, rejectionReason }),
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (document.lead_id) {
        queryClient.invalidateQueries({ queryKey: ["documents", "lead-checklist", document.lead_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["documents", "form-standard-register"] });
      if (document.candidate_id) {
        queryClient.invalidateQueries({ queryKey: ["documents", "candidate-checklist", document.candidate_id] });
      }
    },
    meta: { successMessage: { en: "Document verified", vi: "Đã xác minh giấy tờ" } }
  });
}

export function useCreateTrainingFinanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { leadId: string; orderId?: string; applicationId?: string; orderType?: string; depositStatus?: string; amountPaid?: number; trainingStartDate?: string; trainingProgress?: string; visaDate?: string; departureDate?: string }) =>
      apiClient.createTrainingFinance(payload),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["training-finance"] });
      queryClient.invalidateQueries({ queryKey: ["training-finance", "lead", record.lead_id] });
    },
    meta: { successMessage: { en: "Training/finance record created", vi: "Đã tạo hồ sơ đào tạo/tài chính" } }
  });
}

export function useUpdateTrainingFinanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => apiClient.updateTrainingFinance(id, patch),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["training-finance"] });
      queryClient.invalidateQueries({ queryKey: ["training-finance", "lead", record.lead_id] });
    },
    meta: { successMessage: { en: "Training/finance record updated", vi: "Đã cập nhật hồ sơ đào tạo/tài chính" } }
  });
}

export function useDeleteTrainingFinanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteTrainingFinance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-finance"] });
      queryClient.invalidateQueries({ queryKey: ["lead"] });
    },
    meta: { successMessage: { en: "Training/finance record deleted", vi: "Đã xoá hồ sơ đào tạo/tài chính" } }
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { username: string; password: string; role?: string; isActive?: boolean }) => apiClient.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    meta: { successMessage: { en: "User created", vi: "Đã tạo người dùng" } }
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { username?: string; password?: string; role?: string; isActive?: boolean } }) =>
      apiClient.updateUser(id, patch),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.setQueryData(["users", user.id], user);
    },
    meta: { successMessage: { en: "User updated", vi: "Đã cập nhật người dùng" } }
  });
}

export function useRevokeAdminSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.revokeAdminSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "system-status"] });
    },
    meta: { successMessage: { en: "Session revoked", vi: "Đã thu hồi phiên đăng nhập" } }
  });
}

// CNV integration is no longer surfaced in the UI. The hooks below remain so
// the API client surface stays stable for any future re-enablement, but no
// admin screen consumes them today. Do not add new UI callers.
export function useCnvInfoQuery(enabled = true) {
  return useQuery({
    queryKey: ["cnv", "info"],
    queryFn: () => apiClient.getCnvInfo(),
    enabled
  });
}

export function useCnvConnectionStatusQuery() {
  return useQuery({
    queryKey: ["cnv", "connection-status"],
    queryFn: () => apiClient.getCnvConnectionStatus()
  });
}

export function useCnvCustomersQuery(
  params: { limit?: number; offset?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ["cnv", "customers", params],
    queryFn: () => apiClient.listCnvCustomers(params),
    enabled
  });
}

export function useCnvProductsQuery(
  params: { limit?: number; offset?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ["cnv", "products", params],
    queryFn: () => apiClient.listCnvProducts(params),
    enabled
  });
}

export function useCnvOrdersQuery(
  params: { limit?: number; offset?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ["cnv", "orders", params],
    queryFn: () => apiClient.listCnvOrders(params),
    enabled
  });
}

export function useCnvCustomCollectionsQuery(
  params: { limit?: number; offset?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ["cnv", "custom-collections", params],
    queryFn: () => apiClient.listCnvCustomCollections(params),
    enabled
  });
}

export function useCnvSmartCollectionsQuery(
  params: { limit?: number; offset?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ["cnv", "smart-collections", params],
    queryFn: () => apiClient.listCnvSmartCollections(params),
    enabled
  });
}

export function useCnvActionMutations() {
  const queryClient = useQueryClient();
  return {
    connectLink: useMutation({
      mutationFn: () => apiClient.getCnvConnectLink()
    }),
    testToken: useMutation({
      mutationFn: () => apiClient.testCnvToken()
    }),
    register: useMutation({
      mutationFn: () => apiClient.registerCnvWebhook(),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["cnv", "info"] });
        queryClient.invalidateQueries({ queryKey: ["cnv", "connection-status"] });
      }
    }),
    remove: useMutation({
      mutationFn: () => apiClient.removeCnvWebhook(),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cnv", "info"] })
    }),
    disconnect: useMutation({
      mutationFn: () => apiClient.disconnectCnv(),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["cnv", "info"] });
        queryClient.invalidateQueries({ queryKey: ["cnv", "connection-status"] });
      }
    })
  };
}
