import { useRef, useState } from "react";
import { Badge, Button, DataTable, InfoStrip, Panel, SectionHeader } from "@social-crm/ui";
import {
  useApplyImportBatchMutation,
  useCancelImportBatchMutation,
  useImportBatchQuery,
  useImportBatchRowsQuery,
  useImportBatchesQuery,
  usePreviewLeadsImportMutation,
  type ImportBatch,
  type ImportBatchRow,
  type ImportRowDedupStatus
} from "@social-crm/api";
import { useI18n } from "@/i18n";

type DedupFilter = ImportRowDedupStatus | "";

function statusTone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "cancelled") return "neutral" as const;
  if (status === "applying") return "warning" as const;
  return "accent" as const;
}

function dedupTone(d: ImportRowDedupStatus) {
  if (d === "new") return "success" as const;
  if (d === "duplicate") return "warning" as const;
  return "danger" as const;
}

export function ImportPage() {
  const { copy, formatChannel, formatEnum } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [dedupFilter, setDedupFilter] = useState<DedupFilter>("");

  const previewMutation = usePreviewLeadsImportMutation();
  const applyMutation = useApplyImportBatchMutation();
  const cancelMutation = useCancelImportBatchMutation();
  const batchesQuery = useImportBatchesQuery({ limit: 25 });
  const batchQuery = useImportBatchQuery(activeBatchId ?? undefined, { pollWhileActive: true });
  const rowsQuery = useImportBatchRowsQuery(activeBatchId ?? undefined, {
    limit: 100,
    dedupStatus: dedupFilter || undefined
  });

  const activeBatch = batchQuery.data ?? null;
  const rows = rowsQuery.data?.data ?? [];

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setPickedFile(file ?? null);
  };

  const handlePreview = () => {
    if (!pickedFile) return;
    previewMutation.mutate(pickedFile, {
      onSuccess: (batch: ImportBatch) => {
        setActiveBatchId(batch.id);
        setPickedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  const handleApply = () => {
    if (!activeBatchId) return;
    if (
      !window.confirm(
        copy({
          en: "Apply this import? New leads will be created in the database.",
          vi: "Áp dụng đợt nhập này? Lead mới sẽ được tạo trong cơ sở dữ liệu."
        })
      )
    ) {
      return;
    }
    applyMutation.mutate(activeBatchId);
  };

  const handleCancel = () => {
    if (!activeBatchId) return;
    if (
      !window.confirm(
        copy({
          en: "Cancel this batch? Staged rows will be discarded.",
          vi: "Hủy đợt nhập này? Các dòng đã chuẩn bị sẽ bị bỏ."
        })
      )
    ) {
      return;
    }
    cancelMutation.mutate(activeBatchId);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Bulk import", vi: "Nhập hàng loạt" })}
        title={copy({ en: "Import leads from XLSX", vi: "Nhập lead từ XLSX" })}
        description={copy({
          en: "Upload the first sheet of the customer's progress-tracking workbook. The system stages every row, checks for phone duplicates, and only writes to the database after you confirm.",
          vi: "Tải lên sheet đầu tiên của bảng theo dõi tiến độ khách hàng. Hệ thống chuẩn bị từng dòng, kiểm tra trùng số điện thoại và chỉ ghi vào cơ sở dữ liệu sau khi bạn xác nhận."
        })}
      />

      <Panel
        title={copy({ en: "Upload", vi: "Tải lên" })}
        subtitle={copy({
          en: "Maps columns F (Họ tên), G (Giới tính), H (Năm sinh), J (Cao), K (Kinh nghiệm), L (SĐT), D (Nguồn), M (Chương trình). Columns N + Z + AA + AD are merged into one free-text block and handed to AI extraction.",
          vi: "Lấy cột F (Họ tên), G (Giới tính), H (Năm sinh), J (Cao), K (Kinh nghiệm), L (SĐT), D (Nguồn), M (Chương trình). Cột N + Z + AA + AD gộp thành khối ghi chú và đưa vào AI trích xuất."
        })}
      >
        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={onPickFile}
            className="text-sm file:mr-4 file:cursor-pointer file:rounded-xl file:border file:border-slate-200 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:border-slate-300 hover:file:bg-slate-50"
          />
          {pickedFile ? (
            <div className="text-sm text-slate-600">
              {copy({ en: "Selected:", vi: "Đã chọn:" })}{" "}
              <span className="font-medium text-slate-800">{pickedFile.name}</span>{" "}
              <span className="text-slate-400">({Math.round(pickedFile.size / 1024)} KB)</span>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePreview} disabled={!pickedFile || previewMutation.isPending}>
              {previewMutation.isPending
                ? copy({ en: "Parsing...", vi: "Đang đọc..." })
                : copy({ en: "Parse + preview", vi: "Đọc + xem trước" })}
            </Button>
            {previewMutation.isError ? (
              <span className="self-center text-xs text-rose-600">
                {(previewMutation.error as Error)?.message ?? "Failed"}
              </span>
            ) : null}
          </div>
        </div>
      </Panel>

      {activeBatch ? (
        <Panel
          title={
            <span>
              {copy({ en: "Preview", vi: "Xem trước" })}{" "}
              <span className="text-slate-400">— {activeBatch.filename}</span>
            </span>
          }
          subtitle={copy({
            en: "Review what will be created. Nothing is written to the leads table until you click Apply.",
            vi: "Xem lại trước khi tạo. Chưa có gì được ghi vào bảng lead cho đến khi bạn nhấn Áp dụng."
          })}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleApply}
                disabled={
                  (activeBatch.status !== "pending_review" && activeBatch.status !== "failed") ||
                  applyMutation.isPending ||
                  activeBatch.willCreateRows === 0
                }
              >
                {applyMutation.isPending
                  ? copy({ en: "Starting...", vi: "Đang bắt đầu..." })
                  : activeBatch.status === "failed"
                    ? copy({
                        en: `Resume apply (${activeBatch.willCreateRows - activeBatch.appliedRows})`,
                        vi: `Tiếp tục (${activeBatch.willCreateRows - activeBatch.appliedRows})`
                      })
                    : copy({
                        en: `Apply (${activeBatch.willCreateRows})`,
                        vi: `Áp dụng (${activeBatch.willCreateRows})`
                      })}
              </Button>
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={
                  activeBatch.status === "cancelled" ||
                  activeBatch.status === "completed" ||
                  activeBatch.status === "applying" ||
                  cancelMutation.isPending
                }
              >
                {copy({ en: "Cancel batch", vi: "Hủy đợt nhập" })}
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 md:grid-cols-4">
            <Strip label={copy({ en: "Total rows", vi: "Tổng dòng" })} value={activeBatch.totalRows} />
            <Strip
              label={copy({ en: "Will create", vi: "Sẽ tạo" })}
              value={activeBatch.willCreateRows}
              tone="accent"
            />
            <Strip
              label={copy({ en: "Will skip (dup)", vi: "Bỏ qua (trùng)" })}
              value={activeBatch.willSkipRows}
              tone="warning"
            />
            <Strip
              label={copy({ en: "Errors", vi: "Lỗi" })}
              value={activeBatch.errorRows}
              tone={activeBatch.errorRows > 0 ? "danger" : "neutral"}
            />
          </div>

          {(() => {
            const aiPending = activeBatch.aiPending ?? 0;
            const aiProcessed = activeBatch.aiProcessed ?? 0;
            const aiTotal = activeBatch.aiTotal ?? 0;
            const aiDone = aiTotal > 0 && aiPending === 0;
            const aiActive = aiTotal > 0 && aiPending > 0;

            // Distinguish three end states for the customer's "is this really finished?" question:
            //   1. Apply still running       → amber, "Creating leads..."
            //   2. Apply done + AI still working → amber, "Importing — AI still processing N notes"
            //   3. Apply done + AI done      → emerald, "Fully imported"
            const stripClass =
              activeBatch.status === "applying" || aiActive
                ? "mt-4 border-amber-300 bg-amber-50 text-amber-900"
                : activeBatch.status === "completed" && aiDone
                  ? "mt-4 border-emerald-300 bg-emerald-50 text-emerald-900"
                  : activeBatch.status === "failed"
                    ? "mt-4 border-rose-300 bg-rose-50 text-rose-900"
                    : "mt-4";

            return (
              <InfoStrip className={stripClass}>
                <div className="flex w-full flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={statusTone(activeBatch.status)}>{formatStatus(activeBatch.status, copy)}</Badge>

                    {activeBatch.status === "applying" ? (
                      <span className="text-sm">
                        {copy({
                          en: `Creating leads: ${activeBatch.appliedRows} of ${activeBatch.willCreateRows}…`,
                          vi: `Đang tạo lead: ${activeBatch.appliedRows} / ${activeBatch.willCreateRows}…`
                        })}
                      </span>
                    ) : null}

                    {activeBatch.status === "completed" && aiActive ? (
                      <Badge tone="warning">
                        {copy({ en: "Still importing", vi: "Vẫn đang nhập" })}
                      </Badge>
                    ) : null}

                    {activeBatch.status === "completed" && aiDone ? (
                      <Badge tone="success">{copy({ en: "Fully imported", vi: "Đã nhập xong" })}</Badge>
                    ) : null}

                    {activeBatch.status === "failed" && activeBatch.errorSummary ? (
                      <span className="text-sm">
                        {String((activeBatch.errorSummary as Record<string, unknown>).message ?? "")}
                      </span>
                    ) : null}
                  </div>

                  {/* AI extraction progress — only meaningful once apply finished. */}
                  {activeBatch.status === "completed" && aiTotal > 0 ? (
                    <div className="flex w-full flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div className="font-medium">
                          {aiActive
                            ? copy({
                                en: `Leads created (${activeBatch.appliedRows}). AI is still extracting structured fields from the imported notes.`,
                                vi: `Đã tạo ${activeBatch.appliedRows} lead. AI đang trích xuất các trường có cấu trúc từ ghi chú đã nhập.`
                              })
                            : copy({
                                en: `All ${aiProcessed} notes processed by AI. Per-field suggestions are visible on each lead's workbench.`,
                                vi: `AI đã xử lý xong ${aiProcessed} ghi chú. Gợi ý theo trường hiển thị trên từng lead.`
                              })}
                        </div>
                        <div className="font-mono text-xs">
                          {copy({
                            en: `AI ${aiProcessed} / ${aiTotal} (${aiPending} pending)`,
                            vi: `AI ${aiProcessed} / ${aiTotal} (còn ${aiPending})`
                          })}
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/60">
                        <div
                          className={`h-full rounded-full transition-all ${aiDone ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{
                            width: `${aiTotal === 0 ? 0 : Math.round((aiProcessed / aiTotal) * 100)}%`
                          }}
                        />
                      </div>
                      {aiActive ? (
                        <div className="text-xs leading-5 text-amber-800/80">
                          {copy({
                            en: "This page refreshes every few seconds while AI is processing. You can leave it open or come back later — the worker runs server-side.",
                            vi: "Trang này tự cập nhật vài giây một lần khi AI đang chạy. Bạn có thể để mở hoặc quay lại sau — worker chạy ở server."
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </InfoStrip>
            );
          })()}

          {/* Row preview */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">{copy({ en: "Filter:", vi: "Lọc:" })}</span>
            {(["", "new", "duplicate", "error"] as DedupFilter[]).map((f) => (
              <button
                key={f || "all"}
                type="button"
                onClick={() => setDedupFilter(f)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  dedupFilter === f
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {f === ""
                  ? copy({ en: "All", vi: "Tất cả" })
                  : f === "new"
                    ? copy({ en: "New", vi: "Sẽ tạo" })
                    : f === "duplicate"
                      ? copy({ en: "Duplicate", vi: "Trùng" })
                      : copy({ en: "Error", vi: "Lỗi" })}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <DataTable>
              <div className="max-h-[calc(100vh-32rem)] min-h-[280px] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 shadow-[0_1px_0_rgba(226,232,240,1)]">
                    <tr>
                      <th className="px-4 py-3">{copy({ en: "Row", vi: "Dòng" })}</th>
                      <th className="py-3 pr-3">{copy({ en: "Status", vi: "Trạng thái" })}</th>
                      <th className="py-3 pr-3">{copy({ en: "Name", vi: "Họ tên" })}</th>
                      <th className="py-3 pr-3">{copy({ en: "Phone", vi: "SĐT" })}</th>
                      <th className="py-3 pr-3">{copy({ en: "Source", vi: "Nguồn" })}</th>
                      <th className="py-3 pr-3">{copy({ en: "Gender", vi: "Giới tính" })}</th>
                      <th className="py-3 pr-3">{copy({ en: "Birth year", vi: "Năm sinh" })}</th>
                      <th className="py-3 pr-3">{copy({ en: "Height (cm)", vi: "Cao" })}</th>
                      <th className="py-3 pr-3">{copy({ en: "Experience", vi: "Kinh nghiệm" })}</th>
                      <th className="py-3 pr-3">{copy({ en: "Notes (preview)", vi: "Ghi chú (rút gọn)" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      rows.map((row: ImportBatchRow) => (
                        <tr key={row.id} className="border-t border-slate-200 align-top hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500">{row.sourceRow}</td>
                          <td className="py-3 pr-3">
                            <div className="flex flex-col gap-1">
                              <Badge tone={dedupTone(row.dedupStatus)}>{row.dedupStatus}</Badge>
                              {row.dedupReason ? (
                                <span className="text-[11px] leading-4 text-slate-500">{row.dedupReason}</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-3 pr-3 font-medium text-slate-800">
                            {row.mappedFields.fullName || "—"}
                          </td>
                          <td className="py-3 pr-3 text-slate-700">{row.mappedFields.phone || "—"}</td>
                          <td className="py-3 pr-3 text-slate-700">
                            {row.mappedFields.source
                              ? formatChannel(row.mappedFields.source)
                              : row.mappedFields.rawSourceLabel || "—"}
                          </td>
                          <td className="py-3 pr-3 text-slate-700">
                            {row.mappedFields.gender ? formatEnum(row.mappedFields.gender) : "—"}
                          </td>
                          <td className="py-3 pr-3 text-slate-700">{row.mappedFields.birthYear ?? "—"}</td>
                          <td className="py-3 pr-3 text-slate-700">{row.mappedFields.heightCm ?? "—"}</td>
                          <td className="py-3 pr-3 text-slate-700">{row.mappedFields.experienceField ?? "—"}</td>
                          <td className="py-3 pr-3 text-slate-500">
                            <span className="line-clamp-2 max-w-[28ch] text-xs">
                              {row.freeText ? row.freeText.slice(0, 160) : "—"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">
                          {copy({ en: "No rows match this filter.", vi: "Không có dòng nào khớp bộ lọc." })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DataTable>
          </div>
        </Panel>
      ) : null}

      <Panel
        title={copy({ en: "Recent imports", vi: "Đợt nhập gần đây" })}
        subtitle={copy({
          en: "Click any row to load its preview.",
          vi: "Bấm vào một dòng để xem lại."
        })}
      >
        <DataTable>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">{copy({ en: "File", vi: "Tệp" })}</th>
                <th className="py-3 pr-3">{copy({ en: "Status", vi: "Trạng thái" })}</th>
                <th className="py-3 pr-3">{copy({ en: "Total", vi: "Tổng" })}</th>
                <th className="py-3 pr-3">{copy({ en: "Created", vi: "Đã tạo" })}</th>
                <th className="py-3 pr-3">{copy({ en: "Skipped", vi: "Bỏ qua" })}</th>
                <th className="py-3 pr-3">{copy({ en: "Uploaded by", vi: "Người tải" })}</th>
                <th className="py-3 pr-3">{copy({ en: "When", vi: "Thời gian" })}</th>
              </tr>
            </thead>
            <tbody>
              {(batchesQuery.data?.data ?? []).map((batch: ImportBatch) => (
                <tr
                  key={batch.id}
                  className={`cursor-pointer border-t border-slate-200 align-top transition-colors ${
                    activeBatchId === batch.id ? "bg-indigo-50/50" : "hover:bg-slate-50"
                  }`}
                  onClick={() => setActiveBatchId(batch.id)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{batch.filename}</td>
                  <td className="py-3 pr-3">
                    <Badge tone={statusTone(batch.status)}>{formatStatus(batch.status, copy)}</Badge>
                  </td>
                  <td className="py-3 pr-3 text-slate-700">{batch.totalRows}</td>
                  <td className="py-3 pr-3 text-slate-700">{batch.appliedRows}</td>
                  <td className="py-3 pr-3 text-slate-500">{batch.willSkipRows}</td>
                  <td className="py-3 pr-3 text-slate-500">{batch.uploadedByUsername ?? "—"}</td>
                  <td className="py-3 pr-3 text-xs text-slate-500">
                    {new Date(batch.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {(batchesQuery.data?.data?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    {copy({ en: "No imports yet.", vi: "Chưa có đợt nhập nào." })}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </DataTable>
      </Panel>
    </div>
  );
}

function formatStatus(status: string, copy: (v: { en: string; vi: string }) => string): string {
  switch (status) {
    case "pending_review":
      return copy({ en: "Pending review", vi: "Chờ xác nhận" });
    case "applying":
      return copy({ en: "Applying...", vi: "Đang áp dụng..." });
    case "completed":
      return copy({ en: "Completed", vi: "Hoàn tất" });
    case "cancelled":
      return copy({ en: "Cancelled", vi: "Đã hủy" });
    case "failed":
      return copy({ en: "Failed", vi: "Thất bại" });
    default:
      return status;
  }
}

function Strip(props: {
  label: string;
  value: string | number;
  tone?: "neutral" | "accent" | "warning" | "danger";
}) {
  const accent =
    props.tone === "accent"
      ? "border-indigo-200 bg-indigo-50"
      : props.tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : props.tone === "danger"
          ? "border-rose-200 bg-rose-50"
          : "border-slate-200 bg-white";
  return (
    <div className={`rounded-[22px] border px-4 py-4 shadow-[0_14px_26px_rgba(15,23,42,0.04)] ${accent}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">{props.value}</div>
    </div>
  );
}
