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

export function useOrdersQuery() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => apiClient.listOrders()
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

export function useAiQueryMutation() {
  return useMutation({
    mutationFn: ({ threadId, prompt }: { threadId: string; prompt: string }) => apiClient.queryThread(threadId, prompt)
  });
}

export function useMatchingEvaluationMutation() {
  return useMutation({
    mutationFn: ({ leadId, orderId }: { leadId: string; orderId: string }) => apiClient.evaluateMatching(leadId, orderId)
  });
}

export function useCnvInfoQuery() {
  return useQuery({
    queryKey: ["cnv", "info"],
    queryFn: () => apiClient.getCnvInfo()
  });
}

export function useCnvActionMutations() {
  const queryClient = useQueryClient();
  return {
    testToken: useMutation({
      mutationFn: () => apiClient.testCnvToken()
    }),
    register: useMutation({
      mutationFn: () => apiClient.registerCnvWebhook(),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cnv", "info"] })
    }),
    remove: useMutation({
      mutationFn: () => apiClient.removeCnvWebhook(),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cnv", "info"] })
    })
  };
}
