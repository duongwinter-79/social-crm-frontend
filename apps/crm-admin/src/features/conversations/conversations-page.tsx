import { startTransition, useDeferredValue, useEffect, useMemo } from "react";
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
import { createReturnState } from "@/app/navigation-state";
import { applySearchParamUpdates, readPageIndex, readStringOption, type SearchParamValue } from "@/app/search-params";
import { MessageImageAttachment } from "@/components/message-image-attachment";
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

function getLeadName(thread?: ThreadSummary | null) {
  return thread?.lead?.fullName || thread?.externalId || "Zalo user";
}

function recordEntries(record?: Record<string, unknown> | null) {
  if (!record) return [];
  return Object.entries(record).filter(([, value]) => value !== null && value !== undefined && value !== "");
}

function ThreadCard(props: {
  thread: ThreadSummary;
  selected: boolean;
  onSelect: () => void;
  formatEnum: (value: string) => string;
}) {
  const leadName = getLeadName(props.thread);
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
          <div className="mt-1 text-xs text-slate-500">{props.thread.lead?.phone || props.thread.externalId || "No phone"}</div>
        </div>
        <Badge tone={toneForAnalyzeStatus(props.thread.analyzeStatus)}>{props.formatEnum(props.thread.analyzeStatus)}</Badge>
      </div>
      <div className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{previewText(lastMessage?.content)}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{formatDateTime(lastMessage?.createdAt ?? props.thread.lastMessageAt)}</span>
        <span>•</span>
        <span>{props.thread.messageCount} messages</span>
        {props.thread.unscannedTextCount > 0 ? (
          <>
            <span>•</span>
            <span className="font-semibold text-amber-700">{props.thread.unscannedTextCount} unscanned</span>
          </>
        ) : null}
      </div>
    </button>
  );
}

