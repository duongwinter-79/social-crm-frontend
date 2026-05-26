import { Link } from "react-router-dom";
import { Badge } from "@social-crm/ui";
import {
  useApplicationsQuery,
  useCandidateByLeadQuery,
  useFormStandardRegisterQuery
} from "@social-crm/api";
import { useI18n } from "@/i18n";

type ContextNavItem = "form" | "dossier" | "application";
type ContextNavTone = "success" | "warning" | "neutral" | "accent";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function itemClass(active: boolean, disabled: boolean) {
  return cx(
    "flex min-w-[180px] flex-1 flex-col gap-1 rounded-xl border px-3 py-3 text-left transition",
    active
      ? "border-indigo-300 bg-indigo-50 text-indigo-950"
      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/60",
    disabled && "pointer-events-none opacity-50"
  );
}

function StatusBadge(props: { children: string; tone?: ContextNavTone }) {
  return (
    <span className="mt-1">
      <Badge tone={props.tone ?? "neutral"}>{props.children}</Badge>
    </span>
  );
}

export function ApplicationContextNav(props: {
  leadId?: string;
  active: ContextNavItem;
  className?: string;
}) {
  const { copy, formatApplicationStatus, formatDocumentStatus } = useI18n();
  const leadId = props.leadId?.trim() ?? "";
  const hasLead = Boolean(leadId);
  const formQuery = useFormStandardRegisterQuery(
    hasLead ? { offset: 0, limit: 1, leadId } : undefined,
    { enabled: hasLead }
  );
  const candidateQuery = useCandidateByLeadQuery(hasLead ? leadId : undefined);
  const applicationsQuery = useApplicationsQuery(
    { offset: 0, limit: 1, leadId: hasLead ? leadId : undefined },
    { enabled: hasLead }
  );

  const form = formQuery.data?.data?.[0] ?? null;
  const candidate = candidateQuery.data ?? null;
  const application = applicationsQuery.data?.data?.[0] ?? null;

  const formStatus = form
    ? form.hasFile
      ? formatDocumentStatus(form.documentStatus)
      : copy({ en: "No file", vi: "Chưa có file" })
    : copy({ en: "No form", vi: "Chưa có form" });
  const formTone = form?.documentStatus === "verified" ? "success" : form ? "warning" : "neutral";
  const dossierStatus = candidate?.profile
    ? copy({ en: "Dossier ready", vi: "Đã có hồ sơ" })
    : copy({ en: "No dossier yet", vi: "Chưa có hồ sơ" });
  const applicationStatus = application
    ? formatApplicationStatus(application.status)
    : copy({ en: "No application", vi: "Chưa có ứng tuyển" });

  const items: Array<{
    key: ContextNavItem;
    to: string;
    label: string;
    description: string;
    status: string;
    tone: ContextNavTone;
  }> = [
    {
      key: "form" as const,
      to: hasLead ? `/applications/detail?leadId=${encodeURIComponent(leadId)}` : "",
      label: copy({ en: "Form", vi: "Form" }),
      description: copy({ en: "Upload, verify, or replace evidence.", vi: "Tải lên, xác minh hoặc thay hồ sơ." }),
      status: formStatus,
      tone: formTone,
    },
    {
      key: "dossier" as const,
      to: hasLead ? `/leads/${encodeURIComponent(leadId)}/dossier` : "",
      label: copy({ en: "Candidate dossier", vi: "Hồ sơ ứng viên" }),
      description: copy({ en: "Structured data created from the form.", vi: "Dữ liệu đã chuẩn hóa từ form." }),
      status: dossierStatus,
      tone: candidate?.profile ? "success" : "neutral",
    },
    {
      key: "application" as const,
      to: hasLead ? `/applications?tab=applications&leadId=${encodeURIComponent(leadId)}` : "",
      label: copy({ en: "Application", vi: "Ứng tuyển" }),
      description: copy({ en: "Candidate-to-order application record.", vi: "Bản ghi ứng viên ứng tuyển đơn hàng." }),
      status: applicationStatus,
      tone: application ? "accent" : "neutral",
    },
  ];

  return (
    <nav
      aria-label={copy({ en: "Application workflow navigation", vi: "Điều hướng luồng hồ sơ ứng tuyển" })}
      className={cx("rounded-2xl border border-slate-200 bg-slate-50/80 p-2", props.className)}
    >
      <div className="flex flex-col gap-2 lg:flex-row">
        {items.map((item) => {
          const active = props.active === item.key;
          const disabled = !hasLead;
          const content = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{item.label}</span>
                {active ? <Badge tone="accent">{copy({ en: "Current", vi: "Đang xem" })}</Badge> : null}
              </div>
              <span className="text-xs leading-5 text-slate-500">{item.description}</span>
              <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
            </>
          );
          return disabled ? (
            <div key={item.key} className={itemClass(active, disabled)}>
              {content}
            </div>
          ) : (
            <Link key={item.key} to={item.to} className={itemClass(active, disabled)}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
