import { Badge, EmptyState, Panel, SectionHeader, Toolbar } from "@social-crm/ui";

type CapabilityPageProps = {
  title: string;
  description: string;
  readinessLabel?: string;
  surfaces?: string[];
  blockers?: string[];
  nextSteps?: string[];
};

export function CapabilityPage(props: CapabilityPageProps) {
  const surfaces = props.surfaces ?? [];
  const blockers = props.blockers ?? [];
  const nextSteps = props.nextSteps ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Capability-gated"
        title={props.title}
        description="This workspace already follows the same operational shell as active CRM modules, but its actions stay gated until the backend exposes the required endpoints."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <GateStat label="Module state" value={props.readinessLabel ?? "Backend incomplete"} tone="warning" />
        <GateStat label="Planned surfaces" value={surfaces.length || "-"} />
        <GateStat label="API blockers" value={blockers.length || "-"} tone="danger" />
        <GateStat label="Next steps" value={nextSteps.length || "-"} tone="accent" />
      </div>

      <Toolbar className="border-slate-200/90">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>{props.description}</span>
          <Badge tone="warning">{props.readinessLabel ?? "Backend incomplete"}</Badge>
        </div>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="space-y-6">
          <Panel
            title="Planned workspace surfaces"
            subtitle="These are the operator-facing sections this module should eventually expose once the backend is ready."
          >
            {surfaces.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {surfaces.map((surface) => (
                  <div key={surface} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-sm font-semibold text-slate-800">{surface}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-500">Kept visible in the roadmap shell, but intentionally non-interactive today.</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No surface map yet" description="Add the intended operator surfaces for this module before implementing its first backend-backed actions." />
            )}
          </Panel>

          <Panel
            title="Current backend blockers"
            subtitle="The UI is intentionally stopped at this boundary to avoid inventing unsupported flows."
          >
            {blockers.length ? (
              <div className="space-y-3">
                {blockers.map((blocker) => (
                  <div key={blocker} className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-800">
                    {blocker}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No blockers listed" description="This module needs explicit backend constraints documented before it should be opened for implementation." />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Recommended next implementation steps"
            subtitle="Use this checklist when the backend is expanded and this module is ready to move beyond a gated shell."
          >
            {nextSteps.length ? (
              <div className="space-y-3">
                {nextSteps.map((step, index) => (
                  <div key={step} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="text-sm leading-7 text-slate-600">{step}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No next steps defined" description="Document the activation path for this module before attaching new UI flows to it." />
            )}
          </Panel>

          <Panel
            title="Activation rule"
            subtitle="This shell should flip into a live workbench only when the backend can support real operator actions end-to-end."
          >
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
              Keep the shell visible for navigation completeness, but do not add fake tables, simulations, or optimistic controls here. This area should graduate directly from roadmap shell to backend-backed work surface.
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function GateStat(props: { label: string; value: string | number; tone?: "neutral" | "accent" | "warning" | "danger" }) {
  const accentClass =
    props.tone === "accent"
      ? "border-indigo-200 bg-indigo-50"
      : props.tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : props.tone === "danger"
          ? "border-rose-200 bg-rose-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-[22px] border px-4 py-4 shadow-[0_14px_26px_rgba(15,23,42,0.04)] ${accentClass}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{props.value}</div>
    </div>
  );
}
