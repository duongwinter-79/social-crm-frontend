import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import {
  apiClient,
  useCandidateByLeadQuery,
  useFormStandardRegisterQuery,
  useUnlinkFormStandardMutation,
  useUploadFormStandardDocumentMutation,
  useOpenEditSessionMutation
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import type { FormStandardRegisterRow } from "@social-crm/api";
import { LeadPicker } from "@/components/lead-picker";
import { EditSessionBanner } from "@/components/edit-session-banner";

const DOC_STATUSES = ["", "pending", "submitted", "verified", "rejected", "expired"] as const;
const PAGE_SIZE = 25;

/** Derive the lower-cased file extension from a storage key like
 *  "form-standard/doc-id/1700000000-uuid-name.docx" */
function fileExtension(fileUrl?: string | null): string {
  if (!fileUrl) return "";
  const lastDot = fileUrl.lastIndexOf(".");
  return lastDot >= 0 ? fileUrl.slice(lastDot).toLowerCase() : "";
}

function FileActions({
  documentId,
  fileUrl,
  openFile,
  onGoogleEdit,
  editSessionActive,
  openEditPending,
  copy,
}: {
  documentId: string;
  fileUrl?: string | null;
  openFile: (id: string, mode: "preview" | "download") => void | Promise<void>;
  onGoogleEdit: (id: string) => void;
  editSessionActive: boolean;
  openEditPending: boolean;
  copy: (t: { en: string; vi: string }) => string;
}) {
  const ext = fileExtension(fileUrl);
  const isWord = ext === ".docx" || ext === ".doc";

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => openFile(documentId, "preview")}>
        {copy({ en: "View", vi: "Xem" })}
      </Button>

      {isWord ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={openEditPending || editSessionActive}
          onClick={() => onGoogleEdit(documentId)}
        >
          {openEditPending
            ? copy({ en: "Opening…", vi: "Đang mở…" })
            : copy({ en: "Edit in Google Docs", vi: "Chỉnh sửa trong Google Docs" })}
        </Button>
      ) : null}

      <Button variant="secondary" size="sm" onClick={() => openFile(documentId, "download")}>
        {copy({ en: "Download", vi: "Tải xuống" })}
      </Button>
    </div>
  );
}

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
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [editSession, setEditSession] = useState<{
    documentId: string; sessionId: string; editUrl: string;
  } | null>(() => {
    try {
      const raw = localStorage.getItem("crm-app-edit-session");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const openEditSession = useOpenEditSessionMutation();

  const registerQuery = useFormStandardRegisterQuery({
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    status: filters.status || undefined,
    search: filters.search || undefined
  });

  const candidateByLeadQuery = useCandidateByLeadQuery(selectedLeadId || undefined);
  const resolvedCandidateId = candidateByLeadQuery.data?.id;
  const uploadFormStandard = useUploadFormStandardDocumentMutation();
  const unlinkFormStandard = useUnlinkFormStandardMutation();

  const rows = registerQuery.data?.data ?? [];
  const selectedRow = rows.find((r) => r.lead.id === selectedLeadId) ?? null;

  async function openFile(documentId: string, mode: "preview" | "download") {
    setFileActionError("");
    try {
      const { url, filename, isObjectUrl } = await apiClient.getDocumentUrl(documentId, mode === "download");

      if (mode === "download") {
        if (isObjectUrl) {
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        return;
      }

      // Preview — open in new tab
      window.open(url, "_blank", "noopener,noreferrer");
      if (isObjectUrl) window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = status ? ` (HTTP ${status})` : "";
      console.error("[openFile] error:", err);
      setFileActionError(
        copy({ en: `Could not open this file${detail}. Check whether it was uploaded through the CRM.`, vi: `Không mở được file này${detail}. Kiểm tra file đã được tải lên qua CRM chưa.` })
      );
    }
  }

  function openGoogleEdit(documentId: string) {
    openEditSession.mutate(documentId, {
      onSuccess: ({ sessionId, editUrl, filename }) => {
        const session = { documentId, sessionId, editUrl };
        setEditSession(session);
        localStorage.setItem("crm-app-edit-session", JSON.stringify(session));
        window.open(editUrl, "_blank", "noopener,noreferrer");
      },
      onError: () => {
        setFileActionError(
          copy({ en: "Could not open Google Docs. Check Drive configuration.", vi: "Không mở được Google Docs. Kiểm tra cấu hình Drive." })
        );
      },
    });
  }

  function clearEditSession() {
    setEditSession(null);
    localStorage.removeItem("crm-app-edit-session");
  }

  function handleUnlink() {
    if (!selectedLeadId) return;
    unlinkFormStandard.mutate(selectedLeadId, {
      onSuccess: () => {
        setConfirmUnlink(false);
        setUploadFile(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Applications", vi: "Hồ sơ ứng tuyển" })}
        title={copy({ en: "Hồ sơ ứng tuyển", vi: "Hồ sơ ứng tuyển" })}
        description={copy({
          en: "Manage worker application files, matched orders, and upload documents for each candidate.",
          vi: "Quản lý hồ sơ ứng tuyển, đơn hàng đã ghép và tải file cho từng ứng viên."
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {copy({ en: "Search name / phone", vi: "Tìm tên / SĐT" })}
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => { setFilters((s) => ({ ...s, search: e.target.value })); setPage(0); }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <LeadPicker
            label={copy({ en: "Jump to candidate", vi: "Chọn ứng viên" })}
            value={selectedLeadId}
            onChange={(id) => { setSelectedLeadId(id); setConfirmUnlink(false); setUploadFile(null); }}
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
          title={copy({ en: "Application file register", vi: "Danh sách hồ sơ ứng tuyển" })}
          subtitle={copy({
            en: "Each row shows the application file upload status and the latest matched order.",
            vi: "Mỗi dòng hiển thị trạng thái hồ sơ ứng tuyển và đơn hàng ghép gần nhất."
          })}
        >
          {rows.length ? (
            <div className="max-h-[calc(100vh-26rem)] overflow-auto">
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
                  {rows.map((row) => {
                    const active = row.lead.id === selectedLeadId;
                    return (
                      <tr
                        key={row.documentId}
                        className={`cursor-pointer border-t border-slate-100 align-top transition-colors ${active ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}
                        onClick={() => { setSelectedLeadId(row.lead.id); setConfirmUnlink(false); setUploadFile(null); }}
                      >
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            className="font-medium text-indigo-700 hover:text-indigo-500"
                            onClick={(e) => { e.stopPropagation(); navigate(`/leads/${row.lead.id}`); }}
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
                en: "Application files appear here once uploaded. Select a candidate on the right to upload.",
                vi: "Hồ sơ ứng tuyển sẽ hiển thị sau khi được tải lên. Chọn ứng viên bên phải để tải lên."
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

        {/* Right panel */}
        <div className="space-y-6">
          <Panel
            title={copy({ en: "Application file", vi: "Hồ sơ ứng tuyển" })}
            subtitle={copy({
              en: "Select a row or search for a candidate to manage their application file.",
              vi: "Chọn một dòng hoặc tìm ứng viên để quản lý hồ sơ ứng tuyển."
            })}
          >
            {selectedRow ? (
              <div className="space-y-4">
                {/* Candidate summary */}
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

                {/* Edit profile fields */}
                <div className="border-t border-slate-100 pt-3">
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/applications/${selectedRow.lead.id}/edit`)}
                  >
                    {copy({ en: "Edit application fields →", vi: "Chỉnh sửa thông tin hồ sơ →" })}
                  </Button>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {copy({
                      en: "Opens the form editor to view and confirm all profile fields.",
                      vi: "Mở màn hình chỉnh sửa để xem và xác nhận tất cả các trường hồ sơ."
                    })}
                  </p>
                </div>

                {/* Current file actions */}
                {selectedRow.hasFile ? (
                  <div className="space-y-2">
                    <EditSessionBanner
                      session={editSession?.documentId === selectedRow.documentId ? editSession : null}
                      onExpired={clearEditSession}
                      onClosed={clearEditSession}
                    />
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {copy({ en: "Current file", vi: "File hiện tại" })}
                    </div>
                    <FileActions
                      documentId={selectedRow.documentId}
                      fileUrl={selectedRow.fileUrl}
                      openFile={openFile}
                      onGoogleEdit={openGoogleEdit}
                      editSessionActive={editSession?.documentId === selectedRow.documentId}
                      openEditPending={openEditSession.isPending}
                      copy={copy}
                    />
                  </div>
                ) : null}

                {fileActionError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{fileActionError}</div>
                ) : null}

                {/* Upload / Replace */}
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
                        : copy({ en: "Upload application file", vi: "Tải hồ sơ ứng tuyển" })}
                    </Button>
                  </div>
                </div>

                {/* Unlink */}
                {selectedRow.hasFile ? (
                  <div className="border-t border-slate-100 pt-4">
                    {confirmUnlink ? (
                      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                        <p className="text-sm text-rose-800">
                          {copy({
                            en: "This will permanently delete the uploaded file and remove the application record. This cannot be undone.",
                            vi: "Thao tác này sẽ xoá vĩnh viễn file đã tải lên và huỷ hồ sơ ứng tuyển. Không thể hoàn tác."
                          })}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={handleUnlink}
                            disabled={unlinkFormStandard.isPending}
                          >
                            {unlinkFormStandard.isPending
                              ? copy({ en: "Removing…", vi: "Đang xoá…" })
                              : copy({ en: "Yes, remove", vi: "Xác nhận xoá" })}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setConfirmUnlink(false)}
                            disabled={unlinkFormStandard.isPending}
                          >
                            {copy({ en: "Cancel", vi: "Huỷ" })}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmUnlink(true)}
                      >
                        {copy({ en: "Remove application file", vi: "Xoá hồ sơ ứng tuyển" })}
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title={copy({ en: "No candidate selected", vi: "Chưa chọn ứng viên" })}
                description={copy({
                  en: "Click a row in the table or search for a candidate above to manage their application file.",
                  vi: "Nhấn vào một dòng trong bảng hoặc tìm kiếm ứng viên ở trên để quản lý hồ sơ ứng tuyển."
                })}
              />
            )}
          </Panel>

          {/* Fallback: lead pre-selected via URL but has no record yet */}
          {selectedLeadId && !selectedRow ? (
            <Panel
              title={copy({ en: "Upload for new candidate", vi: "Tải hồ sơ cho ứng viên mới" })}
              subtitle={copy({
                en: "This candidate has no application file yet. Upload one to create their record.",
                vi: "Ứng viên này chưa có hồ sơ ứng tuyển. Tải lên để tạo bản ghi."
              })}
            >
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {copy({ en: `Lead ID: ${selectedLeadId}`, vi: `Mã ứng viên: ${selectedLeadId}` })}
                  {resolvedCandidateId ? ` · ${resolvedCandidateId}` : ""}
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  {copy({ en: "Application file", vi: "Hồ sơ ứng tuyển" })}
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
                    : copy({ en: "Upload application file", vi: "Tải hồ sơ ứng tuyển" })}
                </Button>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
