import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { AiSuggestion, OrderMutationPayload } from "./types";

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

export function useLeadsQuery(params: { offset: number; limit: number; source?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["leads", params],
    queryFn: () => apiClient.listLeads(params)
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

export function useLeadProfileQuery(leadId?: string) {
  return useQuery({
    queryKey: ["lead", leadId, "profile"],
    queryFn: () => apiClient.getLeadProfile(leadId as string),
    enabled: Boolean(leadId)
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
    queryFn: () => apiClient.listThreads(params)
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

export function useApplicationsQuery(params: { offset: number; limit: number; leadId?: string; candidateId?: string; orderId?: string; status?: string }) {
  return useQuery({
    queryKey: ["applications", params],
    queryFn: () => apiClient.listApplications(params)
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

export function useTrainingFinanceQuery(params: { offset: number; limit: number; leadId?: string; orderId?: string }) {
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
    meta: { successMessage: "Lead updated" }
  });
}

export function useUpsertLeadProfileMutation(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) => apiClient.upsertLeadProfile(leadId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId, "profile"] });
    },
    meta: { successMessage: "Profile saved" }
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
    meta: { successMessage: "Qualification saved" }
  });
}

export function useAiQueryMutation() {
  return useMutation({
    mutationFn: ({ threadId, prompt }: { threadId: string; prompt: string }) => apiClient.queryThread(threadId, prompt)
  });
}

export function useProcessThreadExtractionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { leadId: string; threadId: string; maxBatches?: number }) =>
      apiClient.processThreadExtraction(args),
    onSuccess: (_data, vars) => {
      const suggestionsKey = ["lead", vars.leadId, "ai-suggestions"];
      const startCount =
        queryClient.getQueryData<AiSuggestion[]>(suggestionsKey)?.length ?? 0;

      let elapsed = 0;
      const intervalMs = 3000;
      const timeoutMs = 60000;

      const poll = window.setInterval(async () => {
        elapsed += intervalMs;
        await queryClient.invalidateQueries({ queryKey: suggestionsKey });

        const nextCount =
          queryClient.getQueryData<AiSuggestion[]>(suggestionsKey)?.length ?? 0;

        if (nextCount !== startCount || elapsed >= timeoutMs) {
          window.clearInterval(poll);
          queryClient.invalidateQueries({ queryKey: ["lead", vars.leadId] });
          queryClient.invalidateQueries({ queryKey: ["lead", vars.leadId, "qualification"] });
          queryClient.invalidateQueries({ queryKey: ["lead", vars.leadId, "profile"] });
          queryClient.invalidateQueries({ queryKey: ["lead", vars.leadId, "transitions"] });
          queryClient.invalidateQueries({ queryKey: ["lead", vars.leadId, "order-suggestions"] });
          queryClient.invalidateQueries({ queryKey: ["thread", vars.threadId, "messages"] });
          queryClient.invalidateQueries({ queryKey: ["leads"] });
        }
      }, intervalMs);
    },
    meta: { successMessage: "AI extraction started" }
  });
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
    meta: { successMessage: "Order created" }
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
    meta: { successMessage: "Order updated" }
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
    meta: { successMessage: "Application updated" }
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
    meta: { successMessage: "Application created" }
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
    meta: { successMessage: "Document added" }
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
      if (document.candidate_id) {
        queryClient.invalidateQueries({ queryKey: ["documents", "candidate-checklist", document.candidate_id] });
      }
    },
    meta: { successMessage: "Document updated" }
  });
}

export function useCreateTrainingFinanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { leadId: string; orderId?: string; orderType?: string; depositStatus?: string; amountPaid?: number; trainingStartDate?: string; trainingProgress?: string; visaDate?: string; departureDate?: string }) =>
      apiClient.createTrainingFinance(payload),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["training-finance"] });
      queryClient.invalidateQueries({ queryKey: ["training-finance", "lead", record.lead_id] });
    },
    meta: { successMessage: "Training/finance record created" }
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
    meta: { successMessage: "Training/finance record updated" }
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { username: string; password: string; role?: string; isActive?: boolean }) => apiClient.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    meta: { successMessage: "User created" }
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
    meta: { successMessage: "User updated" }
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
    meta: { successMessage: "Session revoked" }
  });
}

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
