import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  Ban,
  Check,
  ChevronUp,
  Copy,
  Flag,
  MessagesSquare,
  MoreVertical,
  Pencil,
  Reply,
  SendHorizonal,
  ShieldOff,
  Trash2,
  UserX,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { MessagesSkeleton } from "@/components/shared/Loaders";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { MembersPanel } from "@/components/chat/MembersPanel";
import { ReportDialog } from "@/components/chat/ReportDialog";
import { VoiceRoomDock } from "@/components/voice/VoiceRoomDock";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { useSounds } from "@/contexts/sound-context";
import { useRoomPresence } from "@/hooks/use-presence";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";
import { dayKey, dayLabel, relativeTime, timeOfDay } from "@/lib/time";
import { supabase } from "@/integrations/supabase/client";
import {
  MAX_MESSAGE_LENGTH,
  MESSAGE_PAGE_SIZE,
  deleteMessage,
  editMessage,
  fetchMessagePage,
  sendMessage,
} from "@/services/messages.service";
import { profileQuery } from "@/services/profiles.service";
import { myRolesQuery } from "@/services/roles.service";
import {
  blockUser,
  myBlocksQuery,
  restrictInRoom,
  roomRestrictionsQuery,
} from "@/services/moderation.service";
import { roomMembersQuery, roomQuery, roomsWithStatsQuery } from "@/services/rooms.service";
import type { Message, MessageWithAuthor, Profile } from "@/types";

const SEND_COOLDOWN_MS = 1200;

