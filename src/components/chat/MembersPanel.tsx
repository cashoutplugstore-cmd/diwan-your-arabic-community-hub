import { useEffect, useState } from "react";
import { Crown, Mic2, Users, LogIn, LogOut, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useI18n } from "@/contexts/i18n-context";
import type { PresenceActivity, PresenceEntry } from "@/hooks/use-presence";
import type { Profile } from "@/types";
import { getDemoMembers } from "@/lib/demo-community";

const nameColors = ["text-sky-400", "text-violet-400", "text-emerald-400", "text-amber-400", "text-rose-400", "text-cyan-400", "text-fuchsia-400", "text-orange-400"];
const colorFor = (id: string) => nameColors[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % nameColors.length];
type Props = { members: Profile[]; presence: PresenceEntry[]; activity?: PresenceActivity[] };

function PanelContent({ members, presence, activity = [] }: Props) {
  const { t } = useI18n();
  const demoMembers = getDemoMembers();
  const realIds = new Set(members.map((member) => member.id));
  const allMembers = [...members, ...demoMembers.filter((member) => !realIds.has(member.id))];
  const presenceById = new Map(presence.map((entry) => [entry.userId, entry]));
  const extras = presence.filter((entry) => !allMembers.some((m) => m.id === entry.userId));
  const rows = [...allMembers.map((member) => ({ id: member.id, name: member.display_name || member.username, avatar: member.avatar_url, status: presenceById.get(member.id)?.status ?? (member.id.startsWith("demo-") ? "online" : "offline") })), ...extras.map((entry) => ({ id: entry.userId, name: entry.displayName, avatar: entry.avatarUrl, status: entry.status }))].sort((a, b) => Number(b.status !== "offline") - Number(a.status !== "offline"));
  const onlineCount = rows.filter((row) => row.status === "online").length;
  return <><header className="flex items-center gap-2 border-b px-3 py-3 sm:px-4 sm:py-4"><Users className="size-4 shrink-0 text-primary sm:size-5" aria-hidden /><h2 className="min-w-0 truncate font-display text-xs font-bold sm:text-sm">{t.chat.members}</h2><Badge variant="secondary" className="ms-auto shrink-0 px-1.5 text-[10px] sm:px-2 sm:text-xs">{onlineCount}</Badge></header><div className="flex items-center justify-between gap-1 border-b px-3 py-2 text-[9px] text-muted-foreground sm:px-4 sm:py-2.5 sm:text-xs"><span>{rows.length} أعضاء</span><span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-400" />نشط</span></div><ul className="min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-slim p-2.5">{rows.slice(0, 48).map((row, index) => <li key={row.id} className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60"><div className="relative shrink-0"><UserAvatar name={row.name} src={row.avatar} size="sm" status={row.status} />{index === 0 ? <span className="absolute -start-1 -top-1 grid size-4 place-items-center rounded-full bg-amber-400 text-black"><Crown className="size-2.5" /></span> : null}</div><span className={`min-w-0 flex-1 truncate text-xs font-medium sm:text-sm ${colorFor(row.id)}`} title={row.name || "—"}>{row.name || "—"}</span>{row.status === "online" && index % 7 === 0 ? <Mic2 className="size-3 shrink-0 text-emerald-400" aria-label="يتحدث" /> : null}</li>)}</ul><section className="border-t bg-secondary/25 p-2.5"><div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">نشاط الغرفة</div><div className="space-y-1">{activity.length === 0 ? <p className="text-[11px] leading-4 text-muted-foreground">بانتظار دخول أو مغادرة…</p> : activity.slice(0, 3).map((event) => <div key={event.id} className="flex min-w-0 items-center gap-2 text-[11px]"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-background">{event.type === "join" ? <LogIn className="size-3 text-emerald-400" /> : <LogOut className="size-3 text-muted-foreground" />}</span><span className="truncate">{event.displayName} {event.type === "join" ? "دخل" : "غادر"}</span></div>)}</div></section></>;
}

export function MembersPanel(props: Props) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Explicit mobile trigger: only the actual room title opens the drawer.
    const title = document.querySelector<HTMLElement>("main header h1");
    if (!title) return;
    const previousRole = title.getAttribute("role");
    const previousTabIndex = title.getAttribute("tabindex");
    const previousLabel = title.getAttribute("aria-label");
    title.setAttribute("role", "button");
    title.setAttribute("tabindex", "0");
    title.setAttribute("aria-label", `${title.textContent?.trim() || "الغرفة"} — ${t.chat.members}`);
    title.classList.add("cursor-pointer", "select-none");
    const openFromTitle = () => {
      if (window.matchMedia("(max-width: 1023px)").matches) setOpen(true);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Enter" || event.key === " ") && window.matchMedia("(max-width: 1023px)").matches) {
        event.preventDefault();
        setOpen(true);
      }
    };
    title.addEventListener("click", openFromTitle);
    title.addEventListener("keydown", onKeyDown);
    return () => {
      title.removeEventListener("click", openFromTitle);
      title.removeEventListener("keydown", onKeyDown);
      if (previousRole === null) title.removeAttribute("role"); else title.setAttribute("role", previousRole);
      if (previousTabIndex === null) title.removeAttribute("tabindex"); else title.setAttribute("tabindex", previousTabIndex);
      if (previousLabel === null) title.removeAttribute("aria-label"); else title.setAttribute("aria-label", previousLabel);
      title.classList.remove("cursor-pointer", "select-none");
    };
  }, [t.chat.members]);

  return <>
    {/* Mobile: no inline panel. It is a right-side drawer opened only from the room title. */}
    {open ? <div className="fixed inset-0 z-[70] lg:hidden" role="presentation"><button type="button" className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="إغلاق الأعضاء" /><aside className="absolute inset-y-0 end-0 flex w-[min(84vw,21rem)] flex-col overflow-hidden border-s bg-background shadow-2xl" role="dialog" aria-modal="true" aria-label={t.chat.members}><div className="flex shrink-0 items-center justify-between border-b p-2"><span className="px-2 text-xs font-semibold text-muted-foreground">{t.chat.members}</span><Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="إغلاق"><X className="size-4" /></Button></div><PanelContent {...props} /></aside></div> : null}
    {/* Desktop only: permanent right sidebar. */}
    <aside className="glass hidden w-64 min-w-0 shrink-0 flex-col overflow-hidden rounded-3xl lg:flex"><PanelContent {...props} /></aside>
  </>;
}
