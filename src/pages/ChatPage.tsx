import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessagesSquare, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { MessagesSkeleton } from "@/components/shared/Loaders";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";
import { messagesQuery, sendMessage } from "@/services/messages.service";
import { roomQuery, roomsQuery } from "@/services/rooms.service";

export function ChatIndexPage() {
  const { t } = useI18n();
  const rooms = useQuery(roomsQuery());

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold">{t.nav.chat}</h1>
      {rooms.isLoading ? (
        <MessagesSkeleton />
      ) : (rooms.data ?? []).length === 0 ? (
        <EmptyState icon={MessagesSquare} title={t.common.empty} description={t.home.heroSubtitle} />
      ) : (
        <ul className="space-y-2">
          {(rooms.data ?? []).map((room) => (
            <li key={room.id}>
              <Link
                to="/chat/$slug"
                params={{ slug: room.slug }}
                className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-secondary/60"
              >
                <UserAvatar name={room.name} size="md" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{room.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {room.description ?? "—"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChatRoomPage({ slug }: { slug: string }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const room = useQuery(roomQuery(slug));
  const messages = useQuery(messagesQuery(room.data?.id));
  useRealtimeMessages(room.data?.id);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const send = useMutation({
    mutationFn: () =>
      sendMessage({ roomId: room.data!.id, userId: user!.id, content: draft }),
    onSuccess: () => setDraft(""),
    onError: (error: Error) => toast.error(error.message),
  });

  if (room.isLoading) return <MessagesSkeleton />;
  if (!room.data) {
    return <EmptyState icon={MessagesSquare} title={t.common.empty} description={t.common.error} />;
  }

  return (
    <div className="glass-strong flex h-[calc(100dvh-190px)] flex-col overflow-hidden rounded-3xl lg:h-[calc(100dvh-140px)]">
      <header className="flex min-w-0 items-center gap-3 border-b px-4 py-3">
        <UserAvatar name={room.data.name} size="sm" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-base font-bold">{room.data.name}</h1>
          <p className="truncate text-xs text-muted-foreground">{room.data.description ?? "—"}</p>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-slim p-4">
        {messages.isLoading ? (
          <MessagesSkeleton />
        ) : (messages.data ?? []).length === 0 ? (
          <EmptyState icon={MessagesSquare} title={t.common.empty} />
        ) : (
          (messages.data ?? []).map((message) => {
            const mine = message.user_id === user?.id;
            return (
              <div key={message.id} className={mine ? "flex flex-row-reverse gap-3" : "flex gap-3"}>
                <UserAvatar
                  name={message.author?.display_name || message.author?.username}
                  src={message.author?.avatar_url}
                  size="sm"
                />
                <div
                  className={
                    mine
                      ? "max-w-[75%] rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground"
                      : "max-w-[75%] rounded-2xl bg-secondary px-4 py-2.5 text-secondary-foreground"
                  }
                >
                  <p className="text-xs opacity-70">
                    {message.author?.display_name || message.author?.username || "—"}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                  <p className="mt-1 text-[10px] opacity-60">
                    {new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(message.created_at))}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim() && user) send.mutate();
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t.common.messagePlaceholder}
          aria-label={t.common.messagePlaceholder}
        />
        <Button type="submit" size="icon" disabled={!draft.trim() || send.isPending}>
          <SendHorizonal className="size-4 rtl:-scale-x-100" aria-hidden />
          <span className="sr-only">{t.common.send}</span>
        </Button>
      </form>
    </div>
  );
}