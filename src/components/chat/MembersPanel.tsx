import { Crown, Mic2, Users, LogIn, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useI18n } from "@/contexts/i18n-context";
import type { PresenceActivity, PresenceEntry } from "@/hooks/use-presence";
import type { Profile } from "@/types";
import { getDemoMembers } from "@/lib/demo-community";

const nameColors = ["text-sky-400", "text-violet-400", "text-emerald-400", "text-amber-400", "text-rose-400", "text-cyan-400", "text-fuchsia-400", "text-orange-400"];
const colorFor = (id: string) => nameColors[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % nameColors.length];

export function MembersPanel({ members, presence, activity = [] }: { members: Profile[]; presence: PresenceEntry[]; activity?: PresenceActivity[] }) {
  const { t } = useI18n();
  const demoMembers = getDemoMembers();
  const realIds = new Set(members.map((member) => member.id));
  const allMembers = [...members, ...demoMembers.filter((member) => !realIds.has(member.id))];
  const presenceById = new Map(presence.map((entry) => [entry.userId, entry]));
  const extras = presence.filter((entry) => !allMembers.some((m) => m.id === entry.userId));
  const rows = [...allMembers.map((member) => ({ id: member.id, name: member.display_name || member.username, avatar: member.avatar_url, status: presenceById.get(member.id)?.status ?? (member.id.startsWith("demo-") ? "online" : "offline"), demo: member.id.startsWith("demo-") })), ...extras.map((entry) => ({ id: entry.userId, name: entry.displayName, avatar: entry.avatarUrl, status: entry.status, demo: false }))].sort((a, b) => Number(b.status !== "offline") - Number(a.status !== "offline"));
  const onlineCount = rows.filter((row) => row.status === "online").length;

  return (
    <aside className="glass order-first flex w-32 min-w-0 shrink-0 flex-col overflow-hidden rounded-3xl sm:w-56 lg:order-none lg:w-64">
      <header className="flex items-center gap-1.5 border-b px-2.5 py-3 sm:gap-2 sm:px-4 sm:py-4">
        <Users className="size-4 shrink-0 text-primary sm:size-5" aria-hidden />
        <h2 className="min-w-0 truncate font-display text-xs font-bold sm:text-sm">{t.chat.members}</h2>
        <Badge variant="secondary" className="ms-auto shrink-0 px-1.5 text-[10px] sm:px-2 sm:text-xs">{onlineCount}</Badge>
      </header>
      <div className="flex items-center justify-between gap-1 border-b px-2 py-2 text-[9px] text-muted-foreground sm:px-4 sm:py-2.5 sm:text-xs">
        <span>{rows.length} أعضاء</span>
        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-400" />نشط</span>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-slim p-1.5 sm:p-2.5">
        {rows.slice(0, 48).map((row, index) => (
          <li key={row.id} className="group flex min-w-0 items-center gap-1.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-secondary/60 sm:gap-2 sm:px-2.5 sm:py-2">
            <div className="relative shrink-0">
              <UserAvatar name={row.name} src={row.avatar} size="sm" status={row.status} />
              {index === 0 ? <span className="absolute -start-1 -top-1 grid size-4 place-items-center rounded-full bg-amber-400 text-black"><Crown className="size-2.5" /></span> : null}
            </div>
            <span className={`min-w-0 flex-1 truncate text-[10px] font-medium sm:text-sm ${colorFor(row.id)}`} title={row.name || "—"}>{row.name || "—"}</span>
            {row.status === "online" && index % 7 === 0 ? <Mic2 className="size-3 shrink-0 text-emerald-400" aria-label="يتحدث" /> : null}
          </li>
        ))}
      </ul>
      <section className="border-t bg-secondary/25 p-1.5 sm:p-2.5">
        <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold text-muted-foreground sm:mb-1.5 sm:gap-2 sm:text-[11px]">نشاط الغرفة</div>
        <div className="space-y-1">
          {activity.length === 0 ? <p className="text-[9px] leading-4 text-muted-foreground sm:text-[11px]">بانتظار دخول أو مغادرة…</p> : activity.slice(0, 3).map((event) => <div key={event.id} className="flex min-w-0 items-center gap-1 text-[9px] sm:gap-2 sm:text-[11px]"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-background">{event.type === "join" ? <LogIn className="size-3 text-emerald-400" /> : <LogOut className="size-3 text-muted-foreground" />}</span><span className="truncate">{event.displayName} {event.type === "join" ? "دخل" : "غادر"}</span></div>)}
        </div>
      </section>
    </aside>
  );
}
