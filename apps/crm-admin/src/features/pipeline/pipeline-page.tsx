import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  EmptyState,
  InfoStrip,
  Input,
  PaginationFooter,
  Panel,
  SectionHeader,
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import { usePipelineQuery } from "@social-crm/api";
import { useI18n } from "@/i18n";
import type { PipelineRow } from "@social-crm/api";

const PAGE_SIZE = 25;

function toneForStage(stage: string) {
  if (["departed"].includes(stage)) return "success" as const;
  if (["disqualified", "interview_failed"].includes(stage)) return "danger" as const;
  if (["visa_processing", "contract_signed", "interview_passed", "interview_scheduled"].includes(stage)) return "warning" as const;
  return "accent" as const;
}

export function PipelinePage() {
  const { copy, formatPipelineStage, formatApplicationStatus } = useI18n();
  const [filters, setFilters] = useState({
    stage: "",
    search: ""
  });
  const [page, setPage] = useState(0);

  const pipelineQuery = usePipelineQuery({
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    stage: filters.stage || undefined,
    search: filters.search || undefined
  });

  const rows = pipelineQuery.data?.data ?? [];
  const groups = pipelineQuery.data?.groups ?? {};
  const orderedGroups = useMemo(() => Object.entries(groups).sort((a, b) => b[1] - a[1]), [groups]);

  useEffect(() => {
    setPage(0);
  }, [filters.stage, filters.search]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Pipeline", vi: "Luồng hồ sơ" })}
        title={copy({ en: "Cross-stage case flow", vi: "Luồng hồ sơ liên giai đoạn" })}
        description={copy({ en: "One operational view across lead stage, candidate linkage, application status, document blockers, and training-finance readiness.", vi: "Một góc nhìn vận hành xuyên suốt giữa giai đoạn lead, liên kết ứng viên, trạng thái ứng tuyển, điểm nghẽn hồ sơ và mức sẵn sàng đào tạo - tài chính." })}
      />

      <InfoStrip>
        <div className="flex flex-wrap items-center gap-3">
          <span>{copy({ en: "This workspace is backed by the aggregated `/pipeline` endpoint, not by frontend-only stitching.", vi: "Không gian này chạy từ endpoint tổng hợp `/pipeline`, không phải ghép nối chỉ ở frontend." })}</span>
          <Badge tone="neutral">{pipelineQuery.data?.total ?? 0} {copy({ en: "cases", vi: "hồ sơ" })}</Badge>
        </div>
      </InfoStrip>

      <Toolbar compact className="border-slate-200/90">
        <div className="grid gap-3 md:grid-cols-2">
          <Select label={copy({ en: "Stage", vi: "Giai đoạn" })} value={filters.stage} onChange={(e) => setFilters((s) => ({ ...s, stage: e.target.value }))}>
            <option value="">{copy({ en: "All stages", vi: "Tất cả giai đoạn" })}</option>
            {orderedGroups.map(([stage]) => (
              <option key={stage} value={stage}>{formatPipelineStage(stage)}</option>
            ))}
          </Select>
          <Input label={copy({ en: "Search", vi: "Tìm kiếm" })} value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
        </div>
        <ToolbarActions>
          {orderedGroups.slice(0, 5).map(([stage, count]) => (
            <Badge key={stage} tone="neutral">{formatPipelineStage(stage)}: {count}</Badge>
          ))}
        </ToolbarActions>
      </Toolbar>

      <Panel
        title={copy({ en: "Case queue", vi: "Hàng đợi hồ sơ" })}
        subtitle={copy({ en: "Rows are keyed by lead and summarize the active operational state across modules.", vi: "Mỗi dòng gắn với một lead và tóm tắt trạng thái vận hành hiện tại trên nhiều mô-đun." })}
      >
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((row: PipelineRow) => (
              <div key={row.leadId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{row.leadName || copy({ en: "Unnamed lead", vi: "Lead chưa có tên" })}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.phone || copy({ en: "No phone", vi: "Chưa có số điện thoại" })} · {row.source}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={toneForStage(row.currentStage)}>{formatPipelineStage(row.currentStage)}</Badge>
                    {row.applicationStatus ? <Badge tone="warning">{formatApplicationStatus(row.applicationStatus)}</Badge> : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <PipelineMeta label={copy({ en: "Candidate", vi: "Ứng viên" })} value={row.candidateCode || row.candidateId || copy({ en: "Not created", vi: "Chưa tạo" })} />
                  <PipelineMeta label={copy({ en: "Order", vi: "Đơn hàng" })} value={row.applicationOrderName || copy({ en: "No application", vi: "Chưa có hồ sơ ứng tuyển" })} />
                  <PipelineMeta label={copy({ en: "Documents", vi: "Hồ sơ" })} value={row.documents.missingRequired.length ? copy({ en: `${row.documents.missingRequired.length} missing`, vi: `Thiếu ${row.documents.missingRequired.length}` }) : copy({ en: "Complete", vi: "Đầy đủ" })} />
                  <PipelineMeta label={copy({ en: "Next action", vi: "Hành động tiếp theo" })} value={row.nextAction} />
                </div>

                {row.blockers.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {row.blockers.map((blocker) => (
                      <Badge key={blocker} tone="danger">{blocker}</Badge>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link className="text-sm font-medium text-indigo-700 hover:text-indigo-800" to={`/leads/${row.leadId}`}>
                    {copy({ en: "Open lead workbench", vi: "Mở bàn xử lý lead" })}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {row.trainingFinance?.departureDate
                      ? copy({ en: `Departure ${row.trainingFinance.departureDate}`, vi: `Xuất cảnh ${row.trainingFinance.departureDate}` })
                      : row.trainingFinance?.visaDate
                        ? copy({ en: `Visa ${row.trainingFinance.visaDate}`, vi: `Visa ${row.trainingFinance.visaDate}` })
                        : row.trainingFinance?.trainingProgress || copy({ en: "No downstream milestone yet", vi: "Chưa có cột mốc tiếp theo" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={copy({ en: "No pipeline rows found", vi: "Không tìm thấy hồ sơ trong luồng" })} description={copy({ en: "Adjust the filters or wait until lead and downstream workflow data is available.", vi: "Hãy điều chỉnh bộ lọc hoặc chờ đến khi dữ liệu lead và luồng xử lý phía sau sẵn sàng." })} />
        )}
        <PaginationFooter
          page={page}
          pageSize={PAGE_SIZE}
          total={pipelineQuery.data?.total ?? 0}
          isFetching={pipelineQuery.isFetching}
          itemLabel={copy({ en: "cases", vi: "hồ sơ" })}
          pageLabel={copy({ en: "Page", vi: "Trang" })}
          previousLabel={copy({ en: "Previous", vi: "Trước" })}
          nextLabel={copy({ en: "Next", vi: "Sau" })}
          onPrevious={() => setPage((current) => Math.max(0, current - 1))}
          onNext={() => setPage((current) => current + 1)}
          className="mt-4 border-slate-100 px-0 pb-0 pt-4"
        />
      </Panel>
    </div>
  );
}

function PipelineMeta(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-medium text-slate-800">{props.value}</div>
    </div>
  );
}
