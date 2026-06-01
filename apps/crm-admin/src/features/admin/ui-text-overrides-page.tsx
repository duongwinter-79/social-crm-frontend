import { Link } from "react-router-dom";
import { Badge, InfoStrip, SectionHeader } from "@social-crm/ui";
import { useI18n } from "@/i18n";
import { UiTextAdminPanel } from "./ui-text-admin-panel";

export function UiTextOverridesPage() {
  const { copy } = useI18n();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Admin tool", vi: "Công cụ quản trị" })}
        title={copy({ en: "UI text overrides", vi: "Tùy chỉnh chữ hiển thị" })}
        description={copy({
          en: "Review approved editable text, preview draft wording on the affected CRM screen, then save the override when it is ready.",
          vi: "Xem các câu chữ được phép chỉnh, xem thử bản nháp trên màn hình CRM liên quan, rồi lưu khi nội dung đã ổn."
        })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {copy({
              en: "This screen is separate from account administration so copy changes can be reviewed in context.",
              vi: "Màn hình này được tách khỏi trang tài khoản để việc chỉnh câu chữ được xem xét đúng ngữ cảnh."
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
        <Badge tone="neutral">{copy({ en: "Route", vi: "Đường dẫn" })}: /ui-text-overrides</Badge>
        <Badge tone="warning">{copy({ en: "Preview before saving", vi: "Xem thử trước khi lưu" })}</Badge>
      </div>

      <UiTextAdminPanel />
    </div>
  );
}
