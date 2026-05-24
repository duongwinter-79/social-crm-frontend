import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Panel,
  PaginationFooter,
  Select,
  Toolbar,
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
  const totalRecords = registerQuery.data?.total ?? 0;

  function openDetail(leadId?: string) {
    navigate(leadId ? `/applications/detail?leadId=${leadId}` : "/applications/detail");
  }

  return (
    <div className="space-y-6">
      <Toolbar compact className="border-slate-200/90">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {copy({ en: "Application register", vi: "Danh sách hồ sơ" })}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {copy({
                  en: "Filter candidates, then open a row to manage its file.",
                  vi: "Lọc ứng viên rồi mở từng dòng để quản lý hồ sơ.",
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Badge tone="neutral">
                {copy({ en: `${totalRecords} records`, vi: `${totalRecords} hồ sơ` })}
              </Badge>
              <Button onClick={() => openDetail()} className="shadow-[0_12px_24px_rgba(79,70,229,0.18)]">
                {copy({ en: "Upload file", vi: "Tải hồ sơ lên" })}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(220px,320px)_minmax(280px,1fr)]">
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
              <label className="mb-2 block text-sm font-medium text-slate-600">
                {copy({ en: "Search name / phone", vi: "Tìm tên / SĐT" })}
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => { setFilters((s) => ({ ...s, search: e.target.value })); setPage(0); }}
                placeholder={copy({ en: "Search candidate name or phone…", vi: "Tìm theo tên hoặc SĐT…" })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </div>
      </Toolbar>

      <Panel
        title={copy({ en: "Application files", vi: "Hồ sơ ứng tuyển" })}
        subtitle={copy({
          en: "Open a row to view, replace, download, or remove the candidate file.",
          vi: "Mở một dòng để xem, thay thế, tải xuống hoặc xoá hồ sơ.",
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
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <h3 className="text-base font-semibold text-slate-900">
              {copy({ en: "No records found", vi: "Không tìm thấy hồ sơ" })}
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              {copy({
                en: "No application files match your filters.",
                vi: "Không tìm thấy hồ sơ phù hợp với bộ lọc.",
              })}
            </p>
            <div className="mt-4">
              <Button onClick={() => openDetail()}>
                {copy({ en: "Upload file", vi: "Tải hồ sơ lên" })}
              </Button>
            </div>
          </div>
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
