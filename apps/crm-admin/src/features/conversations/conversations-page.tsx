import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  EmptyState,
  FieldGroup,
  InfoCard,
  Input,
  Panel,
  SectionHeader,
  Select,
  Toolbar,
  ToolbarActions
} from "@social-crm/ui";
import { useThreadMessagesQuery, useThreadsQuery, type MessageRecord, type ThreadSummary } from "@social-crm/api";
import { useI18n } from "@/i18n";

const PAGE_SIZE = 20;
const MESSAGE_LIMIT = 50;

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
        <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{props.message.content || "(empty message)"}</div>
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
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("zalo");
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [page, setPage] = useState(0);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const deferredSearch = useDeferredValue(search);

  const threadsQuery = useThreadsQuery({
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    channel: channel || undefined,
    analyzeStatus: analyzeStatus || undefined,
    search: deferredSearch || undefined
  });

  const threads = threadsQuery.data?.data ?? [];
  const total = threadsQuery.data?.total ?? 0;
  const selectedThread = useMemo(() => {
    return threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null;
  }, [selectedThreadId, threads]);

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

  const hasPrevious = page > 0;
  const hasNext = threads.length >= PAGE_SIZE;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Zalo OA operations", vi: "Vận hành Zalo OA" })}
        title={copy({ en: "Conversation inbox", vi: "Hộp thoại hội thoại" })}
        description={copy({
          en: "Inspect Zalo threads, recent messages, lead linkage, and extraction status from the CRM database. CNV remains available under Integrations as a deprecated read source.",
          vi: "Theo dõi hội thoại Zalo, tin nhắn gần đây, liên kết lead và trạng thái trích xuất từ database CRM. CNV vẫn nằm trong Tích hợp như nguồn đọc đã deprecated."
        })}
      />

      <FieldGroup columns={4}>
        <InfoCard label={copy({ en: "Loaded threads", vi: "Luồng đã tải" })} value={stats.loaded} hint={copy({ en: `${total} total matches`, vi: `${total} kết quả phù hợp` })} />
        <InfoCard label={copy({ en: "Linked leads", vi: "Lead đã liên kết" })} value={stats.linkedLeads} hint={copy({ en: "Threads with CRM lead records", vi: "Luồng có bản ghi lead CRM" })} />
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
                setSearch(value);
                setPage(0);
              });
            }}
            placeholder={copy({ en: "Lead name, phone, or external Zalo id...", vi: "Tên lead, số điện thoại hoặc Zalo external id..." })}
          />
          <Select
            label={copy({ en: "Channel", vi: "Kênh" })}
            value={channel}
            onChange={(event) => {
              setChannel(event.target.value);
              setPage(0);
            }}
          >
            <option value="">{copy({ en: "All channels", vi: "Tất cả kênh" })}</option>
            <option value="zalo">Zalo</option>
            <option value="facebook">Facebook</option>
            <option value="miniapp">Mini app</option>
          </Select>
          <Select
            label={copy({ en: "Extraction status", vi: "Trạng thái trích xuất" })}
            value={analyzeStatus}
            onChange={(event) => {
              setAnalyzeStatus(event.target.value);
              setPage(0);
            }}
          >
            <option value="">{copy({ en: "All statuses", vi: "Tất cả trạng thái" })}</option>
            {["pending", "analyzing", "completed", "needs_phone"].map((value) => (
              <option key={value} value={value}>{formatEnum(value)}</option>
            ))}
          </Select>
          <ToolbarActions className="justify-start xl:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setChannel("zalo");
                setAnalyzeStatus("");
                setPage(0);
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
        >
          <div className="space-y-3">
            {threads.length ? (
              threads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  selected={selectedThread?.id === thread.id}
                  onSelect={() => setSelectedThreadId(thread.id)}
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
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              {copy({ en: `Page ${page + 1}, ${total} total`, vi: `Trang ${page + 1}, tổng ${total}` })}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={!hasPrevious || threadsQuery.isFetching}>
                {copy({ en: "Previous", vi: "Trước" })}
              </Button>
              <Button variant="secondary" onClick={() => setPage((current) => current + 1)} disabled={!hasNext || threadsQuery.isFetching}>
                {copy({ en: "Next", vi: "Sau" })}
              </Button>
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel
            title={selectedThread ? getLeadName(selectedThread) : copy({ en: "Conversation detail", vi: "Chi tiết hội thoại" })}
            subtitle={selectedThread ? `${selectedThread.channel} • ${selectedThread.messageCount} messages • ${formatDateTime(selectedThread.lastMessageAt)}` : undefined}
            action={selectedThread?.lead ? (
              <Link to={`/leads/${selectedThread.lead.id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                {copy({ en: "Open lead", vi: "Mở lead" })}
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
                  hint={selectedThread.lead?.status ? `${copy({ en: "Lead status", vi: "Trạng thái lead" })}: ${formatEnum(selectedThread.lead.status)}` : undefined}
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
            <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
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
