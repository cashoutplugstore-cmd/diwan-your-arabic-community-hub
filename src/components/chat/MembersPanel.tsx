import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useI18n } from "@/contexts/i18n-context";
import type { PresenceEntry } from "@/hooks/use-presence";
import type { Profile } from "@/types";

export function MembersPanel({
  members,
  presence,
}: {
  members: Profile[];
  presence: PresenceEntry[];
}) {
  const { t } = useI18n();
  const presenceById = new Map(presence.map((entry) => [entry.userId, entry]));
  const extras = presence.filter((entry) => !members.some((m) => m.id === entry.userId));

  const rows = [
    ...members.map((member) => ({
      id: member.id,
      name: member.display_name || member.username,
      avatar: member.avatar_url,
      status: presenceById.get(member.id)?.status ?? "offline",
    })),
    ...extras.map((entry) => ({
      id: entry.userId,
      name: entry.displayName,
      avatar: entry.avatarUrl,
      status: entry.status,
    })),
  ].sort((a, b) => Number(b.status !== "offline") - Number(a.status !== "offline"));

  const onlineCount = rows.filter((row) => row.status === "online").length;

  return (
    <aside className="glass hidden w-64 shrink-0 flex-col overflow-hidden rounded-3xl xl:flex">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <Users className="size-4 text-primary" aria-hidden />
        <h2 className="font-display text-sm font-bold">{t.chat.members}</h2>
        <Badge variant="secondary" className="ms-auto">
          {onlineCount} {t.chat.online}
        </Badge>
      </header>
      <ul className="flex-1 space-y-1 overflow-y-auto scrollbar-slim p-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5">
            <UserAvatar name={row.name} src={row.avatar} size="sm" status={row.status} />
            <span className="min-w-0 flex-1 truncate text-sm">{row.name || "—"}</span>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="px-2 py-4 text-center text-sm text-muted-foreground">{t.common.empty}</li>
        ) : null}
      </ul>
    </aside>
  );
}
