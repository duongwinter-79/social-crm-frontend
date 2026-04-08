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
        description="Use these controls for operator-level verification and webhook lifecycle management. This page avoids pretending there is a broader integration layer than the backend exposes."
      />

      <Toolbar compact>
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

      <div className="grid gap-4 xl:grid-cols-[0.65fr_1.35fr]">
        <Panel title="Backend health" subtitle="Public health endpoint status from /api/health.">
          <pre className="mt-4 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(health.data ?? {}, null, 2)}</pre>
        </Panel>

        <Panel title="CNV webhook controls" subtitle="Admin actions for CNV token verification and webhook registration lifecycle.">
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Latest token check</div>
              <div className="mt-3 text-sm text-slate-700">
                {actions.testToken.data ? `Token prefix: ${actions.testToken.data.tokenPrefix ?? "Unavailable"}` : "Run a token test to confirm CNV auth setup."}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="text-sm text-slate-500">Current webhook registration info</div>
                <Badge tone="accent">CNV</Badge>
              </div>
              <pre className="overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">{JSON.stringify(info.data?.result ?? {}, null, 2)}</pre>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
