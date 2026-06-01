import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge, EmptyState, Panel, SectionHeader } from "@social-crm/ui";
import { useDashboardStatsQuery, usePipelineQuery } from "@social-crm/api";
import type { PipelineRow } from "@social-crm/api";
import { useI18n } from "@/i18n";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import "./dashboard-page.css";

const ACTIVE_APPLICATION_STATUSES = ["matching", "referred", "interview_scheduled", "interview_passed", "signing"];

function count(bucket: Record<string, number> | undefined, key: string) {
  return bucket?.[key] ?? bucket?.[key.toUpperCase()] ?? 0;
}

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? "").toLowerCase();
}

function sum(bucket: Record<string, number> | undefined, keys: string[]) {
  return keys.reduce((total, key) => total + count(bucket, key), 0);
}

function workflowValue(stats: Record<string, number> | undefined, key: string) {
  return Number(stats?.[key] ?? 0);
}

function toneForLeadStatus(status: string) {
  const value = normalizeStatus(status);
  if (["interview_failed", "disqualified"].includes(value)) return "danger" as const;
  if (["matched", "interview_passed", "contract_signed", "departed"].includes(value)) return "success" as const;
  if (["qualified", "matching", "interview_scheduled", "visa_processing"].includes(value)) return "warning" as const;
  return "accent" as const;
}

function toneForApplicationStatus(status: string) {
  const value = normalizeStatus(status);
  if (["interview_failed", "rejected", "withdrawn"].includes(value)) return "danger" as const;
  if (["interview_passed", "signing", "ready_to_depart"].includes(value)) return "success" as const;
  if (["referred", "interview_scheduled"].includes(value)) return "warning" as const;
  return "accent" as const;
}

function toneForDocumentStatus(status: string) {
  const value = normalizeStatus(status);
  if (["rejected", "expired"].includes(value)) return "danger" as const;
  if (value === "verified") return "success" as const;
  if (value === "submitted") return "warning" as const;
  return "neutral" as const;
}

function rowHasDocumentWork(row: PipelineRow) {
  return row.documents.missingRequired.length > 0 || row.documents.expired.length > 0;
}

function rowHasFinanceWork(row: PipelineRow) {
  const action = row.nextAction.toLowerCase();
  return Boolean(
    action.includes("training") ||
    action.includes("finance") ||
    action.includes("visa") ||
    action.includes("departure") ||
    (row.trainingFinance && (!row.trainingFinance.visaDate || !row.trainingFinance.departureDate))
  );
}

function rowHasRecruitmentWork(row: PipelineRow) {
  const status = normalizeStatus(row.applicationStatus);
  return !row.candidateId || !row.applicationStatus || ["matching", "referred", "interview_scheduled", "interview_passed", "signing"].includes(status);
}

function linkForRow(row: PipelineRow) {
  // Every operational next-step now lives in the candidate's Journey workbench.
  return `/journey/${row.leadId}`;
}

function translateNextAction(action: string, copy: (value: { en: string; vi: string }) => string) {
  const actions: Record<string, { en: string; vi: string }> = {
    "Promote lead to candidate": { en: "Promote lead to candidate", vi: "Tạo hồ sơ ứng viên" },
    "Create application": { en: "Create application", vi: "Tạo ứng tuyển" },
    "Complete required documents": { en: "Complete required documents", vi: "Hoàn tất hồ sơ bắt buộc" },
    "Create training-finance record": { en: "Create training-finance record", vi: "Tạo bản ghi đào tạo/tài chính" },
    "Advance visa readiness": { en: "Advance visa readiness", vi: "Cập nhật trạng thái sẵn sàng visa" },
    "Schedule departure": { en: "Schedule departure", vi: "Lên lịch xuất cảnh" },
    "Monitor departure completion": { en: "Monitor departure completion", vi: "Theo dõi xuất cảnh" },
    "Continue qualification": { en: "Continue qualification", vi: "Tiếp tục đánh giá" },
  };
  return actions[action] ? copy(actions[action]) : action;
}

