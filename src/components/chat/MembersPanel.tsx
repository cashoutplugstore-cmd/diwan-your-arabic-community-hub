import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Mic2, Users, LogIn, LogOut, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useI18n } from "@/contexts/i18n-context";
import type { PresenceActivity, PresenceEntry } from "@/hooks/use-presence";
import type { Profile } from "@/types";

type Props = { members: Profile[]; presence: PresenceEntry[]; activity?: PresenceActivity[] };
type Row = { id: string; name: string; avatar: string | null; status: "online" | "away" | "offline"; role: "owner" | "staff" | "member"; speaking: boolean };

function PanelContent({ members, presence, activity = [] }: Props) {
  const { t } = useI18n();
  const presenceById = new Map(presence.map((entry) => [entry.userId, entry]));
  const rows = useMemo<Row[]>(() => members.map((member) => {
    const p = presenceById.get(member.id);
    const roleValue = String((member as Profile & { role?: string }).role ?? "").toLowerCase();
    const role: Row["role"] = roleValue.includes("owner") || roleValue.includes("admin") ? "owner" : roleValue.includes("mod") || roleValue.includes("staff") ? "staff" : "member";
    return { id: member.id, name: member.display_name || member.username || "—", avatar: member.avatar_url, status: p?.status ?? "offline", role, speaking: false };
  }), [members, presence]);
  const extraRows = presence.filter((entry) => !members.some((member) => member.id === entry.userId)).map<Row>((entry) => ({ id: entry.userId, name: entry.displayName, avatar: entry.avatarUrl, status: entry.status, role: "member", speaking: false }));
  const allRows = [...rows, ...extraRows];
  const staff = allRows.filter((row) => row.role !== "member");
  const speakers = allRows.filter((row) => row.speaking);
  const online = allRows.filter((row) => row.status !== "offline" && !speakers.some((s) => s.id === row.id) && !staff.some((s) => s.id === row.id));

  const renderRow = (row: Row) => (
    <li key={row.id} className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60">
      <div className="relative shrink-0">
        <UserAvatar name={row.name} src={row.avatar} size="sm" status={row.status} />
        {row.role === "owner" ? <span className="absolute -start-1 -top-1 grid size-4 place-items-center rounded-full bg-amber-400 text-black" title="الإدارة"><Crown className="size-2.5" /></span> : row.role === "staff" ? <span className="absolute -start-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground" title="مشرف"><span className="text-[9px] font-black">م</span></span> : null}
      </div>
      <span className="min-w-0 flex-1 truncate text-xs font-medium sm:text-sm">{row.name}</span>
      {row.speaking ? <Mic2 className="size-3 shrink-0 text-emerald-400" aria-label="على المايك" /> : null}
    </li>
  );

  const section = (title: string, items: Row[]) => items.length ? <section className="px-2.5 pt-2.5"><p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title} · {items.length}</p><ul className="space-y-1">{items.slice(0, 48).map(renderRow)}</ul></section> : null;

  return <>
    <header className="flex items-center gap-2 border-b px-3 py-3 sm:px-4 sm:py-4"><Users className="size-4 shrink-0 text-primary sm:size-5" aria-hidden /><h2 className="min-w-0 truncate font-display text-xs font-bold sm:text-sm">{t.chat.members}</h2><Badge variant="secondary" className="ms-auto shrink-0 px-1.5 text-[10px] sm:px-2 sm:text-xs">{allRows.filter((row) => row.status !== "offline").length}</Badge></header>
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim pb-3">{section("الإدارة والمشرفون", staff)}{section("على المايك", speakers)}{section("المتواجدون", online)}{allRows.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground">لا يوجد أعضاء متواجدون حالياً.</p> : null}</div>
    <section className="shrink-0 border-t bg-secondary/25 p-2.5"><div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">نشاط الغرفة</div><div className="space-y-1">{activity.length === 0 ? <p className="text-[11px] leading-4 text-muted-foreground">بانتظار دخول أو مغادرة…</p> : activity.slice(0, 4).map((event) => <div key={event.id} className="flex min-w-0 items-center gap-2 text-[11px]"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-background">{event.type === "join" ? <LogIn className="size-3 text-emerald-400" /> : <LogOut className="size-3 text-muted-foreground" />}</span><span className="truncate">{event.displayName} {event.type === "join" ? "دخل الغرفة" : "غادر الغرفة"}</span></div>)}</div></section>
  </>;
}

