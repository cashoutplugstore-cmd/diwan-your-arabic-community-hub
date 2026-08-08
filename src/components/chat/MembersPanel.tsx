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
    <aside className="glass flex w-80 shrink-0 flex-col overflow-hidden rounded-3xl">
      <header className="flex items-center gap-2 border-b px-4 py-4"><Users className="size-5 text-primary" aria-hidden /><h2 className="font-display text-sm font-bold">{t.chat.members}</h2><Badge variant="secondary" className="ms-auto">{onlineCount} {t.chat.online}</Badge></header>
      <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs text-muted-foreground"><span>{rows.length} أعضاء</span><span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-400" />نشط الآن</span></div>
      <ul className="flex-1 space-y-1 overflow-y-auto scrollbar-slim p-2.5">
        {rows.slice(0, 48).map((row, index) => <li key={row.id} className="group flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-secondary/60"><div className="relative"><UserAvatar name={row.name} src={row.avatar} size="sm" status={row.status} />{index === 0 ? <span className="absolute -start-1 -top-1 grid size-4 place-items-center rounded-full bg-amber-400 text-black"><Crown className="size-2.5" /></span> : null}</div><span className={`min-w-0 flex-1 truncate text-sm font-medium ${colorFor(row.id)}`}>{row.name || "—"}</span>{row.status === "online" && index % 7 === 0 ? <Mic2 className="size-3 text-emerald-400" aria-label="يتحدث" /> : null}</li>)}
      </ul>
      <section className="border-t bg-secondary/25 p-2.5">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">نشاط الغرفة</div>
        <div className="space-y-1">
          {activity.length === 0 ? <p className="text-[11px] text-muted-foreground">بانتظار دخول أو مغادرة أعضاء…</p> : activity.slice(0, 3).map((event) => <div key={event.id} className="flex items-center gap-2 text-[11px]"><span className="grid size-5 place-items-center rounded-full bg-background">{event.type === "join" ? <LogIn className="size-3 text-emerald-400" /> : <LogOut className="size-3 text-muted-foreground" />}</span><span className="truncate">{event.displayName} {event.type === "join" ? "دخل الغرفة" : "غادر الغرفة"}</span></div>)}
        </div>
      </section>
    </aside>
  );
}
