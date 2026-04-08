import { useHealthQuery, capabilityRegistry } from "@social-crm/api";

export function CandidatePortalHome() {
  const health = useHealthQuery();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)]">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.14),_transparent_28%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-16">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-600">Candidate Portal</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              A separate mobile-first surface for candidate progress and self-service.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              This portal is intentionally separate from the staff CRM. It already integrates with the backend health endpoint, while external candidate auth and workflow APIs remain a planned next step.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatusTile
            label="Backend connection"
            value={health.data?.status === "ok" ? "Live" : "Pending"}
            description={health.data?.status === "ok" ? "Public health endpoint is reachable." : "Waiting for backend or local env."}
          />
          <StatusTile
            label="Portal auth"
            value="Planned"
            description="Candidate-specific auth should not reuse staff JWT assumptions."
          />
          <StatusTile
            label="Self-service APIs"
            value={capabilityRegistry.candidatePortal.enabled ? "Ready" : "Partial"}
            description={capabilityRegistry.candidatePortal.reason ?? "Portal APIs available."}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 md:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "My status",
              body: "Show application stage, upcoming milestones, and decision checkpoints once external-facing recruitment status endpoints are exposed."
            },
            {
              title: "My documents",
              body: "Add document checklist, upload initiation, and review feedback only after a candidate-safe document API exists."
            },
            {
              title: "My profile",
              body: "Support profile completion and corrections without exposing internal lead-management actions."
            },
            {
              title: "Support",
              body: "Give candidates a clear escalation path for missing steps, interview updates, or document requests."
            }
          ].map((item) => (
            <article key={item.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-[1.75rem] bg-slate-950 px-6 py-6 text-slate-200">
          <div className="text-xs uppercase tracking-[0.25em] text-emerald-300">Current backend integration</div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            The portal currently integrates with backend health so the surface is not a static mock. It deliberately does not call internal CRM endpoints such as leads, orders, or CNV admin actions, because those belong to the staff application and the auth model is different.
          </p>
          <pre className="mt-4 overflow-auto rounded-2xl bg-slate-900/70 p-4 text-xs text-slate-400">{JSON.stringify(health.data ?? {}, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}

function StatusTile(props: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{props.label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{props.value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{props.description}</div>
    </div>
  );
}
