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
        title={copy({ en: "UI text — manage all", vi: "Chữ hiển thị — quản lý tất cả" })}
        description={copy({
          en: "Bulk view of every editable text key and its saved override. For everyday edits, use the “Edit text” toggle in the header to change wording directly on the screen where it appears.",
          vi: "Danh sách toàn bộ câu chữ có thể chỉnh và nội dung đã lưu. Để chỉnh hằng ngày, hãy dùng nút “Sửa chữ” trên thanh tiêu đề để sửa ngay trên màn hình có câu chữ đó."
        })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {copy({
              en: "Use this screen for search, bulk review, and cleaning up unknown/obsolete keys. In-context editing is the primary way to change wording.",
              vi: "Dùng màn hình này để tìm kiếm, xem hàng loạt và dọn các mã cũ/không xác định. Sửa trực tiếp trên màn hình là cách chính để đổi câu chữ."
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
