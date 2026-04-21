import { useMemo } from "react";
import { Badge, EmptyState, Panel, SectionHeader } from "@social-crm/ui";
import { useDashboardStatsQuery, useLeadsQuery } from "@social-crm/api";
import { useI18n } from "@/i18n";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import "./dashboard-page.css";

function toneForStatus(status: string) {
  if (["INTERVIEW_FAILED", "DISQUALIFIED"].includes(status)) return "danger" as const;
  if (["MATCHED", "INTERVIEW_PASSED", "CONTRACT_SIGNED", "DEPARTED"].includes(status)) return "success" as const;
  if (["QUALIFIED", "MATCHING", "INTERVIEW_SCHEDULED", "INTERVIEWING", "VISA_PROCESSING"].includes(status)) return "warning" as const;
  return "accent" as const;
}

export function DashboardPage() {
  const { copy, formatLeadStatus, formatEnum } = useI18n();
  const stats = useDashboardStatsQuery();
  const leads = useLeadsQuery({ offset: 0, limit: 50 });

  const allLeads = leads.data?.data ?? [];

  const classification = useMemo(() => {
    const buckets = [
      { name: "HOT", value: allLeads.filter((lead) => lead.leadClassification === "HOT").length, color: "#4f46e5" },
      { name: "WARM", value: allLeads.filter((lead) => lead.leadClassification === "WARM").length, color: "#f59e0b" },
      { name: "COLD", value: allLeads.filter((lead) => !lead.leadClassification || lead.leadClassification === "COLD").length, color: "#94a3b8" }
    ];
    return buckets.filter((item) => item.value > 0);
  }, [allLeads]);

  const stageCounts = useMemo(() => {
    return [
      { label: copy({ en: "New", vi: "Mới" }), value: allLeads.filter((lead) => lead.status === "NEW").length, tone: "accent" },
      { label: copy({ en: "Qualified", vi: "Đủ điều kiện" }), value: allLeads.filter((lead) => lead.status === "QUALIFIED").length, tone: "warning" },
      { label: copy({ en: "Matching", vi: "Đang ghép" }), value: allLeads.filter((lead) => ["MATCHING", "MATCHED"].includes(lead.status)).length, tone: "warning" },
      { label: copy({ en: "Blocked", vi: "Bị chặn" }), value: allLeads.filter((lead) => ["INTERVIEW_FAILED", "DISQUALIFIED"].includes(lead.status)).length, tone: "danger" }
    ];
  }, [allLeads, copy]);

  const statusDistribution = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const lead of allLeads) {
      grouped.set(lead.status, (grouped.get(lead.status) ?? 0) + 1);
    }

    return [...grouped.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allLeads]);

  const priorityQueue = useMemo(() => {
    return [...allLeads]
      .sort((a, b) => (b.leadScore ?? 0) - (a.leadScore ?? 0))
      .slice(0, 6);
  }, [allLeads]);

  const operationalStats = useMemo(() => {
    const stale = allLeads.filter((lead) => !lead.updatedAt || lead.updatedAt === lead.createdAt).length;
    const missingRegion = allLeads.filter((lead) => !lead.region).length;
    const highScore = allLeads.filter((lead) => (lead.leadScore ?? 0) >= 80).length;
    return { stale, missingRegion, highScore };
  }, [allLeads]);

  return (
    <div className="dashboard-page">
      <SectionHeader
        eyebrow={copy({ en: "Operations overview", vi: "Tổng quan vận hành" })}
        title={copy({ en: "Daily control surface", vi: "Bề mặt điều hành hằng ngày" })}
        description={copy({
          en: "Backend-backed recruiting metrics arranged in the same dense, operator-first UI language as the source CRM.",
          vi: "Các chỉ số tuyển dụng chạy bằng backend được trình bày theo cùng ngôn ngữ giao diện ưu tiên vận hành như CRM gốc."
        })}
      />

      <section className="dashboard-hero">
        <div className="dashboard-hero-grid">
          <div>
            <div className="dashboard-hero-kicker">{copy({ en: "Today's operating picture", vi: "Bức tranh vận hành hôm nay" })}</div>
            <h2>{copy({ en: "Track intake pressure, live lead quality, and where recruiters should act next.", vi: "Theo dõi áp lực đầu vào, chất lượng lead hiện tại và nơi đội tuyển dụng cần hành động tiếp theo." })}</h2>
            <p>
              {copy({
                en: "This dashboard stays grounded in current backend coverage: lead load, stage concentration, and the highest-priority records in the visible working set.",
                vi: "Dashboard này bám sát đúng phạm vi backend hiện có: tải lead, mức độ tập trung theo giai đoạn và các hồ sơ ưu tiên cao nhất trong tập làm việc đang hiển thị."
              })}
            </p>

            <div className="dashboard-hero-stats">
              <div className="dashboard-hero-stat">
                <div className="dashboard-hero-stat-label">{copy({ en: "Total leads", vi: "Tổng lead" })}</div>
                <div className="dashboard-hero-stat-value">{stats.data?.totalLeads ?? "-"}</div>
              </div>
              <div className="dashboard-hero-stat">
                <div className="dashboard-hero-stat-label">{copy({ en: "Conversation threads", vi: "Luồng hội thoại" })}</div>
                <div className="dashboard-hero-stat-value">{stats.data?.totalThreads ?? "-"}</div>
              </div>
              <div className="dashboard-hero-stat">
                <div className="dashboard-hero-stat-label">{copy({ en: "Loaded workset", vi: "Tập làm việc đã tải" })}</div>
                <div className="dashboard-hero-stat-value">{allLeads.length}</div>
              </div>
            </div>
          </div>

          <aside className="dashboard-hero-panel">
            <div className="dashboard-hero-panel-title">{copy({ en: "Immediate focus", vi: "Ưu tiên tức thời" })}</div>
            <div className="dashboard-hero-panel-list">
              <div className="dashboard-hero-panel-item">
                <div className="dashboard-hero-panel-name">{copy({ en: "High-score leads", vi: "Lead điểm cao" })}</div>
                <div className="dashboard-hero-panel-value">{operationalStats.highScore}</div>
              </div>
              <div className="dashboard-hero-panel-item">
                <div className="dashboard-hero-panel-name">{copy({ en: "Untouched records", vi: "Hồ sơ chưa xử lý" })}</div>
                <div className="dashboard-hero-panel-value">{operationalStats.stale}</div>
              </div>
              <div className="dashboard-hero-panel-item">
                <div className="dashboard-hero-panel-name">{copy({ en: "Missing region", vi: "Thiếu khu vực" })}</div>
                <div className="dashboard-hero-panel-value">{operationalStats.missingRegion}</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="dashboard-grid">
        <Panel className="dashboard-module" title={<span className="dashboard-panel-title">{copy({ en: "Pipeline pressure", vi: "Áp lực pipeline" })}</span>} subtitle={<span className="dashboard-panel-subtitle">{copy({ en: "Where the current recruiter workset is clustering.", vi: "Các điểm tập trung chính của tập công việc tuyển dụng hiện tại." })}</span>}>
          <div className="dashboard-stage-grid">
            {stageCounts.map((item) => (
              <div key={item.label} className={`dashboard-stage-card tone-${item.tone}`}>
                <div className="dashboard-stage-label">{item.label}</div>
                <div className="dashboard-stage-value">{item.value}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="dashboard-module" title={<span className="dashboard-panel-title">{copy({ en: "Lead temperature", vi: "Nhiệt độ lead" })}</span>} subtitle={<span className="dashboard-panel-subtitle">{copy({ en: "Classification spread across the visible backend query.", vi: "Phân bổ phân loại trên tập truy vấn backend đang hiển thị." })}</span>}>
          {classification.length ? (
            <div className="dashboard-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={classification} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86}>
                    {classification.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="dashboard-chart-legend">
                {classification.map((entry) => (
                  <div key={entry.name} className="dashboard-chart-legend-item">
                    <span className="dashboard-chart-swatch" style={{ background: entry.color }} />
                    <span>{formatEnum(entry.name)}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title={copy({ en: "No classification data yet", vi: "Chưa có dữ liệu phân loại" })} description={copy({ en: "Lead scoring may still be populating, or the current dashboard window returned no scored leads.", vi: "Điểm lead có thể vẫn đang được cập nhật, hoặc cửa sổ dashboard hiện tại chưa trả về lead nào đã chấm điểm." })} />
          )}
        </Panel>
      </div>

      <div className="dashboard-lower-grid">
        <Panel className="dashboard-module" title={<span className="dashboard-panel-title">{copy({ en: "Status distribution", vi: "Phân bổ trạng thái" })}</span>} subtitle={<span className="dashboard-panel-subtitle">{copy({ en: "Top current statuses in the loaded lead window.", vi: "Các trạng thái nổi bật trong cửa sổ lead hiện đang tải." })}</span>}>
          {statusDistribution.length ? (
            <div className="dashboard-status-list">
              {statusDistribution.map((item) => (
                <div key={item.status} className="dashboard-status-item">
                  <Badge tone={toneForStatus(item.status)}>{formatLeadStatus(item.status)}</Badge>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={copy({ en: "No lead statuses loaded", vi: "Chưa tải được trạng thái lead" })} description={copy({ en: "The current lead query returned no records to summarize.", vi: "Truy vấn lead hiện tại không trả về bản ghi nào để tổng hợp." })} />
          )}
        </Panel>

        <Panel className="dashboard-module" title={<span className="dashboard-panel-title">{copy({ en: "Priority lead queue", vi: "Hàng đợi lead ưu tiên" })}</span>} subtitle={<span className="dashboard-panel-subtitle">{copy({ en: "Highest score first, for immediate operator review.", vi: "Ưu tiên điểm cao nhất trước để nhân sự rà soát ngay." })}</span>}>
          {priorityQueue.length ? (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>{copy({ en: "Lead", vi: "Lead" })}</th>
                  <th>{copy({ en: "Status", vi: "Trạng thái" })}</th>
                  <th>{copy({ en: "Channel", vi: "Kênh" })}</th>
                  <th>{copy({ en: "Score", vi: "Điểm" })}</th>
                </tr>
              </thead>
              <tbody>
                {priorityQueue.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.fullName || copy({ en: "Unnamed lead", vi: "Lead chưa có tên" })}</strong>
                      <div className="dashboard-cell-sub">{lead.region || copy({ en: "No region", vi: "Chưa có khu vực" })} · {lead.phone || copy({ en: "No phone", vi: "Chưa có số điện thoại" })}</div>
                    </td>
                    <td>
                      <Badge tone={toneForStatus(lead.status)}>{formatLeadStatus(lead.status)}</Badge>
                    </td>
                    <td>{lead.source}</td>
                    <td><strong>{lead.leadScore ?? "-"}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title={copy({ en: "No leads loaded", vi: "Chưa tải được lead" })} description={copy({ en: "The current dashboard window has no leads to prioritize.", vi: "Cửa sổ dashboard hiện tại không có lead nào để ưu tiên." })} />
          )}
        </Panel>
      </div>
    </div>
  );
}
