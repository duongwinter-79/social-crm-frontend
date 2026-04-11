import { Badge, Button, DescriptionList, Panel, SectionHeader, Toolbar, ToolbarActions } from "@social-crm/ui";
import { useCnvActionMutations, useCnvInfoQuery, useHealthQuery } from "@social-crm/api";

export function IntegrationsPage() {
  const health = useHealthQuery();
  const info = useCnvInfoQuery();
  const actions = useCnvActionMutations();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Integration control"
        title="Platform and CNV connectivity"
        description="Use these controls for operator-level verification and webhook lifecycle management. This workspace stays grounded in the backend actions that actually exist."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <TopStat label="Backend" value={health.data?.status ?? "Unknown"} tone={health.data?.status === "ok" ? "success" : "warning"} />
        <TopStat label="Token test" value={actions.testToken.data?.tokenPrefix ? "Ready" : "Pending"} tone={actions.testToken.data?.tokenPrefix ? "accent" : "neutral"} />
        <TopStat label="Webhook info" value={info.data?.result ? "Loaded" : "Pending"} />
        <TopStat label="Scope" value="CNV admin" tone="accent" />
      </div>

      <Toolbar compact className="border-slate-200/90">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <DescriptionList
            className="flex-1"
            columns={3}
            items={[
              { label: "Backend status", value: <Badge tone={health.data?.status === "ok" ? "success" : "warning"}>{health.data?.status ?? "Unknown"}</Badge> },
              { label: "CNV token check", value: actions.testToken.data?.tokenPrefix ? `Token ${actions.testToken.data.tokenPrefix}` : "Not tested yet" },
              { label: "Webhook info", value: info.data?.result ? "Loaded" : "Not loaded yet" }
            ]}
          />
          <ToolbarActions className="lg:justify-end">
            <Button onClick={() => actions.testToken.mutate()} disabled={actions.testToken.isPending}>
              {actions.testToken.isPending ? "Testing token..." : "Test token"}
            </Button>
            <Button variant="secondary" onClick={() => actions.register.mutate()} disabled={actions.register.isPending}>
              {actions.register.isPending ? "Registering..." : "Register webhook"}
            </Button>
            <Button variant="danger" onClick={() => actions.remove.mutate()} disabled={actions.remove.isPending}>
              {actions.remove.isPending ? "Removing..." : "Remove webhook"}
            </Button>
          </ToolbarActions>
        </div>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="space-y-6">
          <Panel title="Operator guidance" subtitle="Use this panel before taking webhook lifecycle actions.">
            <div className="space-y-3">
              <GuidanceRow title="Verify backend health first" body="If health is unstable, treat webhook lifecycle actions as unsafe until the API is healthy again." />
              <GuidanceRow title="Test token before registration" body="Token verification should happen before registering or re-registering a webhook to avoid noisy setup failures." />
              <GuidanceRow title="Do not simulate broader integrations" body="This workspace covers the CNV admin path only. Other integrations should remain gated until the backend exposes them." />
            </div>
          </Panel>

          <Panel title="Backend health" subtitle="Public health endpoint status from `/api/health`.">
            <pre className="mt-4 overflow-auto rounded-[22px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(health.data ?? {}, null, 2)}</pre>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="CNV webhook controls" subtitle="Admin actions for CNV token verification and webhook registration lifecycle.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Latest token check</div>
                <div className="mt-3 text-sm leading-7 text-slate-700">
                  {actions.testToken.data ? `Token prefix: ${actions.testToken.data.tokenPrefix ?? "Unavailable"}` : "Run a token test to confirm CNV auth setup."}
                </div>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Webhook registration info</div>
                  <Badge tone="accent">CNV</Badge>
                </div>
                <pre className="overflow-auto rounded-[18px] border border-slate-200 bg-white p-3 text-xs text-slate-600">{JSON.stringify(info.data?.result ?? {}, null, 2)}</pre>
              </div>
            </div>
          </Panel>

          <Panel title="Action outcomes" subtitle="Latest mutation feedback from the available CNV admin controls.">
            <div className="grid gap-4 md:grid-cols-3">
              <MutationCard label="Token test" state={actions.testToken.isSuccess ? "Completed" : actions.testToken.isPending ? "Running" : "Idle"} />
              <MutationCard label="Register" state={actions.register.isSuccess ? "Completed" : actions.register.isPending ? "Running" : "Idle"} />
              <MutationCard label="Remove" state={actions.remove.isSuccess ? "Completed" : actions.remove.isPending ? "Running" : "Idle"} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function TopStat(props: { label: string; value: string | number; tone?: "neutral" | "accent" | "success" | "warning" }) {
  const accentClass =
    props.tone === "accent"
      ? "border-indigo-200 bg-indigo-50"
      : props.tone === "success"
        ? "border-emerald-200 bg-emerald-50"
        : props.tone === "warning"
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-[22px] border px-4 py-4 shadow-[0_14px_26px_rgba(15,23,42,0.04)] ${accentClass}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{props.value}</div>
    </div>
  );
}

function GuidanceRow(props: { title: string; body: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-sm font-semibold text-slate-800">{props.title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-600">{props.body}</div>
    </div>
  );
}

function MutationCard(props: { label: string; state: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{props.state}</div>
    </div>
  );
}
