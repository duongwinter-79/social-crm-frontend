import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
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
import { useThreadDetailQuery, useThreadMessagesQuery, useThreadsQuery, type MessageRecord, type ThreadSummary } from "@social-crm/api";
import { createReturnState, saveRouteScroll, useRestoreRouteScroll, type NavigationReturnState } from "@/app/navigation-state";
import { applySearchParamUpdates, readPageIndex, readStringOption, type SearchParamValue } from "@/app/search-params";
import { MessageImageAttachment } from "@/components/message-image-attachment";
import { RefreshButton } from "@/components/refresh-button";
import { useI18n } from "@/i18n";

const PAGE_SIZE = 20;
const MESSAGE_LIMIT = 50;
const CHANNEL_OPTIONS = ["zalo", "facebook", "miniapp"] as const;
const CHANNEL_FILTER_OPTIONS = ["all", ...CHANNEL_OPTIONS] as const;
const ANALYZE_STATUS_OPTIONS = ["pending", "analyzing", "completed", "needs_phone"] as const;
const CONVERSATION_PARAM_DEFAULTS = {
  page: 1,
  q: "",
  channel: "zalo",
  analyzeStatus: "",
  threadId: ""
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function previewText(value?: string | null) {
  if (!value?.trim()) return "-";
  return value.length > 120 ? `${value.slice(0, 120)}...` : value;
}

function textValue(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function toneForAnalyzeStatus(status?: string) {
  if (status === "completed") return "success" as const;
  if (status === "analyzing") return "warning" as const;
  if (status === "needs_phone") return "danger" as const;
  return "neutral" as const;
}

function toneForDirection(direction?: string) {
  return direction === "inbound" ? "accent" as const : "neutral" as const;
}

type CopyFn = ReturnType<typeof useI18n>["copy"];
type FormatFieldLabelFn = ReturnType<typeof useI18n>["formatFieldLabel"];
type FormatFieldValueFn = ReturnType<typeof useI18n>["formatFieldValue"];
type FormatConfidenceFn = ReturnType<typeof useI18n>["formatConfidence"];
type FormatExtractionSourceSummaryFn = ReturnType<typeof useI18n>["formatExtractionSourceSummary"];

function getLeadName(thread: ThreadSummary | null | undefined, fallback: string) {
  const lead = thread?.lead;
  if (lead) return lead.displayName?.trim() || thread?.externalId || fallback;
  return thread?.externalId || fallback;
}

function recordEntries(record?: Record<string, unknown> | null) {
  if (!record) return [];
  return Object.entries(record).filter(([, value]) => value !== null && value !== undefined && value !== "");
}

function formatAnalyzeStatus(status: string, copy: CopyFn) {
  if (status === "completed") return copy({ en: "Completed", vi: "Đã phân tích" });
  if (status === "analyzing") return copy({ en: "Analyzing", vi: "Đang phân tích" });
  if (status === "needs_phone") return copy({ en: "Needs phone", vi: "Thiếu số điện thoại" });
  return copy({ en: "Pending", vi: "Chờ xử lý" });
}

function formatMessageDirection(direction: string, copy: CopyFn) {
  return direction === "inbound"
    ? copy({ en: "Inbound", vi: "Khách nhắn" })
    : copy({ en: "Outbound", vi: "Nhân sự nhắn" });
}

function formatMessageType(type: string, copy: CopyFn) {
  if (type === "image") return copy({ en: "Image", vi: "Hình ảnh" });
  if (type === "text") return copy({ en: "Text", vi: "Tin nhắn" });
  return type;
}

function formatSourceValue(value: unknown, formatExtractionSourceSummary: FormatExtractionSourceSummaryFn) {
  if (typeof value !== "string") return textValue(value);
  const [provider, model] = value.split(":");
  if (["gemini", "groq", "openrouter"].includes(provider.toLowerCase())) {
    return model ? `AI (${model})` : "AI";
  }
  return formatExtractionSourceSummary(value);
}

function formatExtractedValue(
  key: string,
  value: unknown,
  formatFieldValue: FormatFieldValueFn,
  formatConfidence: FormatConfidenceFn,
  formatExtractionSourceSummary: FormatExtractionSourceSummaryFn
) {
  if (key === "confidence" && typeof value === "string") return formatConfidence(value);
  if (key === "source") return formatSourceValue(value, formatExtractionSourceSummary);
  if (key === "extractedAt" && typeof value === "string") return formatDateTime(value);
  return formatFieldValue(key, value);
}

function ThreadCard(props: {
  thread: ThreadSummary;
  selected: boolean;
  onSelect: () => void;
  copy: CopyFn;
}) {
  const leadName = getLeadName(props.thread, props.copy({ en: "Zalo user", vi: "Người dùng Zalo" }));
  const lastMessage = props.thread.lastMessage;

  return (
    <button
      type="button"
      onClick={props.onSelect}
      className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
        props.selected
          ? "border-indigo-300 bg-indigo-50 shadow-[0_14px_28px_rgba(79,70,229,0.12)]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{leadName}</div>
          <div className="mt-1 text-xs text-slate-500">{props.thread.lead?.phone || props.thread.externalId || props.copy({ en: "No phone", vi: "Chưa có số điện thoại" })}</div>
        </div>
        <Badge tone={toneForAnalyzeStatus(props.thread.analyzeStatus)}>{formatAnalyzeStatus(props.thread.analyzeStatus, props.copy)}</Badge>
      </div>
      <div className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{previewText(lastMessage?.content)}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{formatDateTime(lastMessage?.createdAt ?? props.thread.lastMessageAt)}</span>
        <span>•</span>
        <span>{props.thread.messageCount} {props.copy({ en: "messages", vi: "tin nhắn" })}</span>
        {props.thread.unscannedTextCount > 0 ? (
          <>
            <span>•</span>
            <span className="font-semibold text-amber-700">
              {props.thread.unscannedTextCount} {props.copy({ en: "unscanned", vi: "chưa quét AI" })}
            </span>
          </>
        ) : null}
      </div>
    </button>
  );
}

function MessageBubble(props: { message: MessageRecord; copy: CopyFn }) {
  const inbound = props.message.direction === "inbound";
  const isImage = props.message.type === "image";

  return (
    <div className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[82%] rounded-[22px] border px-4 py-3 ${
        inbound ? "border-slate-200 bg-white" : "border-indigo-200 bg-indigo-50"
      }`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={toneForDirection(props.message.direction)}>{formatMessageDirection(props.message.direction, props.copy)}</Badge>
          <Badge tone="neutral">{formatMessageType(props.message.type, props.copy)}</Badge>
          {props.message.aiScannedAt ? (
            <Badge tone="success">{props.copy({ en: "AI scanned", vi: "AI đã quét" })}</Badge>
          ) : (
            <Badge tone="warning">{props.copy({ en: "Pending AI", vi: "Chờ AI quét" })}</Badge>
          )}
        </div>
        <MessageImageAttachment
          message={props.message}
          alt={props.copy({ en: "Zalo image", vi: "Ảnh từ Zalo" })}
          openTitle={props.copy({ en: "Open full image", vi: "Mở ảnh đầy đủ" })}
        />
        {!isImage ? (
          <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
            {props.message.content || props.copy({ en: "(empty message)", vi: "(tin nhắn trống)" })}
          </div>
        ) : !props.message.mediaUrl ? (
          <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
            {props.copy({ en: "[Image - no URL]", vi: "[Ảnh chưa có đường dẫn]" })}
          </div>
        ) : null}
        <div className="mt-2 text-xs text-slate-400">{formatDateTime(props.message.createdAt)}</div>
        {props.message.rawPayload ? (
          <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-slate-500">
              {props.copy({ en: "Raw webhook payload", vi: "Dữ liệu webhook gốc" })}
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto text-xs text-slate-600">
              {JSON.stringify(props.message.rawPayload, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}
function ExtractedDataPanel(props: {
  title: string;
  empty: string;
  data?: Record<string, unknown> | null;
  formatFieldLabel: FormatFieldLabelFn;
  formatFieldValue: FormatFieldValueFn;
  formatConfidence: FormatConfidenceFn;
  formatExtractionSourceSummary: FormatExtractionSourceSummaryFn;
}) {
  const entries = recordEntries(props.data);

  return (
    <InfoCard
      label={props.title}
      value={
        entries.length ? (
          <div className="grid gap-2">
            {entries.slice(0, 8).map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-400">{props.formatFieldLabel(key)}</span>
                <span className="max-w-[60%] text-right text-sm text-slate-700">
                  {formatExtractedValue(
                    key,
                    value,
                    props.formatFieldValue,
                    props.formatConfidence,
                    props.formatExtractionSourceSummary
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : props.empty
      }
    />
  );
}

function ChevronDownIcon(props: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-4 w-4 transition-transform ${props.open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ConversationDetailPanel(props: {
  selectedThread: ThreadSummary | null;
  expanded: boolean;
  onToggle: () => void;
  leadReturnState: NavigationReturnState;
  location: { pathname: string; search: string };
  copy: CopyFn;
  formatEnum: (value: string) => string;
  formatFieldLabel: FormatFieldLabelFn;
  formatFieldValue: FormatFieldValueFn;
  formatConfidence: FormatConfidenceFn;
  formatExtractionSourceSummary: FormatExtractionSourceSummaryFn;
}) {
  const thread = props.selectedThread;
  const canToggle = Boolean(thread);
  const title = thread
    ? getLeadName(thread, props.copy({ en: "Zalo user", vi: "Người dùng Zalo" }))
    : props.copy({ en: "Conversation detail", vi: "Chi tiết hội thoại" });
  const subtitle = thread
    ? `${props.formatEnum(thread.channel)} • ${thread.messageCount} ${props.copy({ en: "messages", vi: "tin nhắn" })} • ${formatDateTime(thread.lastMessageAt)}`
    : undefined;

  return (
    <section className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <button
          type="button"
          onClick={canToggle ? props.onToggle : undefined}
          disabled={!canToggle}
          className="min-w-0 flex-1 rounded-xl text-left outline-none transition focus:ring-4 focus:ring-indigo-100 disabled:cursor-default"
          aria-expanded={canToggle ? props.expanded : undefined}
        >
          <h2 className="truncate text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {thread?.lead ? (
            <Link
              to={`/leads/${thread.lead.id}`}
              state={props.leadReturnState}
              onClick={() => saveRouteScroll(props.location)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {props.copy({ en: "Open lead", vi: "Mở ứng viên" })}
            </Link>
          ) : null}
          {canToggle ? (
            <button
              type="button"
              onClick={props.onToggle}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              aria-expanded={props.expanded}
              aria-label={props.expanded
                ? props.copy({ en: "Collapse conversation summary", vi: "Thu gọn thông tin hội thoại" })
                : props.copy({ en: "Expand conversation summary", vi: "Mở rộng thông tin hội thoại" })}
            >
              <ChevronDownIcon open={props.expanded} />
            </button>
          ) : null}
        </div>
      </header>

      {!thread ? (
        <div className="mt-4">
          <EmptyState
            title={props.copy({ en: "Select a conversation", vi: "Chọn một hội thoại" })}
            description={props.copy({
              en: "Conversation detail and messages will appear here.",
              vi: "Chi tiết hội thoại và tin nhắn sẽ hiển thị tại đây."
            })}
          />
        </div>
      ) : props.expanded ? (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <InfoCard label={props.copy({ en: "Lead phone", vi: "Số điện thoại" })} value={thread.lead?.phone || props.copy({ en: "Missing", vi: "Thiếu" })} />
          <InfoCard label={props.copy({ en: "External user", vi: "Mã người dùng Zalo" })} value={thread.externalId || "-"} />
          <InfoCard label={props.copy({ en: "Analyze status", vi: "Trạng thái phân tích" })} value={<Badge tone={toneForAnalyzeStatus(thread.analyzeStatus)}>{formatAnalyzeStatus(thread.analyzeStatus, props.copy)}</Badge>} />
          <ExtractedDataPanel
            title={props.copy({ en: "AI extracted data", vi: "Dữ liệu AI trích xuất" })}
            empty={props.copy({ en: "No extracted fields yet", vi: "Chưa có trường trích xuất" })}
            data={thread.lead?.aiExtractedData}
            formatFieldLabel={props.formatFieldLabel}
            formatFieldValue={props.formatFieldValue}
            formatConfidence={props.formatConfidence}
            formatExtractionSourceSummary={props.formatExtractionSourceSummary}
          />
          <ExtractedDataPanel
            title={props.copy({ en: "Verified profile data", vi: "Dữ liệu đã xác minh" })}
            empty={props.copy({ en: "No verified profile data", vi: "Chưa có dữ liệu xác minh" })}
            data={thread.lead?.verifiedProfileData}
            formatFieldLabel={props.formatFieldLabel}
            formatFieldValue={props.formatFieldValue}
            formatConfidence={props.formatConfidence}
            formatExtractionSourceSummary={props.formatExtractionSourceSummary}
          />
          <InfoCard
            label={props.copy({ en: "Source", vi: "Nguồn" })}
            value={props.formatEnum(thread.lead?.source || thread.channel)}
            hint={thread.lead?.status ? `${props.copy({ en: "Lead status", vi: "Trạng thái ứng viên" })}: ${props.formatEnum(thread.lead.status)}` : undefined}
          />
        </div>
      ) : null}
    </section>
  );
}

export function ConversationsPage() {
  const {
    copy,
    formatEnum,
    formatFieldLabel,
    formatFieldValue,
    formatConfidence,
    formatExtractionSourceSummary
  } = useI18n();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const channel = readStringOption(searchParams, "channel", CHANNEL_FILTER_OPTIONS, "zalo");
  const analyzeStatus = readStringOption(searchParams, "analyzeStatus", ANALYZE_STATUS_OPTIONS);
  const page = readPageIndex(searchParams);
  const selectedThreadId = searchParams.get("threadId") ?? "";
  const deferredSearch = useDeferredValue(search);
  const leadReturnState = createReturnState(location, copy({ en: "Conversations", vi: "Hội thoại" }));

  const updateConversationParams = (
    updates: Record<string, SearchParamValue>,
    options: { replace?: boolean } = {}
  ) => {
    setSearchParams(
      (current) => applySearchParamUpdates(current, updates, CONVERSATION_PARAM_DEFAULTS),
      { replace: options.replace }
    );
  };

  const threadsQuery = useThreadsQuery({
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    channel: channel === "all" ? undefined : channel,
    analyzeStatus: analyzeStatus || undefined,
    search: deferredSearch || undefined
  });

  const threads = threadsQuery.data?.data ?? [];
  const total = threadsQuery.data?.total ?? 0;
  useRestoreRouteScroll(location, !threadsQuery.isLoading);
  const selectedThreadDetailQuery = useThreadDetailQuery(selectedThreadId || undefined);
  const selectedThread = useMemo(() => {
    return threads.find((thread) => thread.id === selectedThreadId)
      ?? selectedThreadDetailQuery.data
      ?? (!selectedThreadId ? threads[0] ?? null : null);
  }, [selectedThreadId, selectedThreadDetailQuery.data, threads]);
  const [detailExpanded, setDetailExpanded] = useState(false);

  useEffect(() => {
    if (threadsQuery.isLoading) return;
    if (!selectedThreadId && threads.length) {
      updateConversationParams({ threadId: threads[0].id }, { replace: true });
    }
  }, [selectedThreadId, threads, threadsQuery.isLoading]);

  useEffect(() => {
    setDetailExpanded(false);
  }, [selectedThread?.id]);

  const messagesQuery = useThreadMessagesQuery(selectedThread?.id, {
    offset: 0,
    limit: MESSAGE_LIMIT
  });
  const messages = [...(messagesQuery.data?.data ?? [])].reverse();

  const stats = useMemo(() => {
    return {
      loaded: threads.length,
      needsPhone: threads.filter((thread) => thread.analyzeStatus === "needs_phone").length,
      unscanned: threads.reduce((sum, thread) => sum + thread.unscannedTextCount, 0),
      linkedLeads: threads.filter((thread) => Boolean(thread.lead)).length
    };
  }, [threads]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Zalo OA operations", vi: "Vận hành Zalo OA" })}
        title={copy({ en: "Conversation inbox", vi: "Hộp thư hội thoại" })}
        description={copy({
          en: "Inspect Zalo threads, recent messages, lead linkage, and extraction status from the CRM database.",
          vi: "Theo dõi hội thoại Zalo, tin nhắn gần đây, ứng viên liên kết và trạng thái AI trong CRM."
        })}
      />

      <FieldGroup columns={4}>
        <InfoCard label={copy({ en: "Loaded threads", vi: "Hội thoại đã tải" })} value={stats.loaded} hint={copy({ en: `${total} total matches`, vi: `${total} kết quả phù hợp` })} />
        <InfoCard label={copy({ en: "Linked leads", vi: "Ứng viên liên kết" })} value={stats.linkedLeads} hint={copy({ en: "Threads with CRM lead records", vi: "Có hồ sơ ứng viên trong CRM" })} />
        <InfoCard label={copy({ en: "Needs phone", vi: "Thiếu SĐT" })} value={stats.needsPhone} hint={copy({ en: "AI should keep enriching these", vi: "Cần bổ sung số điện thoại" })} />
        <InfoCard label={copy({ en: "Unscanned text", vi: "Tin nhắn chờ AI" })} value={stats.unscanned} hint={copy({ en: "Pending extraction worker", vi: "Đang chờ AI trích xuất" })} />
      </FieldGroup>

      <Toolbar>
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr_auto]">
          <Input
            label={copy({ en: "Search", vi: "Tìm kiếm" })}
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => {
                updateConversationParams({ q: value, page: null, threadId: null }, { replace: true });
              });
            }}
            placeholder={copy({ en: "Lead name, phone, or external Zalo id...", vi: "Tên ứng viên, số điện thoại hoặc mã Zalo..." })}
          />
          <Select
            label={copy({ en: "Channel", vi: "Kênh" })}
            value={channel}
            onChange={(event) => {
              updateConversationParams({ channel: event.target.value, page: null, threadId: null });
            }}
          >
            <option value="all">{copy({ en: "All channels", vi: "Tất cả kênh" })}</option>
            {CHANNEL_OPTIONS.map((value) => (
              <option key={value} value={value}>{formatEnum(value)}</option>
            ))}
          </Select>
          <Select
            label={copy({ en: "Extraction status", vi: "Trạng thái trích xuất" })}
            value={analyzeStatus}
            onChange={(event) => {
              updateConversationParams({ analyzeStatus: event.target.value, page: null, threadId: null });
            }}
          >
            <option value="">{copy({ en: "All statuses", vi: "Tất cả trạng thái" })}</option>
            {ANALYZE_STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>{formatAnalyzeStatus(value, copy)}</option>
            ))}
          </Select>
          <ToolbarActions className="justify-start xl:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                updateConversationParams({
                  q: null,
                  channel: null,
                  analyzeStatus: null,
                  page: null,
                  threadId: null
                });
              }}
            >
              {copy({ en: "Reset", vi: "Đặt lại" })}
            </Button>
          </ToolbarActions>
        </div>
      </Toolbar>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel
          title={copy({ en: "Thread queue", vi: "Danh sách hội thoại" })}
          subtitle={copy({
            en: "Latest active conversations from interaction storage.",
            vi: "Các hội thoại gần đây đã lưu trong CRM."
          })}
          action={
            <div className="flex items-center gap-2">
              {threadsQuery.isFetching ? (
                <Badge tone="warning">{copy({ en: "Refreshing", vi: "Đang tải lại" })}</Badge>
              ) : null}
              <RefreshButton
                label={copy({ en: "Refresh conversations", vi: "Tải lại hội thoại" })}
                refreshingLabel={copy({ en: "Refreshing conversations", vi: "Đang tải lại hội thoại" })}
                isRefreshing={threadsQuery.isFetching}
                onRefresh={() => void threadsQuery.refetch()}
              />
            </div>
          }
          className="xl:sticky xl:top-6 xl:flex xl:max-h-[calc(100vh-3rem)] xl:flex-col"
        >
          <div className="min-h-0 space-y-3 xl:flex-1 xl:overflow-y-auto xl:pr-1">
            {threads.length ? (
              threads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  selected={selectedThread?.id === thread.id}
                  onSelect={() => updateConversationParams({ threadId: thread.id })}
                  copy={copy}
                />
              ))
            ) : (
              <EmptyState
                title={copy({ en: "No conversations found", vi: "Chưa tìm thấy hội thoại" })}
                description={copy({
                  en: "Change filters or wait for new Zalo OA webhook messages to arrive.",
                  vi: "Đổi bộ lọc hoặc chờ tin nhắn webhook mới từ Zalo OA."
                })}
              />
            )}
          </div>
          <PaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            isFetching={threadsQuery.isFetching}
            itemLabel={copy({ en: "threads", vi: "hội thoại" })}
            pageLabel={copy({ en: "Page", vi: "Trang" })}
            previousLabel={copy({ en: "Previous", vi: "Trước" })}
            nextLabel={copy({ en: "Next", vi: "Sau" })}
            onPrevious={() => updateConversationParams({ page: Math.max(1, page), threadId: null })}
            onNext={() => updateConversationParams({ page: page + 2, threadId: null })}
            className="mt-4 shrink-0 border-slate-100 px-0 pb-0 pt-4"
          />
        </Panel>

        <div className="space-y-5">
          <ConversationDetailPanel
            selectedThread={selectedThread}
            expanded={detailExpanded}
            onToggle={() => setDetailExpanded((value) => !value)}
            leadReturnState={leadReturnState}
            location={location}
            copy={copy}
            formatEnum={formatEnum}
            formatFieldLabel={formatFieldLabel}
            formatFieldValue={formatFieldValue}
            formatConfidence={formatConfidence}
            formatExtractionSourceSummary={formatExtractionSourceSummary}
          />

          <Panel
            title={copy({ en: "Recent messages", vi: "Tin nhắn gần đây" })}
            subtitle={copy({
              en: "Messages are loaded from the database, not from live Zalo history.",
              vi: "Tin nhắn được tải từ dữ liệu đã lưu trong CRM, không phải lịch sử trực tiếp từ Zalo."
            })}
            action={messagesQuery.isFetching ? <Badge tone="warning">{copy({ en: "Loading", vi: "Đang tải" })}</Badge> : null}
          >
            <div className="max-h-[min(620px,calc(100vh-18rem))] space-y-3 overflow-y-auto rounded-[24px] border border-slate-200 bg-slate-50 p-4 pr-2">
              {messages.length ? (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} copy={copy} />
                ))
              ) : (
                <EmptyState
                  title={copy({ en: "No messages loaded", vi: "Chưa tải được tin nhắn" })}
                  description={copy({
                    en: "Select a thread with stored webhook messages or refresh after a new inbound event.",
                    vi: "Chọn luồng có tin nhắn webhook đã lưu hoặc tải lại sau khi có sự kiện mới."
                  })}
                />
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