export function ChatIndexPage() {
  const { t, locale } = useI18n();
  const rooms = useQuery(roomsWithStatsQuery());

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
                className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UserAvatar name={room.name} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{room.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {room.description ?? "—"}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(room.last_message_at ?? room.last_activity_at, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function highlight(content: string, myUsername: string | undefined) {
  const parts = content.split(/(@[\p{L}\p{N}_.-]+)/gu);
  return parts.map((part, index) => {
    if (!part.startsWith("@")) return <span key={index}>{part}</span>;
    const mine = myUsername && part.slice(1).toLowerCase() === myUsername.toLowerCase();
    return (
      <span
        key={index}
        className={mine ? "rounded bg-primary/25 px-1 font-medium text-primary" : "rounded bg-secondary px-1 font-medium"}
      >
        {part}
      </span>
    );
  });
}

export function ChatRoomPage({ slug }: { slug: string }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { play } = useSounds();

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<MessageWithAuthor | null>(null);
  const [editing, setEditing] = useState<MessageWithAuthor | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MessageWithAuthor | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSentAt = useRef(0);
  const lastSentBody = useRef("");

  const room = useQuery(roomQuery(slug));
  const roomId = room.data?.id;
  const profile = useQuery(profileQuery(user?.id));
  const roles = useQuery(myRolesQuery(user?.id));
  const members = useQuery(roomMembersQuery(roomId));
  const blocks = useQuery(myBlocksQuery(user?.id));
  const restrictions = useQuery(roomRestrictionsQuery(roomId));

  const messages = useInfiniteQuery({
    queryKey: ["messages", roomId],
    enabled: Boolean(roomId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchMessagePage(roomId!, pageParam),
    getNextPageParam: (lastPage) => lastPage.length < MESSAGE_PAGE_SIZE ? undefined : (lastPage[0]?.created_at ?? undefined),
  });

  const presenceMe = useMemo(
    () => user ? {
      userId: user.id,
      displayName: profile.data?.display_name || profile.data?.username || "عضو",
      avatarUrl: profile.data?.avatar_url ?? null,
    } : null,
    [user, profile.data?.display_name, profile.data?.username, profile.data?.avatar_url],
  );
  const presence = useRoomPresence(roomId, presenceMe);
  const blockedIds = useMemo(() => new Set((blocks.data ?? []).map((b) => b.blocked_id)), [blocks.data]);
  const myRestrictions = useMemo(() => (restrictions.data ?? []).filter((r) => r.user_id === user?.id), [restrictions.data, user?.id]);
  const isBanned = myRestrictions.some((r) => r.kind === "ban");
  const isMuted = myRestrictions.some((r) => r.kind === "mute");
  const canModerate = Boolean(roles.data?.isStaff) || (room.data?.owner_id != null && room.data.owner_id === user?.id);

  const items = useMemo(() => {
    const pages = messages.data?.pages ?? [];
    const flat = [...pages].reverse().flat();
    const seen = new Set<string>();
    return flat.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return !blockedIds.has(m.user_id);
    });
  }, [messages.data, blockedIds]);
  const byId = useMemo(() => new Map(items.map((m) => [m.id, m])), [items]);

  const appendIncoming = useCallback(async (message: Message) => {
    if (!roomId) return;
    let author: Profile | null = (members.data ?? []).find((m) => m.id === message.user_id) ?? null;
    if (!author) {
      const { data } = await supabase.from("profiles").select("*").eq("id", message.user_id).maybeSingle();
      author = data ?? null;
    }
    queryClient.setQueryData<{ pages: MessageWithAuthor[][]; pageParams: unknown[] }>(["messages", roomId], (prev) => {
      if (!prev) return prev;
      const pages = prev.pages.map((page) => page.slice());
      const first = pages[0];
      if (!first) return prev;
      if (prev.pages.some((page) => page.some((m) => m.id === message.id))) return prev;
      first.push({ ...message, author });
      return { ...prev, pages };
    });
    if (message.user_id !== user?.id) {
      const mentioned = profile.data?.username && message.content.toLowerCase().includes(`@${profile.data.username.toLowerCase()}`);
      play(mentioned ? "mention" : "message");
      if (!atBottom) setUnseen((count) => count + 1);
    }
  }, [roomId, members.data, queryClient, user?.id, profile.data?.username, play, atBottom]);

  useRealtimeMessages(roomId, {
    onInsert: (message) => void appendIncoming(message),
    onChange: (message) => {
      queryClient.setQueryData<{ pages: MessageWithAuthor[][]; pageParams: unknown[] }>(["messages", roomId], (prev) => prev ? {
        ...prev,
        pages: prev.pages.map((page) => page.map((m) => (m.id === message.id ? { ...m, ...message } : m))),
      } : prev);
    },
  });

  useEffect(() => {
    if (!atBottom) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
    setUnseen(0);
  }, [items.length, atBottom]);

  const onScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    const near = distance < 120;
    setAtBottom(near);
    if (near) setUnseen(0);
  }, []);

  const jumpToLatest = () => {
    setAtBottom(true);
    setUnseen(0);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const send = useMutation({
    mutationFn: (content: string) => sendMessage({ roomId: roomId!, userId: user!.id, content, replyToId: replyTo?.id ?? null }),
    onMutate: (content: string) => {
      const optimistic: MessageWithAuthor = {
        id: `optimistic-${crypto.randomUUID()}`,
        room_id: roomId!, user_id: user!.id, content,
        created_at: new Date().toISOString(), reply_to_id: replyTo?.id ?? null,
        edited_at: null, is_deleted: false, author: profile.data ?? null,
      };
      queryClient.setQueryData<{ pages: MessageWithAuthor[][]; pageParams: unknown[] }>(["messages", roomId], (prev) => {
        if (!prev) return prev;
        const pages = prev.pages.map((page) => page.slice());
        pages[0]?.push(optimistic);
        return { ...prev, pages };
      });
      setAtBottom(true);
      return { optimisticId: optimistic.id };
    },
    onError: (error: Error, _content, context) => {
      queryClient.setQueryData<{ pages: MessageWithAuthor[][]; pageParams: unknown[] }>(["messages", roomId], (prev) => prev ? {
        ...prev,
        pages: prev.pages.map((page) => page.filter((m) => m.id !== context?.optimisticId)),
      } : prev);
      toast.error(error.message.includes("row-level security") ? t.chat.muted : error.message);
    },
    onSuccess: () => {
      setReplyTo(null);
      void queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
    },
  });

  const saveEdit = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => editMessage(id, content),
    onSuccess: () => setEditing(null),
    onError: (error: Error) => toast.error(error.message),
  });
  const removeMessage = useMutation({
    mutationFn: (id: string) => deleteMessage(id),
    onSuccess: () => setPendingDelete(null),
    onError: (error: Error) => toast.error(error.message),
  });
  const block = useMutation({
    mutationFn: (targetId: string) => blockUser(user!.id, targetId),
    onSuccess: () => { toast.success(t.moderation.blocked); void queryClient.invalidateQueries({ queryKey: ["user_blocks"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const restrict = useMutation({
    mutationFn: ({ targetId, kind }: { targetId: string; kind: "ban" | "mute" }) => restrictInRoom({ roomId: roomId!, userId: targetId, kind, createdBy: user!.id }),
    onSuccess: (_data, variables) => { toast.success(variables.kind === "ban" ? t.moderation.banned : t.moderation.muted); void queryClient.invalidateQueries({ queryKey: ["room_moderation", roomId] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleSubmit() {
    const content = draft.trim();
    if (!content || !roomId || !user) return;
    if (content.length > MAX_MESSAGE_LENGTH) { toast.error(t.chat.tooLong); return; }
    const now = Date.now();
    if (now - lastSentAt.current < SEND_COOLDOWN_MS) { toast.warning(t.chat.tooFast); return; }
    if (content === lastSentBody.current && now - lastSentAt.current < 30_000) return;
    lastSentAt.current = now;
    lastSentBody.current = content;
    setDraft("");
    send.mutate(content);
  }

  if (room.isLoading) return <MessagesSkeleton />;
  if (!room.data) return <EmptyState icon={MessagesSquare} title={t.common.empty} description={t.common.error} />;
  const remaining = MAX_MESSAGE_LENGTH - draft.length;

  return (
    <div className="flex gap-4">
      <div className="glass-strong flex h-[calc(100dvh-190px)] min-w-0 flex-1 flex-col overflow-hidden rounded-3xl lg:h-[calc(100dvh-140px)]">
        <header className="flex min-w-0 items-center gap-3 border-b px-4 py-3">
          <UserAvatar name={room.data.name} size="sm" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-bold">{room.data.name}</h1>
            <p className="truncate text-xs text-muted-foreground">{room.data.description ?? "—"}{room.data.country ? ` · ${room.data.country}` : ""}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 gap-1"><span className="size-2 rounded-full bg-success" aria-hidden />{presence.online.length} {t.chat.online}</Badge>
        </header>

        <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 space-y-3 overflow-y-auto scrollbar-slim p-4">
          {messages.hasNextPage ? <div className="flex justify-center"><Button variant="ghost" size="sm" onClick={() => void messages.fetchNextPage()} disabled={messages.isFetchingNextPage}><ChevronUp className="size-4" aria-hidden />{messages.isFetchingNextPage ? t.common.loading : t.chat.loadMore}</Button></div> : null}
          {messages.isLoading ? <MessagesSkeleton /> : items.length === 0 ? <EmptyState icon={MessagesSquare} title={t.chat.noMessages} description={t.chat.startConversation} /> : items.map((message, index) => {
            const mine = message.user_id === user?.id;
            const previous = items[index - 1];
            const showDay = !previous || dayKey(previous.created_at) !== dayKey(message.created_at);
            const parent = message.reply_to_id ? byId.get(message.reply_to_id) : undefined;
            const authorName = message.author?.display_name || message.author?.username || "—";
            return (
              <div key={message.id} className="space-y-3">
                {showDay ? <div className="flex items-center gap-3" role="separator"><span className="h-px flex-1 bg-border" /><span className="text-[11px] text-muted-foreground">{dayLabel(message.created_at, locale, t.chat)}</span><span className="h-px flex-1 bg-border" /></div> : null}
                <div className={mine ? "group flex flex-row-reverse gap-3" : "group flex gap-3"}>
                  <UserAvatar name={authorName} src={message.author?.avatar_url} size="sm" status={presence.onlineIds.has(message.user_id) ? "online" : undefined} />
                  <div className="min-w-0 max-w-[78%]">
                    <div className={mine ? "rounded-2xl rounded-te-sm bg-primary px-4 py-2.5 text-primary-foreground" : "rounded-2xl rounded-ts-sm bg-secondary px-4 py-2.5 text-secondary-foreground"}>
                      <p className="text-xs opacity-70">{authorName}</p>
                      {parent ? <p className="mt-1 truncate border-s-2 border-current/40 ps-2 text-[11px] opacity-70">{parent.author?.display_name || parent.author?.username || "—"}: {parent.is_deleted ? t.chat.deleted : parent.content}</p> : null}
                      {message.is_deleted ? <p className="text-sm italic opacity-60">{t.chat.deleted}</p> : editing?.id === message.id ? (
                        <div className="mt-1 space-y-2"><Textarea value={editing.content} onChange={(event) => setEditing({ ...editing, content: event.target.value })} className="min-h-16 bg-background text-foreground" aria-label={t.chat.edit} /><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => saveEdit.mutate({ id: message.id, content: editing.content })} disabled={saveEdit.isPending || !editing.content.trim()}><Check className="size-3.5" aria-hidden /> {t.common.save}</Button><Button size="sm" variant="ghost" onClick={() => setEditing(null)}>{t.common.cancel}</Button></div></div>
                      ) : <p className="whitespace-pre-wrap break-words text-sm">{highlight(message.content, profile.data?.username)}</p>}
                      <p className="mt-1 flex items-center gap-2 text-[10px] opacity-60">{timeOfDay(message.created_at, locale)}{message.edited_at ? <span>· {t.chat.edited}</span> : null}</p>
                    </div>
                  </div>
                  {!message.is_deleted && !message.id.startsWith("optimistic-") ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={t.chat.reply} className="size-8 self-center opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"><MoreVertical className="size-4" aria-hidden /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuItem onClick={() => setReplyTo(message)}><Reply className="size-4" /> {t.chat.reply}</DropdownMenuItem><DropdownMenuItem onClick={() => { void navigator.clipboard.writeText(message.content); toast.success(t.chat.copied); }}><Copy className="size-4" /> {t.chat.copy}</DropdownMenuItem>{mine ? <DropdownMenuItem onClick={() => setEditing(message)}><Pencil className="size-4" /> {t.chat.edit}</DropdownMenuItem> : null}{mine || canModerate ? <DropdownMenuItem onClick={() => setPendingDelete(message)} className="text-destructive"><Trash2 className="size-4" /> {t.chat.delete}</DropdownMenuItem> : null}{!mine ? <><DropdownMenuSeparator /><ReportDialog roomId={roomId ?? null} messageId={message.id} targetUserId={message.user_id} trigger={<DropdownMenuItem onSelect={(event) => event.preventDefault()}><Flag className="size-4" /> {t.moderation.report}</DropdownMenuItem>} /><DropdownMenuItem onClick={() => block.mutate(message.user_id)}><UserX className="size-4" /> {t.moderation.block}</DropdownMenuItem>{canModerate ? <><DropdownMenuItem onClick={() => restrict.mutate({ targetId: message.user_id, kind: "mute" })}><VolumeX className="size-4" /> {t.moderation.mute}</DropdownMenuItem><DropdownMenuItem onClick={() => restrict.mutate({ targetId: message.user_id, kind: "ban" })}><Ban className="size-4" /> {t.moderation.ban}</DropdownMenuItem></> : null}</> : null}</DropdownMenuContent></DropdownMenu> : null}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {unseen > 0 && !atBottom ? <div className="pointer-events-none relative"><Button size="sm" onClick={jumpToLatest} className="pointer-events-auto absolute -top-14 inset-x-0 mx-auto w-fit shadow-glow"><ArrowDown className="size-4" aria-hidden /> {unseen} {t.chat.newMessages}</Button></div> : null}

        {replyTo ? <div className="flex items-center gap-2 border-t bg-secondary/40 px-4 py-2 text-xs"><Reply className="size-3.5 shrink-0 text-primary" aria-hidden /><span className="min-w-0 flex-1 truncate">{t.chat.replyingTo} {replyTo.author?.display_name || replyTo.author?.username}: {replyTo.content}</span><Button variant="ghost" size="icon" className="size-7" onClick={() => setReplyTo(null)} aria-label={t.chat.cancelReply}><X className="size-3.5" /></Button></div> : null}

        {isBanned || isMuted ? (
          <div className="flex items-center gap-2 border-t bg-destructive/10 px-4 py-3 text-sm text-destructive"><ShieldOff className="size-4" aria-hidden />{isBanned ? t.chat.banned : t.chat.muted}</div>
        ) : (
          <>
            <VoiceRoomDock roomName={room.data.name} />
            <form className="flex items-end gap-2 border-t p-3" onSubmit={(event) => { event.preventDefault(); handleSubmit(); }}>
              <div className="min-w-0 flex-1">
                <Textarea value={draft} onChange={(event) => setDraft(event.target.value.slice(0, MAX_MESSAGE_LENGTH))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSubmit(); } }} placeholder={t.common.messagePlaceholder} aria-label={t.common.messagePlaceholder} className="max-h-32 min-h-11 resize-none" />
                {draft.length > MAX_MESSAGE_LENGTH - 200 ? <p className="mt-1 text-[11px] text-muted-foreground">{remaining} {t.chat.charsLeft}</p> : null}
              </div>
              <Button type="submit" size="icon" className="size-11" disabled={!draft.trim() || send.isPending || !user} aria-label={t.common.send}><SendHorizonal className="size-4 rtl:-scale-x-100" aria-hidden /></Button>
            </form>
          </>
        )}
      </div>

      <MembersPanel members={members.data ?? []} presence={presence.entries} />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t.chat.confirmDelete}</AlertDialogTitle><AlertDialogDescription>{t.chat.confirmDeleteDesc}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t.common.cancel}</AlertDialogCancel><AlertDialogAction onClick={() => pendingDelete && removeMessage.mutate(pendingDelete.id)}>{t.chat.delete}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
