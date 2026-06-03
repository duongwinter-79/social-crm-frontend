import { useEffect, useMemo, useState } from "react";
import { Badge, Button, DataTable, InfoStrip, Panel, SectionHeader, Select } from "@social-crm/ui";
import {
  useApplyImportNotesSuggestionsMutation,
  useImportBatchesQuery,
  useImportBatchQuery,
  useImportNotesSuggestionsQuery,
  useTriggerImportNotesExtractionMutation,
  type ImportNotes,
  type ImportNotesLeadGroup,
  type ImportNotesSuggestion
} from "@social-crm/api";
import { useI18n } from "@/i18n";
import { UiText } from "@/ui-text/ui-text";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

/**
 * /extract - operator-triggered AI extraction on the notes from a completed
 * import batch. Strictly opt-in: nothing runs automatically, nothing is
 * applied without a per-field confirmation in this screen.
 *
 * Flow:
 *   1. Pick a completed batch from the dropdown
 *   2. Click "Run extraction" → backend runs AI, writes LeadAiSuggestion rows
 *   3. Preview table appears (lead × field × proposed value)
 *   4. Tick the suggestions to apply, click "Apply selected"
 *   5. Unselected ones stay visible on each lead's workbench for follow-up
 */
export function ExtractPage() {
  const {
    copy,
    formatFieldLabel,
    formatFieldValue,
    formatConfidence,
    formatExtractionSourceSummary,
    formatApplySkipReason
  } = useI18n();
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);

  const batchesQuery = useImportBatchesQuery({ limit: 50 });
  const batchQuery = useImportBatchQuery(selectedBatchId || undefined);
  const triggerExtract = useTriggerImportNotesExtractionMutation();
  const applyMutation = useApplyImportNotesSuggestionsMutation();
  const suggestionsQuery = useImportNotesSuggestionsQuery(selectedBatchId || undefined, {
    // After a Trigger click, keep polling every 2s until the server returns
    // a non-empty list. The hook handles stopping once data arrives.
    pollWhileEmpty: triggerExtract.isSuccess
  });

  const completedBatches = useMemo(() => {
    return (batchesQuery.data?.data ?? []).filter((b) => b.status === "completed");
  }, [batchesQuery.data]);

  const groups: ImportNotesLeadGroup[] = suggestionsQuery.data ?? [];

  // Reset picks when the batch changes.
  useEffect(() => {
    setPicked(new Set());
  }, [selectedBatchId]);

  const toggle = (leadId: string, fieldName: string) => {
    const key = `${leadId}::${fieldName}`;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const togglePerLead = (group: ImportNotesLeadGroup) => {
    setPicked((prev) => {
      const next = new Set(prev);
      const allOn = group.suggestions.every((s) => next.has(`${group.leadId}::${s.fieldName}`));
      for (const s of group.suggestions) {
        const key = `${group.leadId}::${s.fieldName}`;
        if (allOn) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setPicked((prev) => {
      const total = groups.reduce((acc, g) => acc + g.suggestions.length, 0);
      if (prev.size === total) return new Set();
      const next = new Set<string>();
      for (const g of groups) {
        for (const s of g.suggestions) {
          next.add(`${g.leadId}::${s.fieldName}`);
        }
      }
      return next;
    });
  };

  const handleExtract = () => {
    if (!selectedBatchId) return;
    triggerExtract.mutate(selectedBatchId);
  };

  const handleApply = () => {
    if (!selectedBatchId || picked.size === 0) return;
    setConfirmApplyOpen(true);
  };

  const applyPickedSuggestions = () => {
    if (!selectedBatchId || picked.size === 0) return;
    // Group picks by leadId.
    const byLead = new Map<string, string[]>();
    for (const key of picked) {
      const [leadId, fieldName] = key.split("::");
      if (!byLead.has(leadId)) byLead.set(leadId, []);
      byLead.get(leadId)!.push(fieldName);
    }
    const selections = Array.from(byLead.entries()).map(([leadId, fieldNames]) => ({
      leadId,
      fieldNames
    }));
    applyMutation.mutate(
      { id: selectedBatchId, selections },
      {
        onSuccess: () => {
          setPicked(new Set());
          setConfirmApplyOpen(false);
        }
      }
    );
  };

  const totalSuggestions = groups.reduce((acc, g) => acc + g.suggestions.length, 0);
  const activeBatch = batchQuery.data ?? null;
  const allPicked = totalSuggestions > 0 && picked.size === totalSuggestions;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={<UiText id="extract.eyebrow" />}
        title={<UiText id="extract.title" />}
        description={<UiText id="extract.desc" />}
      />

      <Panel
        title={<UiText id="extract.pick.title" />}
        subtitle={<UiText id="extract.pick.subtitle" />}
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Select
            label={copy({ en: "Completed batch", vi: "Đợt nhập đã hoàn tất" })}
            value={selectedBatchId}
            onChange={(event) => setSelectedBatchId(event.target.value)}
          >
            <option value="">{copy({ en: "— select —", vi: "— chọn —" })}</option>
            {completedBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.filename} · {b.appliedRows} {copy({ en: "leads", vi: "Ứng viên" })} ·{" "}
                {new Date(b.createdAt).toLocaleDateString()}
              </option>
            ))}
          </Select>
          <Button
            onClick={handleExtract}
            disabled={!selectedBatchId || triggerExtract.isPending}
          >
            {triggerExtract.isPending
              ? copy({ en: "Starting…", vi: "Đang bắt đầu…" })
              : copy({ en: "Run extraction", vi: "Chạy trích xuất" })}
          </Button>
        </div>
        {activeBatch ? (
          <InfoStrip className="mt-3">
            <div className="text-sm text-slate-600">
              {copy({
                en: `Batch totals: ${activeBatch.appliedRows} leads created · ${activeBatch.aiTotal ?? "—"} have notes · ${activeBatch.aiProcessed ?? 0} previously extracted.`,
                vi: `Tổng kết: ${activeBatch.appliedRows} ứng viên đã tạo · ${activeBatch.aiTotal ?? "—"} có ghi chú · ${activeBatch.aiProcessed ?? 0} đã trích xuất trước đó.`
              })}
            </div>
          </InfoStrip>
        ) : null}
      </Panel>

      {selectedBatchId ? (
        <Panel
          title={<UiText id="extract.review.title" />}
          subtitle={<UiText id="extract.review.subtitle" />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={toggleAll} disabled={totalSuggestions === 0}>
                {allPicked
                  ? copy({ en: "Unselect all", vi: "Bỏ chọn tất cả" })
                  : copy({ en: "Select all", vi: "Chọn tất cả" })}
              </Button>
              <Button
                onClick={handleApply}
                disabled={picked.size === 0 || applyMutation.isPending}
              >
                {applyMutation.isPending
                  ? copy({ en: "Applying…", vi: "Đang áp dụng…" })
                  : copy({
                      en: `Apply selected (${picked.size})`,
                      vi: `Áp dụng đã chọn (${picked.size})`
                    })}
              </Button>
            </div>
          }
        >
          {totalSuggestions === 0 ? (
            <InfoStrip>
              <div className="text-sm text-slate-600">
                {triggerExtract.isSuccess && !suggestionsQuery.isFetching ? (
                  copy({
                    en: "Extraction started. Suggestions will appear here as the AI processes each lead's notes (every ~2 seconds).",
                      vi: "Đã bắt đầu trích xuất. Gợi ý sẽ hiện dần khi AI xử lý ghi chú từng ứng viên tiềm năng."
                  })
                ) : (
                  copy({
                    en: "No suggestions yet. Click Run extraction above.",
                    vi: "Chưa có gợi ý. Bấm Chạy trích xuất ở trên."
                  })
                )}
              </div>
            </InfoStrip>
          ) : (
            <div className="space-y-4">
              {applyMutation.isSuccess ? (
                <InfoStrip className="border-emerald-300 bg-emerald-50 text-emerald-900">
                  <div className="text-sm">
                    <div>
                      {copy({
                        en: `Applied ${applyMutation.data?.applied ?? 0}, skipped ${applyMutation.data?.skipped ?? 0}. Re-extract or revisit each lead's workbench for the remainder.`,
                        vi: `Đã áp dụng ${applyMutation.data?.applied ?? 0}, bỏ qua ${applyMutation.data?.skipped ?? 0}. Trích xuất lại hoặc vào từng ứng viên để xử lý phần còn lại.`
                      })}
                    </div>
                    {applyMutation.data?.skipReasons &&
                    Object.keys(applyMutation.data.skipReasons).length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(applyMutation.data.skipReasons).map(([reason, count]) => (
                          <Badge key={reason} tone="neutral">
                            {formatApplySkipReason(reason)} · {count}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </InfoStrip>
              ) : null}

              {groups.map((group) => (
                <LeadGroupBlock
                  key={group.leadId}
                  group={group}
                  picked={picked}
                  togglePerLead={togglePerLead}
                  toggle={toggle}
                  formatFieldLabel={formatFieldLabel}
                  formatFieldValue={formatFieldValue}
                  formatConfidence={formatConfidence}
                  formatExtractionSourceSummary={formatExtractionSourceSummary}
                  copy={copy}
                />
              ))}
            </div>
          )}
        </Panel>
      ) : null}
      <ConfirmationDialog
        open={confirmApplyOpen}
        title={copy({ en: "Apply selected suggestions?", vi: "Áp dụng gợi ý đã chọn?" })}
        description={copy({
          en: "Selected AI suggestions will be written to the listed lead records.",
          vi: "Các gợi ý AI đã chọn sẽ được ghi vào những hồ sơ lead trong danh sách.",
        })}
        details={[
          { label: copy({ en: "Batch ID", vi: "Mã đợt nhập" }), value: selectedBatchId || "—" },
          { label: copy({ en: "Suggestions", vi: "Gợi ý" }), value: String(picked.size) },
        ]}
        warning={copy({
          en: "Unselected suggestions stay available for later review.",
          vi: "Các gợi ý chưa chọn vẫn được giữ lại để xem sau.",
        })}
        confirmLabel={copy({ en: "Apply suggestions", vi: "Áp dụng gợi ý" })}
        pendingLabel={copy({ en: "Applying...", vi: "Đang áp dụng..." })}
        cancelLabel={copy({ en: "Back", vi: "Quay lại" })}
        isPending={applyMutation.isPending}
        onCancel={() => setConfirmApplyOpen(false)}
        onConfirm={applyPickedSuggestions}
      />
    </div>
  );
}

// Helper components ---------------------------------------------------------

function LeadGroupBlock(props: {
  group: ImportNotesLeadGroup;
  picked: Set<string>;
  togglePerLead: (group: ImportNotesLeadGroup) => void;
  toggle: (leadId: string, fieldName: string) => void;
  formatFieldLabel: (key: string) => string;
  formatFieldValue: (key: string, value: unknown) => string;
  formatConfidence: (value: string) => string;
  formatExtractionSourceSummary: (value: string) => string;
  copy: (v: { en: string; vi: string }) => string;
}) {
  const {
    group,
    picked,
    togglePerLead,
    toggle,
    formatFieldLabel,
    formatFieldValue,
    formatConfidence,
    formatExtractionSourceSummary,
    copy,
  } = props;
  const allOn = group.suggestions.every((s) => picked.has(`${group.leadId}::${s.fieldName}`));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-slate-900">
            {group.leadName ?? copy({ en: "Unnamed lead", vi: "Ứng viên chưa có tên" })}
          </div>
          <div className="mt-1 text-xs text-slate-500">{group.leadPhone ?? "—"}</div>
          {group.importNotes ? <NotesPreview notes={group.importNotes} copy={copy} /> : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{group.suggestions.length}</Badge>
          <Button variant="secondary" size="sm" onClick={() => togglePerLead(group)}>
            {allOn
              ? copy({ en: "Unselect", vi: "Bỏ chọn" })
              : copy({ en: "Select all", vi: "Chọn tất cả" })}
          </Button>
        </div>
      </div>

      <DataTable className="mt-3">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="py-3 pr-3">{copy({ en: "Field", vi: "Trường" })}</th>
              <th className="py-3 pr-3">{copy({ en: "Proposed value", vi: "Giá trị đề xuất" })}</th>
              <th className="py-3 pr-3">{copy({ en: "Confidence", vi: "Độ tin cậy" })}</th>
              <th className="py-3 pr-3">{copy({ en: "Source", vi: "Nguồn" })}</th>
            </tr>
          </thead>
          <tbody>
            {group.suggestions.map((s) => {
              const key = `${group.leadId}::${s.fieldName}`;
              const isPicked = picked.has(key);
              return (
                <tr key={s.id} className={`border-t border-slate-200 ${isPicked ? "bg-indigo-50/40" : ""}`}>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={isPicked}
                      onChange={() => toggle(group.leadId, s.fieldName)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600"
                    />
                  </td>
                  <td className="py-2 pr-3 font-medium text-slate-800">
                    {formatFieldLabel(s.fieldName)}
                  </td>
                  <td className="py-2 pr-3 text-slate-700">{formatFieldValue(s.fieldName, s.value)}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={s.confidence === "high" ? "success" : s.confidence === "medium" ? "warning" : "neutral"}>
                      {formatConfidence(s.confidence)}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-xs text-slate-500">
                    {formatExtractionSourceSummary(s.source)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}

function NotesPreview(props: { notes: ImportNotes; copy: (v: { en: string; vi: string }) => string }) {
  const labels: Array<{ key: keyof ImportNotes; vi: string; en: string }> = [
    { key: "general", vi: "GHI CHÚ", en: "General" },
    { key: "specialRequest", vi: "Yêu cầu đặc biệt", en: "Special request" },
    { key: "profile", vi: "Ghi chú (hồ sơ)", en: "Profile notes" },
    { key: "experience", vi: "Kinh nghiệm", en: "Experience" }
  ];
  const present = labels.filter((l) => Boolean(props.notes[l.key]));
  if (present.length === 0) return null;
  return (
    <details className="mt-2 max-w-2xl">
      <summary className="cursor-pointer text-xs text-slate-500">
        {props.copy({ en: "Show source notes", vi: "Xem ghi chú gốc" })}
      </summary>
      <div className="mt-1 grid gap-1 text-xs leading-5 text-slate-600">
        {present.map((l) => (
          <div key={l.key}>
            <span className="font-semibold text-slate-700">{props.copy({ vi: l.vi, en: l.en })}:</span>{" "}
            {props.notes[l.key]}
          </div>
        ))}
      </div>
    </details>
  );
}

