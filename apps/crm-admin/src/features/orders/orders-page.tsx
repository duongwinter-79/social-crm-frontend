import { Badge, DataTable, EmptyState, SectionHeader } from "@social-crm/ui";
import { useOrdersQuery } from "@social-crm/api";

export function OrdersPage() {
  const orders = useOrdersQuery();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Demand"
        title="Orders catalog"
        description="A cleaner order list aligned to current backend coverage. Keep this read-focused until create and edit endpoints exist."
      />

      {(orders.data ?? []).length ? (
        <DataTable>
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-base font-semibold text-slate-900">Orders</div>
            <div className="mt-1 text-sm text-slate-500">Directly backed by the current orders endpoint.</div>
          </div>
          <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="px-5 pb-3 pt-4">Order</th>
                  <th className="pb-3 pr-4 pt-4">Region</th>
                  <th className="pb-3 pr-4 pt-4">Industry</th>
                  <th className="pb-3 pr-4 pt-4">Age</th>
                  <th className="pb-3 pr-4 pt-4">Gender</th>
                  <th className="pb-3 pr-5 pt-4">Experience</th>
                </tr>
              </thead>
              <tbody>
                {orders.data?.map((order) => (
                  <tr key={order.id} className="border-t border-slate-200 align-top transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4 pr-4">
                      <div className="font-medium text-slate-900">{order.name}</div>
                      <div className="mt-1 max-w-md text-xs leading-5 text-slate-500">{order.description || "No description provided"}</div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">{order.region || "Not set"}</td>
                    <td className="py-4 pr-4 text-slate-600">{order.industry || "Not set"}</td>
                    <td className="py-4 pr-4 text-slate-600">{order.ageRange ? `${order.ageRange.min}-${order.ageRange.max}` : "Not set"}</td>
                    <td className="py-4 pr-4"><Badge tone="accent">{order.genderRequired}</Badge></td>
                    <td className="py-4 pr-5">
                      <Badge tone={order.experienceRequired ? "warning" : "neutral"}>
                        {order.experienceRequired ? "Required" : "Open"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        </DataTable>
      ) : (
        <EmptyState title="No orders returned" description="The backend orders endpoint may be empty or unavailable in the current environment." />
      )}
    </div>
  );
}
