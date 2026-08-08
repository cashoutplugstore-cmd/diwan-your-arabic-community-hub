import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useI18n } from "@/contexts/i18n-context";
import type { PresenceEntry } from "@/hooks/use-presence";
import type { Profile } from "@/types";
import { getDemoMembers } from "@/lib/demo-community";

export function MembersPanel({
  members,
  presence,
}: {
  members: Profile[];
  presence: PresenceEntry[];
}) {
  const { t } = useI18n();
  const demoMembers = getDemoMembers();
  const realIds = new Set(members.map((member) => member.id));
  const allMembers = [...members, ...demoMembers.filter((member) => !realIds.has(member.id))];
  const presenceById = new Map(presence.map((entry) => [entry.userId, entry]));
  const extras = presence.filter((entry) => !allMembers.some((m) => m.id === entry.userId));

  const rows = [
    ...allMembers.map((member) => ({
      id: member.id,
      name: member.display_name || member.username,
      avatar: member.avatar_url,
      status: presenceById.get(member.id)?.status ?? (member.id.startsWith("demo-") ? member.status : "offline"),
      demo: member.id.startsWith("demo-"),
    })),
    ...extras.map((entry) => ({
      id: entry.userId,
      name: entry.displayName,
      avatar: entry.avatarUrl,
      status: entry.status,
      demo: false,
    })),
  ].sort((a, b) => Number(b.status !== "offline") - Number(a.status !== "offline"));

  const onlineCount = rows.filter((row) => row.status === "online").length;

  return (
    <aside className="glass hidden w-72 shrink-0 flex-col overflow-hidden rounded-3xl xl:flex">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <Users className="size-4 text-primary" aria-hidden />
        <h2 className="font-display text-sm font-bold">{t.chat.members}</h2>
        <Badge variant="secondary" className="ms-auto">
          {onlineCount} {t.chat.online}
        </Badge>
      </header>
      <div className="border-b px-4 py-2 text-xs text-muted-foreground">
        {rows.length} أعضاء · {demoMembers.length} حسابات تجريبية
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto scrollbar-slim p-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5">
            <UserAvatar name={row.name} src={row.avatar} size="sm" status={row.status} />
            <span className="min-w-0 flex-1 truncate text-sm">{row.name || "—"}</span>
            {row.demo ? (
              <Badge variant="outline" className="shrink-0 px-1.5 text-[10px]">demo</Badge>
            ) : null}
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="px-2 py-4 text-center text-sm text-muted-foreground">{t.common.empty}</li>
        ) : null}
      </ul>
    </aside>
  );
}
