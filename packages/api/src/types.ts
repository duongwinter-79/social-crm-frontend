export type UserRole = "admin" | "recruiter" | "document_staff" | "finance_staff" | "user" | "staff";

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
  externalId?: string | null;
  lastMessageAt?: string | null;
  lastAiExtractedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageRecord {
  id: string;
  thread_id: string;
  direction: string;
  type: string;
  content?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  rawPayload?: Record<string, unknown> | null;
  externalId?: string | null;
  aiScannedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Lead {
  id: string;
  /** Channel identity name — primary header in UI (Zalo display_name or "Zalo:<id>" fallback). */
  displayName?: string | null;
  /** Legal / real full name entered by staff or captured from form submissions. Shown below displayName. */
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
  // Typed manifest columns surfaced for the leads-list redesign. Backend
  // already stores these; some are also resolvable from verifiedProfileData
  // / aiExtractedData when the typed column is null.
  birthYear?: number | null;
  gender?: "male" | "female" | null;
  experienceLevel?: "excellent" | "good" | "basic" | "none" | "undisclosed" | null;
  experienceYears?: number | null;
  hasWorkedAbroad?: boolean | null;
  hasPassport?: boolean | null;
  assigneeUserId?: string | null;
  assignee?: { id: string; username: string; role?: string } | null;
  // Disqualification metadata — populated only while status === 'disqualified'.
  disqualifiedAt?: string | null;
  disqualifiedByUserId?: string | null;
  disqualifiedByUsername?: string | null;
  disqualifiedReason?: string | null;
  previousStatus?: string | null;
  verifiedKeys?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
  threads?: Thread[];
}

export interface ThreadSummary extends Thread {
  lead?: Lead | null;
  lastMessage?: MessageRecord | null;
  messageCount: number;
  unscannedTextCount: number;
}

export interface ThreadListResponse {
  data: ThreadSummary[];
  total: number;
}

export interface MessageListResponse {
  data: MessageRecord[];
  total: number;
}

export interface LeadListResponse {
  data: Lead[];
  total: number;
}

export type ImportBatchStatus =
  | "pending_review"
  | "applying"
  | "completed"
  | "cancelled"
  | "failed";

export type ImportRowDedupStatus = "new" | "duplicate" | "error";

export interface ImportBatch {
  id: string;
  filename: string;
  uploadedByUserId?: string | null;
  uploadedByUsername?: string | null;
  status: ImportBatchStatus;
  totalRows: number;
  willCreateRows: number;
  willSkipRows: number;
  appliedRows: number;
  errorRows: number;
  appliedAt?: string | null;
  completedAt?: string | null;
  errorSummary?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  // Async AI extraction progress on the imported free-text notes. Only the
  // GET /:id endpoint populates these (cheap join). The list endpoint omits
  // them to keep the leads-imports table response fast.
  aiPending?: number;
  aiProcessed?: number;
  aiTotal?: number;
}

export interface ImportBatchRow {
  id: string;
  batch_id: string;
  sourceRow: number;
  mappedFields: {
    _importAction?: "create_lead" | "enrich_existing_lead";
    fullName?: string;
    phone?: string;
    source?: string;
    rawSourceLabel?: string;
    gender?: "male" | "female";
    birthYear?: number;
    heightCm?: number;
    experienceField?: string;
    jobNeeds?: string;
  };
  freeText?: string | null;
  dedupStatus: ImportRowDedupStatus;
  dedupReason?: string | null;
  duplicateOfLeadId?: string | null;
  applied: boolean;
  createdLeadId?: string | null;
  /** VN-language warnings raised during parsing (e.g. note too long, value dropped). */
  validationWarnings?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportBatchListResponse {
  data: ImportBatch[];
  total: number;
}

export interface ImportNotes {
  general?: string;
  specialRequest?: string;
  profile?: string;
  experience?: string;
}

export interface ImportNotesSuggestion {
  id: string;
  fieldName: string;
  value: unknown;
  confidence: "high" | "medium" | "low";
  source: string;
  reason: string | null;
  extractedAt: string;
}

export interface ImportNotesLeadGroup {
  leadId: string;
  leadName: string | null;
  leadPhone: string | null;
  importNotes: ImportNotes | null;
  suggestions: ImportNotesSuggestion[];
}

export interface ZaloNameEnrichmentWorkerStatus {
  enabled: boolean;
  running: boolean;
  batchSize: number;
  tickMs: number | null;
  lastRunStartedAt: string | null;
  lastRunEndedAt: string | null;
  lastRunUpdated: number;
  lastRunSkipped: number;
  lastRunErrors: number;
  lastRunBatches: number;
  /** Live counters — updated after each batch while running === true. */
  currentUpdated: number;
  currentSkipped: number;
  currentErrors: number;
  currentBatches: number;
}

export interface AiExtractionWorkerStatus {
  enabled: boolean;
  running: boolean;
  tickMs: number;
  intervalMs: number;
  batchSize: number;
  lastTickStartedAt: string | null;
  lastTickEndedAt: string | null;
  lastTickThreadsProcessed: number;
  lastTickImportedLeadsProcessed: number;
}

export interface ImportBatchRowListResponse {
  data: ImportBatchRow[];
  total: number;
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
  /** Step 6 — gatekeeper-blocked transitions with operator-facing reasons. */
  blocked?: { status: string; reason: string }[];
}

/**
 * Per-field AI extraction provenance returned by GET /leads/:id/ai-suggestions.
 * Drives the FieldWithProvenance UI on the lead workbench.
 */
export interface AiSuggestion {
  fieldName: string;
  value: unknown;
  confidence: "high" | "medium" | "low";
  source: "ai_llm" | "deterministic" | "webhook";
  sourceMessageIds: string[] | null;
  reason: string | null;
  extractedAt: string;
  appliedToVerifiedAt: string | null;
}

/**
 * One ranked order returned by GET /matching/suggest-for-lead/:leadId.
 * Implements PDF automation #2 (auto-suggest 3-5 best orders during screening).
 */
export interface LeadOrderSuggestion {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  industry: string | null;
  salaryRange: string | null;
  heightMin: number | null;
  acceptsReturnees: boolean | null;
  matchScore: number;
  isEligible: boolean;
  conclusion: string;
  preliminaryFit: "promising" | "needs_review" | "insufficient_data" | "not_fit";
  suggestedAction: string;
  missingRequirements: string[];
  flags: string[];
  rejectReason?: string;
  requiresManagerApproval: boolean;
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

export interface CandidateFormalEvaluation {
  mode: "candidate_formal";
  candidateId: string;
  orderId: string;
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
  form_document_version_id?: string | null;
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

export interface FormStandardRegisterRow {
  documentId: string;
  activeVersionId?: string | null;
  documentStatus: string;
  fileUrl?: string | null;
  hasFile: boolean;
  updatedAt?: string;
  lead: {
    id: string;
    displayName?: string | null;
    fullName?: string | null;
    phone?: string | null;
    status?: string | null;
  };
  candidate?: {
    id: string;
    code?: string | null;
    lifecycleStatus?: string | null;
  } | null;
  application?: {
    id: string;
    status: string;
    formDocumentVersionId?: string | null;
    updatedAt?: string;
  } | null;
  order?: {
    id: string;
    name: string;
    region?: string | null;
    industry?: string | null;
  } | null;
}

export interface FormStandardRegisterResponse {
  data: FormStandardRegisterRow[];
  total: number;
}

/** Lead suggestion summary surfaced by the leadless analyze flow. */
export interface FormStandardLeadSuggestion {
  id: string;
  fullName: string | null;
  displayName: string | null;
  phone: string | null;
  status: string | null;
}

/**
 * Per-field dossier values surfaced by Verify. The same shape is used for
 * BOTH "from form" (AI-extracted from the uploaded file) and "current in
 * dossier" (read from CandidateProfile).
 *
 * Some keys are populated only on one side in practice:
 *  - `phone` lives on Lead (channel identity), never on the dossier.
 *  - `hometownProvince`, `experienceDetails`, `experienceYears` are dossier
 *    columns the AI doesn't extract today.
 */
export interface FormStandardExtractedFields {
  name: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  birthYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  hometownProvince: string | null;
  address: string | null;
  experienceDetails: string | null;
  experienceField: string | null;
  experienceYears: number | null;
  preferredRegions: string[] | null;
  desiredIndustry: string | null;
  desiredSalary: string | number | null;
}

/** Suggestion bundle: at most one phone match (unique index) + 0..N name matches. */
export interface FormStandardSuggestions {
  phoneMatch: FormStandardLeadSuggestion | null;
  nameMatches: FormStandardLeadSuggestion[];
}

// ── Staging-first flow types ───────────────────────────────────────────────

/** Result of POST /documents/form-standard/upload-pending. */
export interface FormStandardStageResult {
  pendingId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
}

/** Result of POST /documents/form-standard/pending/:id/edit-session. */
export interface PendingEditSessionOpenResult {
  sessionId: string; // aliased to pendingId server-side
  editUrl: string;
  filename: string;
  driveFileId: string;
  expiresAt: string;
}

/** Result of GET /documents/form-standard/pending/:id/edit-session/status. */
export interface PendingEditSessionStatus {
  status: "active" | "expired" | "none";
  lastSyncedAt: string | null;
  editUrl: string | null;
}

/** Result of POST /documents/form-standard/pending/:id/verify. */
export interface VerifyPendingResult {
  extracted: FormStandardExtractedFields | null;
  /** Soft form fields (family / marital / education / etc.) from the file. */
  extractedSoft: Record<string, unknown> | null;
  current: FormStandardExtractedFields | null;
  /** Soft form fields currently in the dossier (CandidateProfile.softFields). */
  currentSoft: Record<string, unknown> | null;
  phoneMatch: FormStandardLeadSuggestion | null;
  nameMatches: FormStandardLeadSuggestion[];
}

/** Inline lead-create payload used inside CommitPendingFormPayload. */
export interface CreateNewLeadOnCommit {
  fullName?: string;
  displayName?: string;
  phone?: string;
  source: "zalo" | "facebook";
  leadSource?: LeadAcquisitionSource;
}

/**
 * Body for POST /documents/form-standard/pending/:id/commit.
 *
 * `dossierFields` is the operator-resolved per-field outcome from the Verify
 * screen. Keys present only when the operator chose "use form value" or
 * "override". Fields where the operator kept the current dossier value are
 * omitted so the existing value stays untouched. Writes land on
 * CandidateProfile — NEVER the Lead.
 *
 * The blob may include a `softFields` sub-object for the closed-key
 * informational form fields (family / marital / etc.).
 */
export interface CommitPendingFormPayload {
  leadId?: string;
  createNewLead?: CreateNewLeadOnCommit;
  dossierFields?: Record<string, unknown>;
}

/** Allowed acquisition sources. Mirrors Lead.leadSource and CreateLeadDto.leadSource. */
export type LeadAcquisitionSource = "facebook" | "zalo" | "tiktok" | "website" | "gioi_thieu";

/** Body for POST /leads — required source is the messaging channel (zalo/facebook). */
export interface CreateLeadPayload {
  displayName?: string;
  fullName?: string;
  phone?: string;
  source: "zalo" | "facebook";
  sourceUserId?: string;
  region?: string;
  status?: string;
  tags?: string[];
  leadSource?: LeadAcquisitionSource;
  aiExtractedData?: Record<string, unknown>;
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
  application_id?: string | null;
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
  application?: ApplicationRecord | null;
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
  /**
   * AI provider response. The Gemini freeform path returns either a parsed
   * JSON object (when the model emitted structured output) or a plain string.
   * Callers must handle both shapes — passing the raw value to a JSX child
   * will throw "Objects are not valid as a React child" when it's an object.
   */
  result: string | Record<string, unknown> | null;
}

export interface CapabilityState {
  enabled: boolean;
  reason?: string;
}

export interface CapabilityRegistry {
  dashboard: CapabilityState;
  leads: CapabilityState;
  leadQualification: CapabilityState;
  aiExtraction: CapabilityState;
  matching: CapabilityState;
  orders: CapabilityState;
  applications: CapabilityState;
  documents: CapabilityState;
  trainingFinance: CapabilityState;
  candidatePortal: CapabilityState;
}
