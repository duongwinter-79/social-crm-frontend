import { EmptyState, Panel, SectionHeader } from "@social-crm/ui";

export function CapabilityPage(props: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Capability-gated" title={props.title} description="This area should become interactive only after the backend exposes the necessary operational endpoints." />
      <Panel title={props.title} subtitle="Capability-gated module">
        <EmptyState title="Available soon" description={props.description} />
      </Panel>
    </div>
  );
}
