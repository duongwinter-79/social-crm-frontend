import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  EmptyState,
  FieldGroup,
  InfoCard,
  Input,
  PaginationFooter,
  Panel,
  SectionHeader,
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import {
  apiClient,
  triggerBlobDownload,
  useCandidateByLeadQuery,
  useFormStandardRegisterQuery,
  useUploadFormStandardDocumentMutation
} from "@social-crm/api";
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
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState(() => ({
    status: "",
    search: searchParams.get("search") ?? ""
  }));
  const [page, setPage] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState<string>(searchParams.get("leadId") ?? "");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileActionError, setFileActionError] = useState("");

  const registerQuery = useFormStandardRegisterQuery({
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    status: filters.status || undefined,
    search: filters.search || undefined
  });

  const candidateByLeadQuery = useCandidateByLeadQuery(selectedLeadId || undefined);
  const resolvedCandidateId = candidateByLeadQuery.data?.id;
  const uploadFormStandard = useUploadFormStandardDocumentMutation();

  const rows = registerQuery.data?.data ?? [];
  const selectedRow = rows.find((r) => r.lead.id === selectedLeadId) ?? null;

  async function openFile(documentId: string, mode: "file" | "download") {
    setFileActionError("");
    try {
      const { blob, filename } = await apiClient.getDocumentFile(documentId, mode);
      if (mode === "download") {
        triggerBlobDownload(blob, filename);
        return;
      }
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch {
      setFileActionError(
        copy({ en: "Could not open this file. Check whether it was uploaded through the CRM.", vi: "Không mở được file này. Kiểm tra file đã được tải lên qua CRM chưa." })
      );
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Applications", vi: "Hồ sơ ứng tuyển" })}
        title={copy({ en: "Worker files", vi: "Danh sách hồ sơ lao động" })}
        description={copy({
          en: "View standard worker forms, matched orders, and upload files for each candidate.",
          vi: "Xem form lao động chuẩn, đơn hàng đã ghép và tải file cho từng ứng viên."
        })}
      />

      <Toolbar compact className="border-slate-200/90">
        <FieldGroup columns={3}>
          <Select
            label={copy({ en: "Status", vi: "Trạng thái" })}
            value={filters.status}
            onChange={(e) => { setFilters((s) => ({ ...s, status: e.target.value })); setPage(0); }}
          >
            <option value="">{copy({ en: "All statuses", vi: "Tất cả trạng thái" })}</option>
            {DOC_STATUSES.filter(Boolean).map((value) => (
              <option key={value} value={value}>{formatDocumentStatus(value)}</option>
            ))}
          </Select>
          <Input
            label={copy({ en: "Search name / phone / code", vi: "Tìm tên / SĐT / mã hồ sơ" })}
            value={filters.search}
            onChange={(e) => { setFilters((s) => ({ ...s, search: e.target.value })); setPage(0); }}
          />
        </FieldGroup>
        <ToolbarActions>
          <Badge tone="neutral">
            {copy({ en: `${registerQuery.data?.total ?? 0} records`, vi: `${registerQuery.data?.total ?? 0} hồ sơ` })}
          </Badge>
        </ToolbarActions>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title={copy({ en: "Standard form register", vi: "Danh sách form chuẩn" })}
          subtitle={copy({
            en: "Each row shows the worker form upload status and the latest matched order.",
            vi: "Mỗi dòng hiển thị trạng thái form lao động và đơn hàng ghép gần nhất."
          })}
        >
          {rows.length ? (
            <div className="max-h-[calc(100vh-26rem)] overflow-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3">{copy({ en: "Candidate", vi: "Ứng viên" })}</th>
                    <th className="px-3 py-3">{copy({ en: "Phone", vi: "Số điện thoại" })}</th>
                    <th className="px-3 py-3">{copy({ en: "Matched order", vi: "Đơn đang ghép" })}</th>
                    <th className="px-3 py-3">{copy({ en: "Form", vi: "Form" })}</th>
                    <th className="px-3 py-3">{copy({ en: "Actions", vi: "Thao tác" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const active = row.lead.id === selectedLeadId;
                    return (
                      <tr
                        key={row.documentId}
                        className={`cursor-pointer border-t border-slate-100 align-top transition-colors ${active ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}
                        onClick={() => setSelectedLeadId(row.lead.id)}
                      >
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            className="font-medium text-indigo-700 hover:text-indigo-500"
                            onClick={() => { navigate(`/leads/${row.lead.id}`); }}
                          >
                            {leadLabel(row)}
                          </button>
                          <div className="mt-1 text-xs text-slate-500">
                            {row.candidate?.code ?? copy({ en: "No candidate code", vi: "Chưa có mã hồ sơ" })}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {row.lead.phone ?? <span className="text-slate-400">{copy({ en: "Missing", vi: "Thiếu" })}</span>}
                        </td>
                        <td className="px-3 py-3">
                          {row.order ? (
                            <>
                              <div className="font-medium text-slate-900">{row.order.name}</div>
                              <div className="mt-0.5 text-xs text-slate-500">{[row.order.region, row.order.industry].filter(Boolean).join(" · ")}</div>
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
                          <Badge tone={toneForDocStatus(row.documentStatus)}>{formatDocumentStatus(row.documentStatus)}</Badge>
                          <div className="mt-1">
                            {row.hasFile
                              ? <Badge tone="success">{copy({ en: "File uploaded", vi: "Có file" })}</Badge>
                              : <Badge tone="warning">{copy({ en: "No file", vi: "Chưa có file" })}</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!row.hasFile}
                              onClick={() => { void openFile(row.documentId, "file"); }}
                            >
                              {copy({ en: "Open", vi: "Mở" })}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!row.hasFile}
                              onClick={() => { void openFile(row.documentId, "download"); }}
                            >
                              {copy({ en: "Download", vi: "Tải" })}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={copy({ en: "No records found", vi: "Không tìm thấy hồ sơ" })}
              description={copy({
                en: "Standard forms appear here once uploaded. Use the upload panel on the right to add one.",
                vi: "Form chuẩn sẽ hiển thị sau khi được tải lên. Sử dụng khung bên phải để tải form."
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

        <div className="space-y-6">
          <Panel
            title={copy({ en: "Upload standard form", vi: "Tải form chuẩn" })}
            subtitle={copy({
              en: "Select a row to load context, then pick a file and upload. The candidate automatically advances to matching.",
              vi: "Chọn một dòng để tải thông tin, sau đó chọn file và tải lên. Hệ thống tự chuyển ứng viên sang bước ghép đơn."
            })}
          >
            {selectedRow ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="font-medium text-slate-900">{leadLabel(selectedRow)}</div>
                  <div className="mt-1 text-slate-500">
                    {selectedRow.lead.phone ?? copy({ en: "No phone", vi: "Chưa có SĐT" })}
                    {selectedRow.candidate?.code ? ` · ${selectedRow.candidate.code}` : ""}
                  </div>
                  {selectedRow.order ? (
                    <div className="mt-1 text-slate-500">{selectedRow.order.name}</div>
                  ) : null}
                </div>

                {selectedRow.hasFile ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {copy({ en: "Current file", vi: "File hiện tại" })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => void openFile(selectedRow.documentId, "file")}>
                        {copy({ en: "Open file", vi: "Mở file" })}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => void openFile(selectedRow.documentId, "download")}>
                        {copy({ en: "Download", vi: "Tải xuống" })}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {fileActionError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{fileActionError}</div>
                ) : null}

                <div className="border-t border-slate-100 pt-4">
                  <label className="block text-sm font-medium text-slate-700">
                    {copy({ en: selectedRow.hasFile ? "Replace file" : "Upload file", vi: selectedRow.hasFile ? "Thay thế file" : "Tải file lên" })}
                    <input
                      type="file"
                      accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                      onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                      className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </label>
                  {uploadFile ? (
                    <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                      {uploadFile.name} · {(uploadFile.size / 1024).toFixed(0)} KB
                    </div>
                  ) : null}
                  <div className="mt-3">
                    <Button
                      onClick={() => {
                        if (!uploadFile) return;
                        uploadFormStandard.mutate(
                          { leadId: selectedRow.lead.id, candidateId: resolvedCandidateId, status: "verified", file: uploadFile },
                          {
                            onSuccess: () => {
                              setUploadFile(null);
                              registerQuery.refetch();
                            }
                          }
                        );
                      }}
                      disabled={uploadFormStandard.isPending || !uploadFile}
                    >
                      {uploadFormStandard.isPending
                        ? copy({ en: "Uploading...", vi: "Đang tải lên..." })
                        : copy({ en: "Upload form", vi: "Tải form" })}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title={copy({ en: "No candidate selected", vi: "Chưa chọn ứng viên" })}
                description={copy({
                  en: "Click a row in the table to select a candidate, then upload their standard form here.",
                  vi: "Nhấn vào một dòng trong bảng để chọn ứng viên, sau đó tải form chuẩn lên tại đây."
                })}
              />
            )}
          </Panel>

          {selectedLeadId && !selectedRow ? (
            <Panel
              title={copy({ en: "Upload for new candidate", vi: "Tải form cho ứng viên mới" })}
              subtitle={copy({
                en: "This lead has no standard form yet. Upload one to create their record.",
                vi: "Ứng viên này chưa có form chuẩn. Tải lên để tạo bản ghi."
              })}
            >
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {copy({ en: `Lead ID: ${selectedLeadId}`, vi: `Mã ứng viên: ${selectedLeadId}` })}
                  {resolvedCandidateId ? ` · ${resolvedCandidateId}` : ""}
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  {copy({ en: "Form file", vi: "File form" })}
                  <input
                    type="file"
                    accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                </label>
                {uploadFile ? (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                    {uploadFile.name} · {(uploadFile.size / 1024).toFixed(0)} KB
                  </div>
                ) : null}
                <Button
                  onClick={() => {
                    if (!uploadFile) return;
                    uploadFormStandard.mutate(
                      { leadId: selectedLeadId, candidateId: resolvedCandidateId, status: "verified", file: uploadFile },
                      {
                        onSuccess: () => {
                          setUploadFile(null);
                          registerQuery.refetch();
                        }
                      }
                    );
                  }}
                  disabled={uploadFormStandard.isPending || !uploadFile}
                >
                  {uploadFormStandard.isPending
                    ? copy({ en: "Uploading...", vi: "Đang tải lên..." })
                    : copy({ en: "Upload form", vi: "Tải form" })}
                </Button>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
