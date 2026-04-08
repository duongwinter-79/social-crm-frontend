export type UserRole = "admin" | "staff";

export interface ApiEnvelope<T> {
  data: T;
  statusCode: number;
  message?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  roles: UserRole[];
}

export interface DashboardStats {
  totalLeads: number;
  totalThreads: number;
}

export interface HealthStatus {
  status: string;
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export interface Thread {
  id: string;
  lead_id: string;
  channel: string;
  status: string;
  analyzeStatus: string;
  lastMessageAt?: string | null;
  lastAiExtractedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface Lead {
  id: string;
  fullName?: string | null;
  phone?: string | null;
  source: string;
  sourceUserId?: string | null;
  region?: string | null;
  tags?: string[] | null;
  status: string;
  aiExtractedData?: Record<string, unknown> | null;
  leadScore?: number | null;
  leadClassification?: string | null;
  createdAt?: string;
  updatedAt?: string;
  threads?: Thread[];
}

export interface LeadListResponse {
  data: Lead[];
  total: number;
}

export interface LeadProfile {
  id?: string;
  lead_id: string;
  birthYear?: number | null;
  gender?: "male" | "female" | null;
  heightCm?: number | null;
  weightKg?: number | null;
  healthStatus?: string | null;
  experienceField?: string | null;
  desiredIndustry?: string | null;
  preferredRegion?: string | null;
  desiredSalary?: string | null;
}

export interface LeadTransitions {
  current: string;
  allowed: string[];
  isTerminal: boolean;
}

export interface Order {
  id: string;
  name: string;
  description?: string | null;
  region?: string | null;
  industry?: string | null;
  salaryRange?: string | null;
  salaryConfig?: { min: number; max: number; currency: string } | null;
  requirements?: string | null;
  genderRequired: string;
  ageRange?: { min: number; max: number } | null;
  experienceRequired: boolean;
}

export interface MatchingResult {
  conclusion: string;
  totalScore: number;
  breakdown: {
    foundation: number;
    experience: number;
    risk: number;
    penalties: number;
  };
  flags: string[];
  isEligible: boolean;
  requiresManagerApproval: boolean;
  rejectReason?: string;
}

export interface LeadTriageEvaluation {
  mode: "lead_triage";
  leadId: string;
  orderId: string;
  dataQuality: {
    completeness: number;
    presentSignals: string[];
    source: string;
  };
  missingRequirements: string[];
  warnings: string[];
  preliminaryFit: "promising" | "needs_review" | "insufficient_data" | "not_fit";
  suggestedAction:
    | "qualify_for_candidate_matching"
    | "request_profile_completion"
    | "request_risk_review"
    | "disqualify_or_reconfirm";
  matching: MatchingResult;
}

export interface CandidateSuggestion extends Order {
  matchScore: number;
  matching: MatchingResult;
}

export interface AiQueryResult {
  threadId: string;
  messageCount: number;
  enabled: boolean;
  prompt: string;
  result: string;
}

export interface CapabilityState {
  enabled: boolean;
  reason?: string;
}

export interface CapabilityRegistry {
  dashboard: CapabilityState;
  leads: CapabilityState;
  leadProfiles: CapabilityState;
  aiExtraction: CapabilityState;
  matching: CapabilityState;
  orders: CapabilityState;
  applications: CapabilityState;
  documents: CapabilityState;
  trainingFinance: CapabilityState;
  integrations: CapabilityState;
  candidatePortal: CapabilityState;
}
