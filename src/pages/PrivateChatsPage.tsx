import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { MessagesSkeleton } from "@/components/shared/Loaders";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { relativeTime } from "@/lib/time";
import { myPrivateChatsQuery } from "@/services/private-chats.service";

export function PrivateChatsPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const chats = useQuery(myPrivateChatsQuery(user?.id));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold">{t.nav.chat}</h1>
      {chats.isLoading ? (
        <MessagesSkeleton />
      ) : (chats.data ?? []).length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="لا توجد محادثات خاصة"
          description="ابدأ محادثة خاصة من بروفايل عضو."
        />
      ) : (
        <ul className="space-y-2">
          {(chats.data ?? []).map((chat) => {
            const person = chat.other_user;
            const name = person?.display_name || person?.username || chat.name;
            return (
              <li key={chat.id}>
                <Link
                  to="/chat/$slug"
                  params={{ slug: chat.slug }}
                  className="glass flex items-center gap-3 rounded-2xl p-4"
                >
                  <UserAvatar name={name} src={person?.avatar_url ?? null} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      محادثة خاصة
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(chat.last_message_at ?? chat.created_at, locale)}
                    </span>
                    {chat.unread_count > 0 ? (
                      <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground">
                        {chat.unread_count > 99 ? "99+" : chat.unread_count}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
