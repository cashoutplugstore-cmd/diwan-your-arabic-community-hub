import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MessageCircle, MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { MessagesSkeleton } from "@/components/shared/Loaders";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/time";

async function fetchPrivateChats(userId: string) {
  const { data: memberships, error: membershipError } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", userId);
  if (membershipError) throw membershipError;

  const roomIds = [...new Set((memberships ?? []).map((row) => row.room_id).filter(Boolean))];
  if (roomIds.length === 0) return [];

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id,slug,name,description,is_private,created_at")
    .in("id", roomIds)
    .eq("is_private", true)
    .order("created_at", { ascending: false });
  if (roomsError) throw roomsError;
  if (!rooms?.length) return [];

  const [{ data: allMembers, error: membersError }, { data: messages, error: messagesError }] = await Promise.all([
    supabase.from("room_members").select("room_id,user_id").in("room_id", rooms.map((room) => room.id)),
    supabase.from("messages").select("room_id,content,created_at,is_deleted").in("room_id", rooms.map((room) => room.id)).eq("is_deleted", false).order("created_at", { ascending: false }),
  ]);
  if (membersError) throw membersError;
  if (messagesError) throw messagesError;

  const otherIds = [...new Set((allMembers ?? []).filter((row) => row.user_id !== userId).map((row) => row.user_id))];
  const { data: profiles, error: profilesError } = otherIds.length
    ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", otherIds)
    : { data: [], error: null };
  if (profilesError) throw profilesError;

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const membersByRoom = new Map<string, string[]>();
  for (const row of allMembers ?? []) {
    const list = membersByRoom.get(row.room_id) ?? [];
    if (row.user_id !== userId) list.push(row.user_id);
    membersByRoom.set(row.room_id, list);
  }

  const latestByRoom = new Map<string, { content: string; created_at: string }>();
  for (const message of messages ?? []) {
    if (!latestByRoom.has(message.room_id)) latestByRoom.set(message.room_id, message);
  }

  return rooms.map((room) => {
    const other = (membersByRoom.get(room.id) ?? []).map((id) => profileById.get(id)).find(Boolean);
    const latest = latestByRoom.get(room.id);
    return {
      ...room,
      displayName: other?.display_name || other?.username || room.name || "محادثة خاصة",
      avatarUrl: other?.avatar_url ?? null,
      username: other?.username ?? null,
      lastMessage: latest?.content ?? room.description ?? "ابدأ المحادثة الخاصة",
      lastMessageAt: latest?.created_at ?? room.created_at,
    };
  });
}

export function PrivateChatsPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const chats = useQuery({
    queryKey: ["private-chats", user?.id],
    queryFn: () => fetchPrivateChats(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 15_000,
  });

  if (!user || chats.isLoading) return <MessagesSkeleton />;
  if (chats.isError) return <EmptyState icon={MessagesSquare} title={t.common.error} description="تعذر تحميل المحادثات الخاصة." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-5 text-primary" />
        <h1 className="font-display text-2xl font-extrabold">المحادثات الخاصة</h1>
      </div>

      {(chats.data ?? []).length === 0 ? (
        <EmptyState icon={MessagesSquare} title="لا توجد محادثات خاصة" description="افتح ملف عضو واضغط مراسلة لبدء محادثة خاصة." />
      ) : (
        <ul className="space-y-2">
          {(chats.data ?? []).map((chat) => (
            <li key={chat.id}>
              <Link to="/chat/$slug" params={{ slug: chat.slug }} className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:bg-secondary/60">
                <UserAvatar name={chat.displayName} src={chat.avatarUrl} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{chat.displayName}</span>
                  <span className="block truncate text-sm text-muted-foreground">{chat.lastMessage}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(chat.lastMessageAt, locale)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
