import { useSessionStore } from "./session";

/**
 * Frontend mirror of the backend role/permission matrix in
 * `src/features/auth/guards/permissions.guard.ts`. Keep both in sync.
 *
 * The backend is authoritative — these helpers just hide mutation UI so
 * operators in a lower role don't see actions that would 403 on click.
 */

export type Role =
  | "admin"
  | "recruiter"
  | "document_staff"
  | "finance_staff"
  | "user";

export type Permission =
  | "view_leads"
  | "view_lead_pii"
  | "edit_leads"
  | "verify_documents"
  | "manage_finance"
  | "manage_recruitment"
  | "transition_lead_status"
  | "admin_all";

const ROLE_PERMISSIONS: Record<Role, ReadonlyArray<Permission>> = {
  admin: ["admin_all"],
  // Recruiters call/qualify candidates, so they hold view_lead_pii (raw phone).
  recruiter: ["view_leads", "view_lead_pii", "edit_leads", "manage_recruitment", "transition_lead_status"],
  // Document/finance staff verify docs / manage money — pipeline-stage moves
  // and raw candidate contact details are withheld (they see phone masked).
  // Mirrors backend ROLE_PERMISSIONS.
  document_staff: ["view_leads", "edit_leads", "verify_documents"],
  finance_staff: ["view_leads", "edit_leads", "manage_finance"],
  user: ["view_leads"],
};

function rolesOf(user: { roles?: string[] } | null | undefined): Role[] {
  return (user?.roles ?? []) as Role[];
}

/** Pure helper — does the given user have this permission via any of their roles? */
export function hasPermission(
  user: { roles?: string[] } | null | undefined,
  permission: Permission,
): boolean {
  const roles = rolesOf(user);
  for (const role of roles) {
    const grants = ROLE_PERMISSIONS[role];
    if (!grants) continue;
    if (grants.includes("admin_all")) return true;
    if (grants.includes(permission)) return true;
  }
  return false;
}

/** Pure helper — is the user in this exact role? */
export function hasRole(
  user: { roles?: string[] } | null | undefined,
  role: Role,
): boolean {
  return rolesOf(user).includes(role);
}

/**
 * React hook returning the current operator's permission flags.
 *
 * Use these to gate mutation UI. Reads are always allowed (everyone has
 * `view_leads`) so no flag exists for read access.
 *
 * Example:
 *   const { canEditLeads, isAdmin } = usePermissions();
 *   {canEditLeads && <Button>Edit</Button>}
 */
export function usePermissions() {
  const user = useSessionStore((s) => s.user);
  return {
    user,
    isAdmin: hasRole(user, "admin"),
    canViewLeads: hasPermission(user, "view_leads"),
    canViewLeadPii: hasPermission(user, "view_lead_pii"),
    canEditLeads: hasPermission(user, "edit_leads"),
    canVerifyDocuments: hasPermission(user, "verify_documents"),
    canManageFinance: hasPermission(user, "manage_finance"),
    canManageRecruitment: hasPermission(user, "manage_recruitment"),
    canTransitionLeadStatus: hasPermission(user, "transition_lead_status"),
  };
}