function ActivityOverlay({ activity }: { activity: PresenceActivity[] }) {
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const latest = activity[0];

  useEffect(() => {
    if (!latest) return;
    setVisibleId(latest.id);
    const timer = window.setTimeout(() => setVisibleId((id) => id === latest.id ? null : id), 2800);
    return () => window.clearTimeout(timer);
  }, [latest?.id]);

  if (!latest || visibleId !== latest.id) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-1/2 z-[80] flex -translate-y-1/2 justify-center px-4" aria-live="polite">
      <div className="flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-border/70 bg-background/85 px-4 py-2 text-xs shadow-xl backdrop-blur-md sm:text-sm">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary">
          {latest.type === "join" ? <LogIn className="size-3.5 text-emerald-400" aria-hidden /> : <LogOut className="size-3.5 text-muted-foreground" aria-hidden />}
        </span>
        <span className="truncate"><strong className="font-semibold">{latest.displayName}</strong> {latest.type === "join" ? "انضم إلى الغرفة" : "غادر الغرفة"}</span>
      </div>
    </div>
  );
}

export function MembersPanel(props: Props) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches);
  const [localActivity, setLocalActivity] = useState<PresenceActivity[]>(props.activity ?? []);
  const previousUsers = useRef<Map<string, string>>(new Map());
  const { t } = useI18n();

  useEffect(() => {
    const current = new Map(props.presence.map((entry) => [entry.userId, entry.displayName]));
    const previous = previousUsers.current;
    if (previous.size > 0) {
      const now = new Date().toISOString();
      const joins: PresenceActivity[] = [...current].filter(([id]) => !previous.has(id)).map(([id, displayName]) => ({ id: `join-${id}-${now}`, type: "join", displayName, at: now }));
      const leaves: PresenceActivity[] = [...previous].filter(([id]) => !current.has(id)).map(([id, displayName]) => ({ id: `leave-${id}-${now}`, type: "leave", displayName, at: now }));
      if (joins.length || leaves.length) setLocalActivity((items) => [...[...joins, ...leaves], ...items].slice(0, 8));
    }
    previousUsers.current = current;
  }, [props.presence]);

  useEffect(() => { if (props.activity?.length) setLocalActivity(props.activity); }, [props.activity]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobile(media.matches);
    sync(); media.addEventListener("change", sync); return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => { if (!isMobile || typeof document === "undefined") return; const title = document.querySelector<HTMLElement>("main header h1"); if (!title) return; const previousRole = title.getAttribute("role"); const previousTabIndex = title.getAttribute("tabindex"); const previousLabel = title.getAttribute("aria-label"); title.setAttribute("role", "button"); title.setAttribute("tabindex", "0"); title.setAttribute("aria-label", `${title.textContent?.trim() || "الغرفة"} — ${t.chat.members}`); title.classList.add("cursor-pointer", "select-none"); const openFromTitle = () => setOpen(true); const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen(true); } }; title.addEventListener("click", openFromTitle); title.addEventListener("keydown", onKeyDown); return () => { title.removeEventListener("click", openFromTitle); title.removeEventListener("keydown", onKeyDown); if (previousRole === null) title.removeAttribute("role"); else title.setAttribute("role", previousRole); if (previousTabIndex === null) title.removeAttribute("tabindex"); else title.setAttribute("tabindex", previousTabIndex); if (previousLabel === null) title.removeAttribute("aria-label"); else title.setAttribute("aria-label", previousLabel); title.classList.remove("cursor-pointer", "select-none"); }; }, [isMobile, t.chat.members]);
  useEffect(() => { if (!open || typeof document === "undefined") return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, [open]);
  useEffect(() => { if (!open) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [open]);

  const panelProps = { ...props, activity: localActivity };
  return <>
    <ActivityOverlay activity={localActivity} />
    {isMobile ? <>{open ? <div className="fixed inset-0 z-[70]" role="presentation"><button type="button" className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="إغلاق الأعضاء" /><aside className="absolute inset-y-0 end-0 flex w-[min(88vw,22rem)] flex-col overflow-hidden border-s bg-background shadow-2xl" role="dialog" aria-modal="true" aria-label={t.chat.members}><div className="flex shrink-0 items-center justify-between border-b p-2"><span className="px-2 text-xs font-semibold text-muted-foreground">{t.chat.members}</span><Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="إغلاق"><X className="size-4" /></Button></div><PanelContent {...panelProps} /></aside></div> : null}</> : <aside className="glass flex w-64 min-w-0 shrink-0 flex-col overflow-hidden rounded-3xl"><PanelContent {...panelProps} /></aside>}
  </>;
}
