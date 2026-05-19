import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, type MessageRecord } from "@social-crm/api";

export function MessageImageAttachment(props: { message: MessageRecord; alt: string; openTitle: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const mediaQuery = useQuery({
    queryKey: ["messages", props.message.id, "media"],
    queryFn: () => apiClient.getMessageMedia(props.message.id),
    enabled: props.message.type === "image" && Boolean(props.message.mediaUrl),
    staleTime: 60 * 60 * 1000
  });

  useEffect(() => {
    if (!mediaQuery.data) {
      setObjectUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(mediaQuery.data);
    setObjectUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [mediaQuery.data]);

  if (props.message.type !== "image" || !props.message.mediaUrl) return null;

  if (mediaQuery.isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">Loading image...</div>;
  }

  if (!objectUrl) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">Could not load image</div>;
  }

  return (
    <a href={objectUrl} target="_blank" rel="noopener noreferrer" title={props.openTitle}>
      <img
        src={objectUrl}
        alt={props.alt}
        className="max-w-full cursor-pointer rounded-xl transition-opacity hover:opacity-90"
      />
    </a>
  );
}
