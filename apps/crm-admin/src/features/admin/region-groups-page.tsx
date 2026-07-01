import { Link } from "react-router-dom";
import { Badge, InfoStrip, SectionHeader } from "@social-crm/ui";
import { useI18n } from "@/i18n";
import { RegionGroupsPanel } from "./region-groups-panel";

export function RegionGroupsPage() {
  const { copy } = useI18n();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Admin tool", vi: "Công cụ quản trị" })}
        title={copy({ en: "Region groups", vi: "Nhóm khu vực" })}
        description={copy({
          en: "Manage named province groups (e.g. \"Miền Trung\") used by orders to exclude candidates from a whole region, not just one province.",
          vi: "Quản lý các nhóm tỉnh/thành có tên gọi (vd. \"Miền Trung\") để đơn hàng loại trừ ứng viên theo cả một khu vực, không chỉ một tỉnh."
        })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {copy({
              en: "Group names are what operators see and type in an order's excluded-regions field. Provinces are picked from the verified taxonomy, so there's no risk of a typo silently matching nothing.",
              vi: "Tên nhóm là thứ nhân viên thấy và nhập vào ô loại trừ khu vực của đơn hàng. Tỉnh/thành được chọn từ danh sách đã xác minh nên không lo gõ sai mà không loại được ai."
            })}
          </span>
          <Link
            to="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {copy({ en: "Back to admin", vi: "Quay lại quản trị" })}
          </Link>
        </div>
      </InfoStrip>

      <div className="flex flex-wrap gap-2">
        <Badge tone="neutral">{copy({ en: "Route", vi: "Đường dẫn" })}: /region-groups</Badge>
      </div>

      <RegionGroupsPanel />
    </div>
  );
}