function translateBlocker(
  blocker: string,
  copy: (value: { en: string; vi: string }) => string,
  formatDocumentType: (value: string) => string,
  formatApplicationStatus: (value: string) => string,
) {
  if (blocker === "Candidate record missing") {
    return copy({ en: "Candidate record missing", vi: "Chưa có hồ sơ ứng viên" });
  }
  if (blocker.startsWith("Missing docs: ")) {
    const docs = blocker.replace("Missing docs: ", "").split(", ").map(formatDocumentType).join(", ");
    return copy({ en: `Missing docs: ${docs}`, vi: `Thiếu hồ sơ: ${docs}` });
  }
  if (blocker.startsWith("Expired docs: ")) {
    const docs = blocker.replace("Expired docs: ", "").split(", ").map(formatDocumentType).join(", ");
    return copy({ en: `Expired docs: ${docs}`, vi: `Hồ sơ hết hạn: ${docs}` });
  }
  if (blocker.startsWith("Application outcome: ")) {
    const status = blocker.replace("Application outcome: ", "");
    return copy({ en: `Application outcome: ${formatApplicationStatus(status)}`, vi: `Kết quả ứng tuyển: ${formatApplicationStatus(status)}` });
  }
  return blocker;
}

export function DashboardPage() {
  const { copy, formatLeadStatus, formatApplicationStatus, formatDocumentStatus, formatDocumentType, formatPipelineStage, formatChannel } = useI18n();
  const stats = useDashboardStatsQuery();
  const pipeline = usePipelineQuery({ offset: 0, limit: 12 });

  const dashboardStats = stats.data;
  const pipelineRows = pipeline.data?.data ?? [];
  const leadStatus = dashboardStats?.leadsByStatus;
  const applicationStatus = dashboardStats?.applicationsByStatus;
  const documentStatus = dashboardStats?.documentsByStatus;
  const workflowSummary = dashboardStats?.workflowSummary;

  const intakeNeedsContact = sum(leadStatus, ["new", "contacted"]);
  const formReady = sum(leadStatus, ["qualified"]);
  const activeApplications = sum(applicationStatus, ACTIVE_APPLICATION_STATUSES);
  const readyToDepart = count(applicationStatus, "ready_to_depart");
  const rejectedDocuments = count(documentStatus, "rejected");
  const expiredDocuments = count(documentStatus, "expired");
  const missingCoreDocuments = workflowValue(workflowSummary, "leadsMissingCoreDocuments");
  const documentIssues = rejectedDocuments + expiredDocuments + missingCoreDocuments;
  const activeTraining = workflowValue(workflowSummary, "activeTraining");
  const visaInFlight = workflowValue(workflowSummary, "visaInFlight");
  const departuresScheduled = workflowValue(workflowSummary, "departuresScheduled");
  const departurePending = Math.max(visaInFlight - departuresScheduled, 0);

  const workflowCards = [
    {
      label: copy({ en: "Needs first action", vi: "Cần xử lý đầu tiên" }),
      value: intakeNeedsContact,
      caption: copy({ en: "New or contacted leads", vi: "Lead mới hoặc đã liên hệ" }),
      href: "/leads",
      tone: "accent",
    },
    {
      label: copy({ en: "Form ready", vi: "Đã có form" }),
      value: formReady,
      caption: copy({ en: "Ready for matching/application", vi: "Sẵn sàng ghép đơn hoặc tạo ứng tuyển" }),
      href: "/journey",
      tone: "warning",
    },
    {
      label: copy({ en: "Application follow-up", vi: "Cần theo ứng tuyển" }),
      value: activeApplications,
      caption: copy({ en: "Active application records", vi: "Ứng tuyển đang xử lý" }),
      href: "/journey",
      tone: "warning",
    },
    {
      label: copy({ en: "Document blockers", vi: "Vướng hồ sơ" }),
      value: documentIssues,
      caption: copy({ en: "Missing, rejected, or expired", vi: "Thiếu, bị từ chối hoặc hết hạn" }),
      href: "/journey",
      tone: "danger",
    },
    {
      label: copy({ en: "Departure pending", vi: "Chờ xuất cảnh" }),
      value: departurePending,
      caption: copy({ en: "Visa in flight without departure", vi: "Đã đóng visa, chưa có ngày xuất cảnh" }),
      href: "/journey",
      tone: "success",
    },
  ];

  const roleQueues = [
    {
      label: copy({ en: "Recruitment", vi: "Tuyển dụng" }),
      value: pipelineRows.filter(rowHasRecruitmentWork).length,
      caption: copy({ en: "Candidate, order, or interview action", vi: "Ứng viên, đơn hàng hoặc phỏng vấn" }),
    },
    {
      label: copy({ en: "Documents", vi: "Hồ sơ" }),
      value: pipelineRows.filter(rowHasDocumentWork).length,
      caption: copy({ en: "Missing or expired paperwork", vi: "Thiếu hoặc hết hạn giấy tờ" }),
    },
    {
      label: copy({ en: "Training & finance", vi: "Đào tạo & tài chính" }),
      value: pipelineRows.filter(rowHasFinanceWork).length,
      caption: copy({ en: "Training, visa, or departure milestone", vi: "Đào tạo, visa hoặc xuất cảnh" }),
    },
  ];

  const applicationChart = useMemo(() => {
    const rows = [
      { name: copy({ en: "Active", vi: "Đang xử lý" }), value: activeApplications, color: "#4f46e5" },
      { name: copy({ en: "Ready", vi: "Sẵn sàng" }), value: readyToDepart, color: "#059669" },
      { name: copy({ en: "Closed", vi: "Đã đóng" }), value: sum(applicationStatus, ["interview_failed", "rejected", "withdrawn"]), color: "#94a3b8" },
    ];
    return rows.filter((row) => row.value > 0);
  }, [activeApplications, applicationStatus, copy, readyToDepart]);

  const actionRows = useMemo(() => {
    return [...pipelineRows]
      .filter((row) => row.blockers.length > 0 || row.nextAction !== "Monitor departure completion")
      .sort((a, b) => {
        const bScore = b.blockers.length * 10 + (b.nextAction ? 1 : 0);
        const aScore = a.blockers.length * 10 + (a.nextAction ? 1 : 0);
        return bScore - aScore;
      })
      .slice(0, 8);
  }, [pipelineRows]);

  return (
    <div className="dashboard-page">
      <SectionHeader
        eyebrow={copy({ en: "Operations overview", vi: "Tổng quan vận hành" })}
        title={copy({ en: "Today’s work queue", vi: "Hàng đợi công việc hôm nay" })}
        description={copy({
          en: "A compact view of intake, application, document, and downstream blockers. Use it to choose the next screen to work in.",
          vi: "Góc nhìn gọn về đầu vào, ứng tuyển, hồ sơ và điểm nghẽn phía sau. Dùng màn hình này để chọn nơi cần xử lý tiếp.",
        })}
      />

      <section className="dashboard-summary">
        <SummaryMetric label={copy({ en: "Leads", vi: "Lead" })} value={dashboardStats?.totalLeads ?? 0} />
        <SummaryMetric label={copy({ en: "Candidates", vi: "Ứng viên" })} value={dashboardStats?.totalCandidates ?? 0} />
        <SummaryMetric label={copy({ en: "Applications", vi: "Ứng tuyển" })} value={dashboardStats?.totalApplications ?? 0} />
        <SummaryMetric label={copy({ en: "Documents", vi: "Hồ sơ" })} value={dashboardStats?.totalDocuments ?? 0} />
        <SummaryMetric label={copy({ en: "Threads", vi: "Hội thoại" })} value={dashboardStats?.totalThreads ?? 0} />
      </section>

      <div className="dashboard-attention-grid">
        {workflowCards.map((card) => (
          <Link key={card.label} to={card.href} className={`dashboard-attention-card tone-${card.tone}`}>
            <span className="dashboard-attention-label">{card.label}</span>
            <strong>{card.value}</strong>
            <span className="dashboard-attention-caption">{card.caption}</span>
          </Link>
        ))}
      </div>

      <div className="dashboard-grid">
        <Panel
          className="dashboard-module"
          title={<span className="dashboard-panel-title">{copy({ en: "Role queues", vi: "Hàng đợi theo vai trò" })}</span>}
          subtitle={<span className="dashboard-panel-subtitle">{copy({ en: "Based on the visible pipeline rows and their blockers.", vi: "Dựa trên các hồ sơ pipeline đang hiển thị và điểm nghẽn của chúng." })}</span>}
        >
          <div className="dashboard-role-list">
            {roleQueues.map((queue) => (
              <div key={queue.label} className="dashboard-role-item">
                <div>
                  <div className="dashboard-role-label">{queue.label}</div>
                  <div className="dashboard-role-caption">{queue.caption}</div>
                </div>
                <strong>{queue.value}</strong>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          className="dashboard-module"
          title={<span className="dashboard-panel-title">{copy({ en: "Application health", vi: "Sức khoẻ ứng tuyển" })}</span>}
          subtitle={<span className="dashboard-panel-subtitle">{copy({ en: "Global application status grouped into active, ready, and closed work.", vi: "Trạng thái ứng tuyển toàn hệ thống được gom theo đang xử lý, sẵn sàng và đã đóng." })}</span>}
        >
          {applicationChart.length ? (
            <div className="dashboard-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={applicationChart} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86}>
                    {applicationChart.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="dashboard-chart-legend">
                {applicationChart.map((entry) => (
                  <div key={entry.name} className="dashboard-chart-legend-item">
                    <span className="dashboard-chart-swatch" style={{ background: entry.color }} />
                    <span>{entry.name}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title={copy({ en: "No application records yet", vi: "Chưa có ứng tuyển" })} description={copy({ en: "Applications will appear here after verified forms are matched to orders.", vi: "Ứng tuyển sẽ xuất hiện sau khi form đã xác minh được ghép với đơn hàng." })} />
          )}
        </Panel>
      </div>

      <div className="dashboard-lower-grid">
        <Panel
          className="dashboard-module"
          title={<span className="dashboard-panel-title">{copy({ en: "Pipeline distribution", vi: "Phân bổ pipeline" })}</span>}
          subtitle={<span className="dashboard-panel-subtitle">{copy({ en: "Global lead statuses from the backend aggregate.", vi: "Trạng thái lead toàn hệ thống từ thống kê backend." })}</span>}
        >
          {leadStatus && Object.keys(leadStatus).length ? (
            <div className="dashboard-status-list">
              {Object.entries(leadStatus)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([status, value]) => (
                  <div key={status} className="dashboard-status-item">
                    <Badge tone={toneForLeadStatus(status)}>{formatLeadStatus(status)}</Badge>
                    <strong>{value}</strong>
                  </div>
                ))}
            </div>
          ) : (
            <EmptyState title={copy({ en: "No lead statuses loaded", vi: "Chưa tải được trạng thái lead" })} description={copy({ en: "The dashboard aggregate did not return lead status counts.", vi: "Thống kê dashboard chưa trả về số lượng theo trạng thái lead." })} />
          )}
        </Panel>

        <Panel
          className="dashboard-module"
          title={<span className="dashboard-panel-title">{copy({ en: "Document status", vi: "Trạng thái hồ sơ" })}</span>}
          subtitle={<span className="dashboard-panel-subtitle">{copy({ en: "Global document status counts, including computed expired documents.", vi: "Số lượng hồ sơ toàn hệ thống, bao gồm hồ sơ hết hạn được tính tự động." })}</span>}
        >
          {documentStatus && Object.keys(documentStatus).length ? (
            <div className="dashboard-status-list">
              {Object.entries(documentStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, value]) => (
                  <div key={status} className="dashboard-status-item">
                    <Badge tone={toneForDocumentStatus(status)}>
                      {formatDocumentStatus(status)}
                    </Badge>
                    <strong>{value}</strong>
                  </div>
                ))}
            </div>
          ) : (
            <EmptyState title={copy({ en: "No document data", vi: "Chưa có dữ liệu hồ sơ" })} description={copy({ en: "Document status counts will appear after documents are created.", vi: "Số lượng theo trạng thái sẽ xuất hiện sau khi có hồ sơ." })} />
          )}
        </Panel>
      </div>

      <Panel
        className="dashboard-module"
        title={<span className="dashboard-panel-title">{copy({ en: "Priority action queue", vi: "Hàng đợi cần xử lý" })}</span>}
        subtitle={<span className="dashboard-panel-subtitle">{copy({ en: "Pipeline rows with blockers or a concrete next action. Open the suggested workspace directly from each row.", vi: "Các hồ sơ có điểm nghẽn hoặc hành động tiếp theo rõ ràng. Mở thẳng màn hình xử lý từ từng dòng." })}</span>}
      >
        {actionRows.length ? (
          <div className="dashboard-action-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>{copy({ en: "Lead", vi: "Lead" })}</th>
                  <th>{copy({ en: "Stage", vi: "Giai đoạn" })}</th>
                  <th>{copy({ en: "Application", vi: "Ứng tuyển" })}</th>
                  <th>{copy({ en: "Blocker", vi: "Điểm nghẽn" })}</th>
                  <th>{copy({ en: "Next", vi: "Tiếp theo" })}</th>
                </tr>
              </thead>
              <tbody>
                {actionRows.map((row) => (
                  <tr key={row.leadId}>
                    <td>
                      <Link className="dashboard-row-link" to={`/leads/${row.leadId}`}>
                        {row.leadName || row.phone || row.leadId}
                      </Link>
                      <div className="dashboard-cell-sub">{row.phone || copy({ en: "No phone", vi: "Chưa có số điện thoại" })} · {formatChannel(row.source)}</div>
                    </td>
                    <td>
                      <Badge tone={toneForLeadStatus(row.currentStage)}>{formatPipelineStage(row.currentStage)}</Badge>
                    </td>
                    <td>
                      {row.applicationStatus ? (
                        <Badge tone={toneForApplicationStatus(row.applicationStatus)}>{formatApplicationStatus(row.applicationStatus)}</Badge>
                      ) : (
                        <span className="dashboard-muted">{copy({ en: "None", vi: "Chưa có" })}</span>
                      )}
                    </td>
                    <td>
                      {row.blockers.length
                        ? translateBlocker(row.blockers[0], copy, formatDocumentType, formatApplicationStatus)
                        : copy({ en: "No blocker", vi: "Không có điểm nghẽn" })}
                    </td>
                    <td>
                      <Link className="dashboard-row-action" to={linkForRow(row)}>
                        {row.nextAction ? translateNextAction(row.nextAction, copy) : copy({ en: "Open workspace", vi: "Mở màn hình xử lý" })}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={copy({ en: "No pipeline work loaded", vi: "Chưa có hồ sơ cần xử lý" })} description={copy({ en: "The visible pipeline query did not return any rows.", vi: "Truy vấn pipeline hiện tại chưa trả về hồ sơ nào." })} />
        )}
      </Panel>
    </div>
  );
}

function SummaryMetric(props: { label: string; value: number }) {
  return (
    <div className="dashboard-summary-metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}
