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

export interface AdminUser {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
}

export interface AdminUserListResponse {
  data: AdminUser[];
  total: number;
}

export interface AdminAuditLog {
  id: string;
  actorUserId: string;
  actorUsername: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
}

export interface AdminAuditLogListResponse {
  data: AdminAuditLog[];
  total: number;
}

export interface AdminSessionRecord {
  id: string;
  sessionId: string;
  userId: string;
  username?: string | null;
  userRole?: string | null;
  isActiveUser?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  revokedAt?: string | null;
  lastUsedAt?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface AdminSessionListResponse {
  data: AdminSessionRecord[];
  total: number;
}

export interface AdminSystemStatus {
  backend: {
    generatedAt: string;
    nodeEnv: string;
    port: number;
  };
  auth: {
    totalUsers: number;
    activeUsers: number;
    activeSessions: number;
  };
  integrations: {
    zaloEnabled: boolean;
    cnvEnabled: boolean;
  };
  cnv: {
    ssoBaseUrl?: string;
    apiBaseUrl: string;
    webhookUrlConfigured: boolean;
    verifyTokenConfigured: boolean;
    clientIdConfigured: boolean;
    redirectUriConfigured?: boolean;
    scope?: string;
    tokenGrantType?: string;
    accountIdSuffix?: string | null;
  };
}

export interface CnvConnectionStatus {
  connected: boolean;
  accountId?: string | null;
  accountIdSuffix?: string | null;
  redirectUriConfigured: boolean;
  ssoBaseUrl: string;
  apiBaseUrl: string;
  scope: string;
  tokenGrantType: string;
  connection?: {
    connectedAt?: string;
    expiresAt?: string | null;
    lastVerifiedAt?: string | null;
    verifiedUserId?: string | null;
    verifiedUsername?: string | null;
    connectedByUserId?: string;
    connectedByUsername?: string;
  } | null;
}

export interface CnvCustomer {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  avatar?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  points?: number;
  exp_points?: number;
  total_spending?: number;
  total_points?: number;
  addresses?: unknown[];
  [key: string]: unknown;
}

export interface CnvCustomersResponse {
  success: boolean;
  result: {
    customers?: CnvCustomer[];
    [key: string]: unknown;
  };
}

export interface CnvResourceListResponse {
  success: boolean;
  result: Record<string, unknown>;
}

export interface DashboardStats {
  totalLeads: number;
  totalThreads: number;
  totalCandidates?: number;
  totalApplications?: number;
  totalDocuments?: number;
  leadsByStatus?: Record<string, number>;
  applicationsByStatus?: Record<string, number>;
  documentsByStatus?: Record<string, number>;
  workflowSummary?: Record<string, number>;
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
  verifiedProfileData?: Record<string, unknown> | null;
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

export interface LeadQualificationSnapshot {
  leadId: string;
  intakeData: Record<string, unknown>;
  verifiedData: Record<string, unknown>;
  mergedData: Record<string, unknown>;
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
  heightMin?: number | null;
  acceptsReturnees?: boolean | null;
  experienceRequired: boolean;
}

export interface OrderMutationPayload {
  name?: string;
  description?: string | null;
  region?: string | null;
  industry?: string | null;
  salaryRange?: string | null;
  salaryConfig?: { min: number; max: number; currency: string } | null;
  requirements?: string | null;
  genderRequired?: "male" | "female" | "both";
  ageRange?: { min: number; max: number } | null;
  heightMin?: number | null;
  acceptsReturnees?: boolean | null;
  experienceRequired?: boolean;
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

export interface CandidateRef {
  id: string;
  code?: string | null;
  lifecycleStatus?: string | null;
  lead_id?: string;
  lead?: Lead;
  profile?: Record<string, unknown> | null;
}

export interface ApplicationRecord {
  id: string;
  lead_id: string;
  order_id: string;
  candidate_id?: string | null;
  status: string;
  interviewDate?: string | null;
  interviewResult?: string | null;
  rejectReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lead?: Lead;
  order?: Order;
  candidate?: CandidateRef | null;
}

export interface ApplicationListResponse {
  data: ApplicationRecord[];
  total: number;
}

export interface CandidateListResponse {
  data: CandidateRef[];
  total: number;
}

export interface DocumentRecord {
  id: string;
  lead_id: string;
  candidate_id?: string | null;
  docType: string;
  status: string;
  fileUrl?: string | null;
  storageBucket?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  candidate?: CandidateRef | null;
}

export interface DocumentListResponse {
  data: DocumentRecord[];
  total: number;
}

export interface DocumentChecklistSummary {
  requiredDocTypes: string[];
  presentDocTypes: string[];
  missingDocTypes: string[];
  verifiedDocTypes: string[];
  rejectedDocTypes: string[];
  expiredDocTypes: string[];
  isComplete: boolean;
  items: Array<{
    docType: string;
    required: boolean;
    status: string;
    present: boolean;
    isExpired: boolean;
  }>;
  leadId?: string;
  candidateId?: string;
}

export interface TrainingFinanceRecord {
  id: string;
  lead_id: string;
  order_id?: string | null;
  orderType?: string | null;
  depositStatus?: string | null;
  amountPaid?: number | null;
  trainingStartDate?: string | null;
  trainingProgress?: string | null;
  visaDate?: string | null;
  departureDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lead?: Lead;
  order?: Order | null;
}

export interface TrainingFinanceListResponse {
  data: TrainingFinanceRecord[];
  total: number;
}

export interface PipelineRow {
  leadId: string;
  leadName?: string | null;
  phone?: string | null;
  source: string;
  currentStage: string;
  candidateId?: string | null;
  candidateCode?: string | null;
  applicationStatus?: string | null;
  applicationOrderName?: string | null;
  documents: {
    missingRequired: string[];
    expired: string[];
    total: number;
  };
  trainingFinance?: {
    depositStatus?: string | null;
    amountPaid?: number | null;
    trainingProgress?: string | null;
    visaDate?: string | null;
    departureDate?: string | null;
  } | null;
  blockers: string[];
  nextAction: string;
  updatedAt?: string;
}

export interface PipelineResponse {
  data: PipelineRow[];
  total: number;
  groups: Record<string, number>;
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
