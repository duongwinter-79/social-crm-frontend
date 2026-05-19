import { Link } from "react-router-dom";
import { Badge, EmptyState } from "@social-crm/ui";
import { useThreadMessagesQuery, type MessageRecord } from "@social-crm/api";
import { useI18n } from "../../i18n";

/** Minimal thread shape — accepts both ThreadSummary and Lead.threads[i]. */
interface ThreadLike {
    id: string;
    channel?: string;
}

const INLINE_MESSAGE_LIMIT = 30;

function formatDateTime(value?: string | null) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(new Date(value));
}

function MessageBubble(props: { message: MessageRecord; formatEnum: (value: string) => string }) {
    const inbound = props.message.direction === "inbound";

    return (
        <div className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
            <div
                className={`max-w-[82%] rounded-[20px] border px-4 py-3 ${inbound ? "border-slate-200 bg-white" : "border-indigo-200 bg-indigo-50"
                    }`}
            >
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone={inbound ? "accent" : "neutral"}>
                        {props.formatEnum(props.message.direction)}
                    </Badge>
                    <Badge tone="neutral">{props.formatEnum(props.message.type)}</Badge>
                    {props.message.aiScannedAt ? (
                        <Badge tone="success">AI</Badge>
                    ) : null}
                </div>
                {props.message.type === "image" && props.message.mediaUrl ? (
                    <a
                        href={`/api/interactions/messages/${props.message.id}/media`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Mở ảnh đầy đủ"
                    >
                        <img
                            src={
                                props.message.thumbnailUrl
                                    ? `/api/interactions/messages/${props.message.id}/thumbnail`
                                    : `/api/interactions/messages/${props.message.id}/media`
                            }
                            alt="Ảnh Zalo"
                            className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            onError={(e) => {
                                const img = e.currentTarget;
                                img.style.display = "none";
                                const fallback = img.parentElement?.nextElementSibling as HTMLElement | null;
                                if (fallback) fallback.style.display = "block";
                            }}
                        />
                    </a>
                ) : null}
                <div
                    className="whitespace-pre-wrap text-sm leading-6 text-slate-800"
                    style={props.message.type === "image" && props.message.mediaUrl ? { display: "none" } : undefined}
                >
                    {props.message.type === "image"
                        ? (props.message.mediaUrl ? "[Không tải được ảnh]" : "[Ảnh — không có URL]")
                        : (props.message.content || "(empty message)")}
                </div>
                <div className="mt-1.5 text-xs text-slate-400">{formatDateTime(props.message.createdAt)}</div>
            </div>
        </div>
    );
}

/**
 * Inline conversation panel for the lead workbench (P0-2A).
 *
 * Shows the latest N messages from the lead's first thread directly on the
 * workbench so the operator can read the conversation while reviewing AI
 * suggestions and qualification fields. For full thread navigation across
 * leads, link to /conversations.
 *
 * After P0-2B the message list includes both directions — inbound from the
 * candidate, outbound when the admin replied via the Zalo OA admin app.
 */
export function LeadConversationInline(props: { thread: ThreadLike | undefined }) {
    const { copy, formatEnum } = useI18n();
    const threadId = props.thread?.id;

    const messagesQuery = useThreadMessagesQuery(threadId, {
        offset: 0,
        limit: INLINE_MESSAGE_LIMIT
    });

    if (!threadId) {
        return (
            <EmptyState
                title={copy({ en: "No thread on this lead", vi: "Ứng viên này chưa có hội thoại" })}
                description={copy({
                    en: "An inbound Zalo message will create a thread automatically.",
                    vi: "Tin nhắn Zalo đến đầu tiên sẽ tự động tạo thread."
                })}
            />
        );
    }

    if (messagesQuery.isLoading) {
        return <div className="text-sm text-slate-500">{copy({ en: "Loading messages…", vi: "Đang tải tin nhắn…" })}</div>;
    }

    const messages = messagesQuery.data?.data ?? [];
    const chronologicalMessages = [...messages].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
    });
    const total = messagesQuery.data?.total ?? messages.length;

    if (messages.length === 0) {
        return (
            <EmptyState
                title={copy({ en: "Thread is empty", vi: "Thread trống" })}
                description={copy({
                    en: "No stored messages on this thread yet.",
                    vi: "Thread chưa có tin nhắn nào được lưu."
                })}
            />
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <Badge tone="accent">{props.thread?.channel?.toUpperCase()}</Badge>
                    <span>
                        {copy({
                            en: `Showing latest ${messages.length} of ${total}`,
                            vi: `Hiển thị ${messages.length} / ${total} tin nhắn gần nhất`
                        })}
                    </span>
                </div>
                <Link
                    to="/conversations"
                    className="text-indigo-600 hover:text-indigo-500 underline"
                >
                    {copy({ en: "Open in Conversations →", vi: "Mở trong Conversations →" })}
                </Link>
            </div>

            <div className="max-h-[480px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {chronologicalMessages.map((m) => (
                    <MessageBubble key={m.id} message={m} formatEnum={formatEnum} />
                ))}
            </div>
        </div>
    );
}
