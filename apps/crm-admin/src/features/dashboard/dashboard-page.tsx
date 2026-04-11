import { useMemo } from "react";
import { Badge, EmptyState, Panel, SectionHeader } from "@social-crm/ui";
import { useDashboardStatsQuery, useLeadsQuery } from "@social-crm/api";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import "./dashboard-page.css";

function toneForStatus(status: string) {
  if (["INTERVIEW_FAILED", "DISQUALIFIED"].includes(status)) return "danger" as const;
  if (["MATCHED", "INTERVIEW_PASSED", "CONTRACT_SIGNED", "DEPARTED"].includes(status)) return "success" as const;
  if (["QUALIFIED", "MATCHING", "INTERVIEW_SCHEDULED", "INTERVIEWING", "VISA_PROCESSING"].includes(status)) return "warning" as const;
  return "accent" as const;
}

export function DashboardPage() {
  const stats = useDashboardStatsQuery();
  const leads = useLeadsQuery({ offset: 0, limit: 50 });

  const allLeads = leads.data?.data ?? [];

  const classification = useMemo(() => {
    const buckets = [
      { name: "Hot", value: allLeads.filter((lead) => lead.leadClassification === "HOT").length, color: "#4f46e5" },
      { name: "Warm", value: allLeads.filter((lead) => lead.leadClassification === "WARM").length, color: "#f59e0b" },
      { name: "Cold", value: allLeads.filter((lead) => !lead.leadClassification || lead.leadClassification === "COLD").length, color: "#94a3b8" }
    ];
    return buckets.filter((item) => item.value > 0);
  }, [allLeads]);

  const stageCounts = useMemo(() => {
    return [
      { label: "New", value: allLeads.filter((lead) => lead.status === "NEW").length, tone: "accent" },
      { label: "Qualified", value: allLeads.filter((lead) => lead.status === "QUALIFIED").length, tone: "warning" },
      { label: "Matching", value: allLeads.filter((lead) => ["MATCHING", "MATCHED"].includes(lead.status)).length, tone: "warning" },
      { label: "Blocked", value: allLeads.filter((lead) => ["INTERVIEW_FAILED", "DISQUALIFIED"].includes(lead.status)).length, tone: "danger" }
    ];
  }, [allLeads]);

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
        eyebrow="Operations overview"
        title="Daily control surface"
        description="Backend-backed recruiting metrics arranged in the same dense, operator-first UI language as the source CRM."
      />

      <section className="dashboard-hero">
        <div className="dashboard-hero-grid">
          <div>
            <div className="dashboard-hero-kicker">Today&apos;s operating picture</div>
            <h2>Track intake pressure, live lead quality, and where recruiters should act next.</h2>
            <p>
              This dashboard stays grounded in current backend coverage: lead load, stage concentration, and the highest-priority records in the visible working set.
            </p>

            <div className="dashboard-hero-stats">
              <div className="dashboard-hero-stat">
                <div className="dashboard-hero-stat-label">Total leads</div>
                <div className="dashboard-hero-stat-value">{stats.data?.totalLeads ?? "-"}</div>
              </div>
              <div className="dashboard-hero-stat">
                <div className="dashboard-hero-stat-label">Conversation threads</div>
                <div className="dashboard-hero-stat-value">{stats.data?.totalThreads ?? "-"}</div>
              </div>
              <div className="dashboard-hero-stat">
                <div className="dashboard-hero-stat-label">Loaded workset</div>
                <div className="dashboard-hero-stat-value">{allLeads.length}</div>
              </div>
            </div>
          </div>

          <aside className="dashboard-hero-panel">
            <div className="dashboard-hero-panel-title">Immediate focus</div>
            <div className="dashboard-hero-panel-list">
              <div className="dashboard-hero-panel-item">
                <div className="dashboard-hero-panel-name">High-score leads</div>
                <div className="dashboard-hero-panel-value">{operationalStats.highScore}</div>
              </div>
              <div className="dashboard-hero-panel-item">
                <div className="dashboard-hero-panel-name">Untouched records</div>
                <div className="dashboard-hero-panel-value">{operationalStats.stale}</div>
              </div>
              <div className="dashboard-hero-panel-item">
                <div className="dashboard-hero-panel-name">Missing region</div>
                <div className="dashboard-hero-panel-value">{operationalStats.missingRegion}</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="dashboard-grid">
        <Panel className="dashboard-module" title={<span className="dashboard-panel-title">Pipeline pressure</span>} subtitle={<span className="dashboard-panel-subtitle">Where the current recruiter workset is clustering.</span>}>
          <div className="dashboard-stage-grid">
            {stageCounts.map((item) => (
              <div key={item.label} className={`dashboard-stage-card tone-${item.tone}`}>
                <div className="dashboard-stage-label">{item.label}</div>
                <div className="dashboard-stage-value">{item.value}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="dashboard-module" title={<span className="dashboard-panel-title">Lead temperature</span>} subtitle={<span className="dashboard-panel-subtitle">Classification spread across the visible backend query.</span>}>
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
                    <span>{entry.name}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No classification data yet" description="Lead scoring may still be populating, or the current dashboard window returned no scored leads." />
          )}
        </Panel>
      </div>

      <div className="dashboard-lower-grid">
        <Panel className="dashboard-module" title={<span className="dashboard-panel-title">Status distribution</span>} subtitle={<span className="dashboard-panel-subtitle">Top current statuses in the loaded lead window.</span>}>
          {statusDistribution.length ? (
            <div className="dashboard-status-list">
              {statusDistribution.map((item) => (
                <div key={item.status} className="dashboard-status-item">
                  <Badge tone={toneForStatus(item.status)}>{item.status}</Badge>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No lead statuses loaded" description="The current lead query returned no records to summarize." />
          )}
        </Panel>

        <Panel className="dashboard-module" title={<span className="dashboard-panel-title">Priority lead queue</span>} subtitle={<span className="dashboard-panel-subtitle">Highest score first, for immediate operator review.</span>}>
          {priorityQueue.length ? (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Status</th>
                  <th>Channel</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {priorityQueue.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.fullName || "Unnamed lead"}</strong>
                      <div className="dashboard-cell-sub">{lead.region || "No region"} · {lead.phone || "No phone"}</div>
                    </td>
                    <td>
                      <Badge tone={toneForStatus(lead.status)}>{lead.status}</Badge>
                    </td>
                    <td>{lead.source}</td>
                    <td><strong>{lead.leadScore ?? "-"}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No leads loaded" description="The current dashboard window has no leads to prioritize." />
          )}
        </Panel>
      </div>
    </div>
  );
}
