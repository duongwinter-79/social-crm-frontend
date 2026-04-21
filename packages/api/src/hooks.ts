import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

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

export function useOrdersQuery() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => apiClient.listOrders()
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

export function useSuggestedOrdersQuery(leadId?: string) {
  return useQuery({
    queryKey: ["matching", "suggest", leadId],
    queryFn: () => apiClient.suggestOrders(leadId as string),
    enabled: Boolean(leadId)
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
    }
  });
}

export function useUpsertLeadProfileMutation(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) => apiClient.upsertLeadProfile(leadId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId, "profile"] });
    }
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
    }
  });
}

export function useAiQueryMutation() {
  return useMutation({
    mutationFn: ({ threadId, prompt }: { threadId: string; prompt: string }) => apiClient.queryThread(threadId, prompt)
  });
}

export function useMatchingEvaluationMutation() {
  return useMutation({
    mutationFn: ({ leadId, orderId }: { leadId: string; orderId: string }) => apiClient.evaluateLeadTriage(leadId, orderId)
  });
}

export function useUpdateApplicationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => apiClient.updateApplication(id, patch),
    onSuccess: (application) => {
      queryClient.setQueryData(["application", application.id], application);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    }
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
    }
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
    }
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
    }
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
    }
  });
}

export function useUpdateTrainingFinanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => apiClient.updateTrainingFinance(id, patch),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["training-finance"] });
      queryClient.invalidateQueries({ queryKey: ["training-finance", "lead", record.lead_id] });
    }
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { username: string; password: string; role?: string; isActive?: boolean }) => apiClient.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
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
    }
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
    }
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

export function useCnvCustomersQuery(enabled = true) {
  return useQuery({
    queryKey: ["cnv", "customers"],
    queryFn: () => apiClient.listCnvCustomers(),
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
