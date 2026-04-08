import { useMemo } from "react";
import { Badge, EmptyState, Panel } from "@social-crm/ui";
import { useDashboardStatsQuery, useLeadsQuery } from "@social-crm/api";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import "./dashboard-page.css";

export function DashboardPage() {
  const stats = useDashboardStatsQuery();
  const leads = useLeadsQuery({ offset: 0, limit: 50 });

  const classification = useMemo(() => {
    const all = leads.data?.data ?? [];
    const buckets = [
      { name: "Hot", value: all.filter((lead) => lead.leadClassification === "HOT").length, color: "#0284c7" },
      { name: "Warm", value: all.filter((lead) => lead.leadClassification === "WARM").length, color: "#f59e0b" },
      { name: "Cold", value: all.filter((lead) => !lead.leadClassification || lead.leadClassification === "COLD").length, color: "#94a3b8" }
    ];
    return buckets.filter((item) => item.value > 0);
  }, [leads.data]);

  const blockedLeads = useMemo(() => {
    const all = leads.data?.data ?? [];
    return all.filter((lead) => ["INTERVIEW_FAILED", "DISQUALIFIED"].includes(lead.status)).length;
  }, [leads.data]);

  const stageCounts = useMemo(() => {
    const all = leads.data?.data ?? [];
    return [
      { label: "New", value: all.filter((lead) => lead.status === "NEW").length },
      { label: "Contacted", value: all.filter((lead) => lead.status === "CONTACTED").length },
      { label: "Qualified", value: all.filter((lead) => lead.status === "QUALIFIED").length },
      { label: "Matching", value: all.filter((lead) => ["MATCHING", "MATCHED"].includes(lead.status)).length }
    ];
  }, [leads.data]);

  const urgentLeads = useMemo(() => {
    return [...(leads.data?.data ?? [])]
      .sort((a, b) => (b.leadScore ?? 0) - (a.leadScore ?? 0))
      .slice(0, 5);
  }, [leads.data]);

  const highScoreLeads = useMemo(() => {
    const all = leads.data?.data ?? [];
    return all.filter((lead) => (lead.leadScore ?? 0) >= 80).length;
  }, [leads.data]);

  const needsActionLeads = useMemo(() => {
    const all = leads.data?.data ?? [];
    return all.filter((lead) => ["CONTACTED", "QUALIFIED", "MATCHING"].includes(lead.status)).length;
  }, [leads.data]);

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-grid">
          <div>
            <div className="dashboard-hero-kicker">Overview</div>
            <h2>Track intake pressure, blocked candidates, and the next operator decision.</h2>
            <p>
              This view keeps the daily operating picture compact: team-level totals first, then the visible lead window that recruiters are actively working through.
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
                <div className="dashboard-hero-stat-label">Blocked / failed</div>
                <div className="dashboard-hero-stat-value">{blockedLeads}</div>
              </div>
            </div>
          </div>

          <aside className="dashboard-hero-panel">
            <div className="dashboard-hero-panel-title">Immediate focus</div>
            <div className="dashboard-hero-panel-list">
              <div className="dashboard-hero-panel-item">
                <div className="dashboard-hero-panel-name">High-score leads</div>
                <div className="dashboard-hero-panel-value">{highScoreLeads}</div>
              </div>
              <div className="dashboard-hero-panel-item">
                <div className="dashboard-hero-panel-name">Needs action</div>
                <div className="dashboard-hero-panel-value">{needsActionLeads}</div>
              </div>
              <div className="dashboard-hero-panel-item">
                <div className="dashboard-hero-panel-name">Current list window</div>
                <div className="dashboard-hero-panel-value">{leads.data?.total ?? 0}</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="dashboard-grid">
        <Panel title={<span className="dashboard-panel-title">Pipeline pressure</span> as any} subtitle={"Where the latest visible lead window is currently concentrated." as any}>
          <div className="dashboard-stage-grid">
            {stageCounts.map((item) => (
              <div key={item.label} className="dashboard-stage-card">
                <div className="dashboard-stage-label">{item.label}</div>
                <div className="dashboard-stage-value">{item.value}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={<span className="dashboard-panel-title">Lead temperature</span> as any} subtitle={"Classification distribution across the current query window." as any}>
          {classification.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={classification} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88}>
                    {classification.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No classification data yet" description="Lead scoring may still be populating, or the current list window has no scored leads." />
          )}
        </Panel>
      </div>

      <Panel title={<span className="dashboard-panel-title">Priority lead queue</span> as any} subtitle={"Highest visible lead scores in the current dashboard window." as any}>
        {urgentLeads.length ? (
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
              {urgentLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.fullName || "Unnamed lead"}</strong>
                    <div className="dashboard-cell-sub">{lead.region || "No region"} - {lead.phone || "No phone"}</div>
                  </td>
                  <td>
                    <Badge tone={["INTERVIEW_FAILED", "DISQUALIFIED"].includes(lead.status) ? "danger" : ["MATCHED", "INTERVIEW_PASSED", "CONTRACT_SIGNED"].includes(lead.status) ? "success" : "warning"}>
                      {lead.status}
                    </Badge>
                  </td>
                  <td>{lead.source}</td>
                  <td><strong>{lead.leadScore ?? "-"}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No leads loaded" description="The current window returned no leads, so there is no priority queue to display." />
        )}
      </Panel>
    </div>
  );
}