function MessageBubble(props: { message: MessageRecord; formatEnum: (value: string) => string }) {
  const inbound = props.message.direction === "inbound";
  const isImage = props.message.type === "image";

  return (
    <div className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[82%] rounded-[22px] border px-4 py-3 ${
        inbound ? "border-slate-200 bg-white" : "border-indigo-200 bg-indigo-50"
      }`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={toneForDirection(props.message.direction)}>{props.formatEnum(props.message.direction)}</Badge>
          <Badge tone="neutral">{props.formatEnum(props.message.type)}</Badge>
          {props.message.aiScannedAt ? <Badge tone="success">AI scanned</Badge> : <Badge tone="warning">Pending AI</Badge>}
        </div>
        <MessageImageAttachment message={props.message} alt="Zalo image" openTitle="Open full image" />
        {!isImage ? (
          <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
            {props.message.content || "(empty message)"}
          </div>
        ) : !props.message.mediaUrl ? (
          <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">[Image - no URL]</div>
        ) : null}
        <div className="mt-2 text-xs text-slate-400">{formatDateTime(props.message.createdAt)}</div>
        {props.message.rawPayload ? (
          <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-slate-500">Raw webhook payload</summary>
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
                <span className="text-xs uppercase tracking-[0.12em] text-slate-400">{key}</span>
                <span className="max-w-[60%] text-right text-sm text-slate-700">{textValue(value)}</span>
              </div>
            ))}
          </div>
        ) : props.empty
      }
    />
  );
}

export function ConversationsPage() {
  const { copy, formatEnum } = useI18n();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const channel = readStringOption(searchParams, "channel", CHANNEL_FILTER_OPTIONS, "zalo");
  const analyzeStatus = readStringOption(searchParams, "analyzeStatus", ANALYZE_STATUS_OPTIONS);
  const page = readPageIndex(searchParams);
  const selectedThreadId = searchParams.get("threadId") ?? "";
  const deferredSearch = useDeferredValue(search);
  const leadReturnState = createReturnState(location, copy({ en: "Conversations", vi: "Conversations" }));

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
  const selectedThreadDetailQuery = useThreadDetailQuery(selectedThreadId || undefined);
  const selectedThread = useMemo(() => {
    return threads.find((thread) => thread.id === selectedThreadId)
      ?? selectedThreadDetailQuery.data
      ?? (!selectedThreadId ? threads[0] ?? null : null);
  }, [selectedThreadId, selectedThreadDetailQuery.data, threads]);

  useEffect(() => {
    if (threadsQuery.isLoading) return;
    if (!selectedThreadId && threads.length) {
      updateConversationParams({ threadId: threads[0].id }, { replace: true });
    }
  }, [selectedThreadId, threads, threadsQuery.isLoading]);

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
        title={copy({ en: "Conversation inbox", vi: "Hộp thoại hội thoại" })}
        description={copy({
          en: "Inspect Zalo threads, recent messages, lead linkage, and extraction status from the CRM database.",
          vi: "Theo dõi hội thoại Zalo, tin nhắn gần đây, liên kết ứng viên và trạng thái trích xuất từ database CRM."
        })}
      />

      <FieldGroup columns={4}>
        <InfoCard label={copy({ en: "Loaded threads", vi: "Luồng đã tải" })} value={stats.loaded} hint={copy({ en: `${total} total matches`, vi: `${total} kết quả phù hợp` })} />
        <InfoCard label={copy({ en: "Linked leads", vi: "Ứng viên đã liên kết" })} value={stats.linkedLeads} hint={copy({ en: "Threads with CRM lead records", vi: "Luồng có bản ghi ứng viên CRM" })} />
        <InfoCard label={copy({ en: "Needs phone", vi: "Thiếu số điện thoại" })} value={stats.needsPhone} hint={copy({ en: "AI should keep enriching these", vi: "AI cần tiếp tục bổ sung" })} />
        <InfoCard label={copy({ en: "Unscanned text", vi: "Tin nhắn chưa quét" })} value={stats.unscanned} hint={copy({ en: "Pending extraction worker", vi: "Đang chờ worker trích xuất" })} />
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
            placeholder={copy({ en: "Lead name, phone, or external Zalo id...", vi: "Tên ứng viên, số điện thoại hoặc Zalo external id..." })}
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
              <option key={value} value={value}>{formatEnum(value)}</option>
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
            vi: "Các hội thoại hoạt động gần nhất từ kho tương tác."
          })}
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
                  formatEnum={formatEnum}
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
            itemLabel={copy({ en: "threads", vi: "luồng" })}
            pageLabel={copy({ en: "Page", vi: "Trang" })}
            previousLabel={copy({ en: "Previous", vi: "Trước" })}
            nextLabel={copy({ en: "Next", vi: "Sau" })}
            onPrevious={() => updateConversationParams({ page: Math.max(1, page), threadId: null })}
            onNext={() => updateConversationParams({ page: page + 2, threadId: null })}
            className="mt-4 shrink-0 border-slate-100 px-0 pb-0 pt-4"
          />
        </Panel>

        <div className="space-y-5">
          <Panel
            title={selectedThread ? getLeadName(selectedThread) : copy({ en: "Conversation detail", vi: "Chi tiết hội thoại" })}
            subtitle={selectedThread ? `${selectedThread.channel} • ${selectedThread.messageCount} messages • ${formatDateTime(selectedThread.lastMessageAt)}` : undefined}
            action={selectedThread?.lead ? (
              <Link
                to={`/leads/${selectedThread.lead.id}`}
                state={leadReturnState}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {copy({ en: "Open lead", vi: "Mở ứng viên" })}
              </Link>
            ) : null}
          >
            {selectedThread ? (
              <div className="grid gap-4 md:grid-cols-3">
                <InfoCard label={copy({ en: "Lead phone", vi: "Số điện thoại" })} value={selectedThread.lead?.phone || copy({ en: "Missing", vi: "Thiếu" })} />
                <InfoCard label={copy({ en: "External user", vi: "Người dùng ngoài" })} value={selectedThread.externalId || "-"} />
                <InfoCard label={copy({ en: "Analyze status", vi: "Trạng thái phân tích" })} value={<Badge tone={toneForAnalyzeStatus(selectedThread.analyzeStatus)}>{formatEnum(selectedThread.analyzeStatus)}</Badge>} />
                <ExtractedDataPanel
                  title={copy({ en: "AI extracted data", vi: "Dữ liệu AI trích xuất" })}
                  empty={copy({ en: "No extracted fields yet", vi: "Chưa có trường trích xuất" })}
                  data={selectedThread.lead?.aiExtractedData}
                />
                <ExtractedDataPanel
                  title={copy({ en: "Verified profile data", vi: "Dữ liệu đã xác minh" })}
                  empty={copy({ en: "No verified profile data", vi: "Chưa có dữ liệu xác minh" })}
                  data={selectedThread.lead?.verifiedProfileData}
                />
                <InfoCard
                  label={copy({ en: "Source", vi: "Nguồn" })}
                  value={selectedThread.lead?.source || selectedThread.channel}
                  hint={selectedThread.lead?.status ? `${copy({ en: "Lead status", vi: "Trạng thái ứng viên" })}: ${formatEnum(selectedThread.lead.status)}` : undefined}
                />
              </div>
            ) : (
              <EmptyState
                title={copy({ en: "Select a conversation", vi: "Chọn một hội thoại" })}
                description={copy({
                  en: "Conversation detail and messages will appear here.",
                  vi: "Chi tiết hội thoại và tin nhắn sẽ hiển thị tại đây."
                })}
              />
            )}
          </Panel>

          <Panel
            title={copy({ en: "Recent messages", vi: "Tin nhắn gần đây" })}
            subtitle={copy({
              en: "Messages are loaded from the database, not from live Zalo history.",
              vi: "Tin nhắn được tải từ database, không phải lịch sử trực tiếp từ Zalo."
            })}
            action={messagesQuery.isFetching ? <Badge tone="warning">{copy({ en: "Loading", vi: "Đang tải" })}</Badge> : null}
          >
            <div className="max-h-[min(620px,calc(100vh-18rem))] space-y-3 overflow-y-auto rounded-[24px] border border-slate-200 bg-slate-50 p-4 pr-2">
              {messages.length ? (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} formatEnum={formatEnum} />
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
