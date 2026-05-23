import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  EmptyState,
  FieldGroup,
  Panel,
  PaginationFooter,
  SectionHeader,
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import { useFormStandardRegisterQuery } from "@social-crm/api";
import { useI18n } from "@/i18n";
import type { FormStandardRegisterRow } from "@social-crm/api";

const DOC_STATUSES = ["", "pending", "submitted", "verified", "rejected", "expired"] as const;
const PAGE_SIZE = 25;

function toneForDocStatus(status: string) {
  if (status === "verified") return "success" as const;
  if (status === "rejected" || status === "expired") return "danger" as const;
  if (status === "submitted") return "warning" as const;
  return "neutral" as const;
}

function leadLabel(row: FormStandardRegisterRow) {
  return row.lead.fullName || row.lead.displayName || row.lead.phone || row.lead.id;
}

export function ApplicationsPage() {
  const { copy, formatDocumentStatus, formatApplicationStatus } = useI18n();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ status: "", search: "" });
  const [page, setPage] = useState(0);

  const registerQuery = useFormStandardRegisterQuery({
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    status: filters.status || undefined,
    search: filters.search || undefined,
  });

  const rows = registerQuery.data?.data ?? [];

  function openDetail(leadId?: string) {
    navigate(leadId ? `/applications/detail?leadId=${leadId}` : "/applications/detail");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Applications", vi: "Hồ sơ ứng tuyển" })}
        title={copy({ en: "Hồ sơ ứng tuyển", vi: "Hồ sơ ứng tuyển" })}
        description={copy({
          en: "Browse all worker application files and matched orders.",
          vi: "Xem danh sách hồ sơ ứng tuyển và đơn hàng đã ghép.",
        })}
      />

      <Toolbar compact className="border-slate-200/90">
        <FieldGroup columns={2}>
          <Select
            label={copy({ en: "Status", vi: "Trạng thái" })}
            value={filters.status}
            onChange={(e) => { setFilters((s) => ({ ...s, status: e.target.value })); setPage(0); }}
          >
            <option value="">{copy({ en: "All statuses", vi: "Tất cả trạng thái" })}</option>
            {DOC_STATUSES.filter(Boolean).map((v) => (
              <option key={v} value={v}>{formatDocumentStatus(v)}</option>
            ))}
          </Select>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {copy({ en: "Search name / phone", vi: "Tìm tên / SĐT" })}
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => { setFilters((s) => ({ ...s, search: e.target.value })); setPage(0); }}
              placeholder={copy({ en: "Search…", vi: "Tìm kiếm…" })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </FieldGroup>
        <ToolbarActions>
          <Badge tone="neutral">
            {copy({ en: `${registerQuery.data?.total ?? 0} records`, vi: `${registerQuery.data?.total ?? 0} hồ sơ` })}
          </Badge>
          <Button onClick={() => openDetail()}>
            {copy({ en: "Upload form", vi: "Tải hồ sơ lên" })}
          </Button>
        </ToolbarActions>
      </Toolbar>

      <Panel
        title={copy({ en: "Application file register", vi: "Danh sách hồ sơ ứng tuyển" })}
        subtitle={copy({
          en: "Click a row to view, upload, or manage the application file for that candidate.",
          vi: "Nhấn vào một dòng để xem, tải lên hoặc quản lý hồ sơ của ứng viên.",
        })}
      >
        {rows.length ? (
          <div className="max-h-[calc(100vh-24rem)] overflow-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">{copy({ en: "Candidate", vi: "Ứng viên" })}</th>
                  <th className="px-3 py-3">{copy({ en: "Phone", vi: "Số điện thoại" })}</th>
                  <th className="px-3 py-3">{copy({ en: "Matched order", vi: "Đơn đang ghép" })}</th>
                  <th className="px-3 py-3">{copy({ en: "File status", vi: "Trạng thái hồ sơ" })}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.documentId}
                    className="cursor-pointer border-t border-slate-100 align-top transition-colors hover:bg-slate-50"
                    onClick={() => openDetail(row.lead.id)}
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium text-indigo-700">{leadLabel(row)}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.candidate?.code ?? copy({ en: "No candidate code", vi: "Chưa có mã hồ sơ" })}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {row.lead.phone ?? (
                        <span className="text-slate-400">{copy({ en: "Missing", vi: "Thiếu" })}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {row.order ? (
                        <>
                          <div className="font-medium text-slate-900">{row.order.name}</div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {[row.order.region, row.order.industry].filter(Boolean).join(" · ")}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400">{copy({ en: "No order yet", vi: "Chưa ghép đơn" })}</span>
                      )}
                      {row.application ? (
                        <div className="mt-1">
                          <Badge tone="warning">{formatApplicationStatus(row.application.status)}</Badge>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={toneForDocStatus(row.documentStatus)}>
                        {formatDocumentStatus(row.documentStatus)}
                      </Badge>
                      <div className="mt-1">
                        {row.hasFile
                          ? <Badge tone="success">{copy({ en: "File uploaded", vi: "Có file" })}</Badge>
                          : <Badge tone="warning">{copy({ en: "No file", vi: "Chưa có file" })}</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={copy({ en: "No records found", vi: "Không tìm thấy hồ sơ" })}
            description={copy({
              en: "No application files match your filters. Click \"Upload form\" to add one.",
              vi: "Không tìm thấy hồ sơ phù hợp. Nhấn \"Tải hồ sơ lên\" để thêm mới.",
            })}
          />
        )}
        <PaginationFooter
          page={page}
          pageSize={PAGE_SIZE}
          total={registerQuery.data?.total ?? 0}
          isFetching={registerQuery.isFetching}
          itemLabel={copy({ en: "records", vi: "hồ sơ" })}
          pageLabel={copy({ en: "Page", vi: "Trang" })}
          previousLabel={copy({ en: "Previous", vi: "Trước" })}
          nextLabel={copy({ en: "Next", vi: "Sau" })}
          onPrevious={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => p + 1)}
          className="mt-4 border-slate-100 px-0 pb-0 pt-4"
        />
      </Panel>
    </div>
  );
}
