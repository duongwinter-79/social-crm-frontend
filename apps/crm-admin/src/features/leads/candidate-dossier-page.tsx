import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  InfoStrip,
  Panel,
  SectionHeader
} from "@social-crm/ui";
import { useCandidateByLeadQuery, useLeadDetailQuery } from "@social-crm/api";
import { getLeadDisplayName, getLeadFullNameLabel } from "@/lib/lead-display";
import { useI18n } from "@/i18n";
import { useUiText } from "@/ui-text/ui-text-provider";
import { UiText } from "@/ui-text/ui-text";
import { CandidateDossierPanel } from "./candidate-dossier-panel";
import { ApplicationContextNav } from "../applications/application-context-nav";

function toneForStatus(status?: string | null) {
  if (!status) return "neutral" as const;
  if (["INTERVIEW_FAILED", "DISQUALIFIED"].includes(status)) return "danger" as const;
  if (["MATCHED", "INTERVIEW_PASSED", "CONTRACT_SIGNED", "DEPARTED"].includes(status)) return "success" as const;
  if (["QUALIFIED", "MATCHING", "INTERVIEW_SCHEDULED", "VISA_PROCESSING"].includes(status)) return "warning" as const;
  return "accent" as const;
}

export function CandidateDossierPage() {
  const { copy, formatLeadStatus } = useI18n();
  const { text } = useUiText();
  const { leadId = "" } = useParams();
  const navigate = useNavigate();
  const leadQuery = useLeadDetailQuery(leadId);
  const candidateQuery = useCandidateByLeadQuery(leadId);
  const lead = leadQuery.data;
  const candidate = candidateQuery.data;

  if (!lead && leadQuery.isLoading) {
    return (
      <Panel title={<UiText id="candidate.dossier.title" />}>
        <div className="text-sm text-slate-500">{copy({ en: "Loading dossier...", vi: "Đang tải hồ sơ..." })}</div>
      </Panel>
    );
  }

  if (!lead) {
    return (
      <Panel title={<UiText id="candidate.dossier.title" />}>
        <EmptyState
          title={copy({ en: "Lead not loaded", vi: "Chưa tải được lead" })}
          description={copy({ en: "The selected lead could not be loaded from the backend.", vi: "Không tải được hồ sơ đã chọn từ API." })}
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={text("candidate.dossier.title")}
        title={getLeadDisplayName(lead)}
        description={[
          getLeadFullNameLabel(lead),
          `${lead.source.toUpperCase()} - ${lead.phone || copy({ en: "No phone", vi: "Chưa có số điện thoại" })}`,
        ].filter(Boolean).join(" - ")}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={toneForStatus(lead.status)}>{formatLeadStatus(lead.status)}</Badge>
          <Badge tone={candidate ? "success" : "warning"}>
            {candidate?.code ?? candidate?.id ?? copy({ en: "No candidate linked", vi: "Chưa liên kết ứng viên" })}
          </Badge>
          <span>
            {copy({
              en: "This page keeps the full form-derived dossier out of the lead workbench.",
              vi: "Trang này tách hồ sơ đầy đủ từ form ra khỏi bàn xử lý lead."
            })}
          </span>
        </div>
      </InfoStrip>

      <ApplicationContextNav leadId={lead.id} active="dossier" />

      <Panel
        title={copy({ en: "Dossier links", vi: "Liên kết hồ sơ" })}
        subtitle={copy({
          en: "The candidate dossier is sourced from the verified standard worker form and stays linked to its document evidence.",
          vi: "Hồ sơ ứng viên lấy từ form lao động chuẩn đã xác minh và giữ liên kết với bằng chứng tài liệu."
        })}
      >
        <DescriptionList
          items={[
            { label: copy({ en: "Lead ID", vi: "Mã lead" }), value: lead.id },
            { label: copy({ en: "Candidate", vi: "Ứng viên" }), value: candidate?.code ?? candidate?.id ?? copy({ en: "Not created", vi: "Chưa tạo" }) },
            { label: copy({ en: "Lead status", vi: "Trạng thái lead" }), value: formatLeadStatus(lead.status) },
            { label: copy({ en: "Source", vi: "Nguồn" }), value: lead.source },
          ]}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(`/leads/${lead.id}`)}>
            {copy({ en: "Back to workbench", vi: "Quay lại bàn xử lý" })}
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/applications/detail?leadId=${lead.id}`)}>
            {candidate?.profile
              ? copy({ en: "View form document", vi: "Xem tài liệu form" })
              : copy({ en: "Upload standard form", vi: "Tải form chuẩn" })}
          </Button>
        </div>
      </Panel>

      {candidate?.profile ? (
        <CandidateDossierPanel profile={candidate.profile} />
      ) : (
        <Panel title={<UiText id="candidate.dossier.title" />}>
          <EmptyState
            title={copy({ en: "No verified form dossier yet", vi: "Chưa có hồ sơ form đã xác minh" })}
            description={copy({
              en: "Upload and verify the standard worker form before reviewing the candidate dossier.",
              vi: "Tải lên và xác minh form lao động chuẩn trước khi xem hồ sơ ứng viên."
            })}
          />
        </Panel>
      )}
    </div>
  );
}
