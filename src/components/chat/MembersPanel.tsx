import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Crown, Mic2, Shield, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import type { PresenceEntry } from "@/hooks/use-presence";
import { useVoiceParticipants } from "@/hooks/use-voice-presence";
import type { RoomMemberWithProfile } from "@/types";
import { getDemoMembers } from "@/lib/demo-community";
import { roomQuery } from "@/services/rooms.service";
import { supabase } from "@/integrations/supabase/client";

const nameColors = ["text-sky-400", "text-violet-400", "text-emerald-400", "text-amber-400", "text-rose-400", "text-cyan-400", "text-fuchsia-400", "text-orange-400"];
const colorFor = (id: string) => nameColors[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % nameColors.length];

type Row = { id: string; name: string; avatar: string | null; status: "online" | "away" | "offline"; role: string; demo: boolean };

function roomSlugFromUrl() {
  if (typeof window === "undefined") return "";
  return decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() ?? "");
}

export function MembersPanel({ members, presence }: { members: RoomMemberWithProfile[]; presence: PresenceEntry[] }) {
  const { user } = useAuth();
  const room = useQuery(roomQuery(roomSlugFromUrl()));
  const voice = useVoiceParticipants(room.data?.id);
  const [events, setEvents] = useState<Array<{ id: string; text: string }>>([]);
  const previousRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);
  const demoMembers = getDemoMembers();
  const presenceById = new Map(presence.map((entry) => [entry.userId, entry]));
  const realIds = new Set(members.map((member) => member.id));

  const rows = useMemo<Row[]>(() => {
    const realRows: Row[] = members.map((member) => ({ id: member.id, name: member.display_name || member.username, avatar: member.avatar_url, status: presenceById.get(member.id)?.status ?? "offline", role: member.room_role || "member", demo: false }));
    const presenceExtras: Row[] = presence.filter((entry) => !realIds.has(entry.userId)).map((entry) => ({ id: entry.userId, name: entry.displayName, avatar: entry.avatarUrl, status: entry.status, role: "member", demo: false }));
    const demoRows: Row[] = demoMembers.filter((member) => !realIds.has(member.id)).slice(0, 48).map((member, index) => ({ id: member.id, name: member.display_name || member.username, avatar: member.avatar_url, status: "online", role: index === 0 ? "owner" : index < 3 ? "moderator" : "member", demo: true }));
    return [...realRows, ...presenceExtras, ...demoRows].sort((a, b) => Number(b.status !== "offline") - Number(a.status !== "offline"));
  }, [members, demoMembers, realIds, presence, presenceById]);

  useEffect(() => {
    const current = new Map(rows.map((row) => [row.id, row.name]));
    if (!initializedRef.current) {
      previousRef.current = current;
      initializedRef.current = true;
      return;
    }
    const joined = [...current.entries()].filter(([id]) => !previousRef.current.has(id));
    const left = [...previousRef.current.entries()].filter(([id]) => !current.has(id));
    if (joined.length || left.length) {
      const now = Date.now();
      const next = [...joined.map(([id, name]) => ({ id: `join-${id}-${now}`, text: `🟢 ${name} دخل الغرفة` })), ...left.map(([id, name]) => ({ id: `leave-${id}-${now}`, text: `⚪ ${name} غادر الغرفة` }))];
      setEvents((old) => [...next, ...old].slice(0, 5));
    }
    previousRef.current = current;
  }, [rows]);

  const onlineCount = rows.filter((row) => row.status !== "offline").length;
  const speakers = rows.filter((row) => voice.speakingIds.has(row.id));
  const staff = rows.filter((row) => ["owner", "admin", "moderator"].includes(row.role));
  const regular = rows.filter((row) => !["owner", "admin", "moderator"].includes(row.role) && !voice.speakingIds.has(row.id));

  async function alertAdmin() {
    if (!user || !room.data) return;
    const { error } = await supabase.from("reports").insert({ reporter_id: user.id, room_id: room.data.id, reason: "member_alert", details: `تنبيه من عضو داخل غرفة ${room.data.name}`, status: "open" });
    if (error) {
      toast.error("تعذر إرسال التنبيه للإدارة");
      return;
    }
    toast.success("تم إرسال تنبيه للإدارة");
  }

  const renderRow = (row: Row, index: number) => {
    const isSpeaker = voice.speakingIds.has(row.id);
    const isOwner = row.role === "owner";
    const isAdmin = row.role === "admin";
    const isModerator = row.role === "moderator";
    const roleColor = isOwner ? "text-amber-400" : isAdmin ? "text-red-400" : isModerator ? "text-violet-400" : isSpeaker ? "text-emerald-400" : colorFor(row.id);
    return (
      <li key={row.id} className="group flex items-center gap-1.5 rounded-xl px-1.5 py-2 transition-colors hover:bg-secondary/60 sm:gap-2 sm:px-2.5">
        <div className="relative shrink-0">
          <UserAvatar name={row.name} src={row.avatar} size="sm" status={row.status === "offline" ? undefined : row.status} />
          {isOwner ? <span className="absolute -start-1 -top-1 grid size-4 place-items-center rounded-full bg-amber-400 text-black"><Crown className="size-2.5" /></span> : null}
          {isModerator || isAdmin ? <span className="absolute -start-1 -bottom-1 grid size-4 place-items-center rounded-full bg-violet-500 text-white"><Shield className="size-2.5" /></span> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className={`truncate text-xs font-semibold sm:text-sm ${roleColor}`}>{row.name || "—"}</span>
            {isSpeaker ? <Mic2 className="size-3 shrink-0 text-emerald-400" aria-label="صاعد المايك" /> : null}
            {isOwner || isModerator ? <Star className={`size-3 shrink-0 ${isOwner ? "text-amber-400" : "text-violet-400"}`} aria-label={isOwner ? "مالك الغرفة" : "مشرف"} /> : null}
          </div>
          <div className="truncate text-[9px] text-muted-foreground sm:text-[10px]">{isOwner ? "مالك الغرفة" : isAdmin ? "إدارة" : isModerator ? "مشرف" : isSpeaker ? "صاعد المايك" : row.status === "online" ? "نشط الآن" : row.status === "away" ? "خامل" : "غير متصل"}</div>
        </div>
        {index === 0 && !isOwner && !isModerator && !isAdmin ? <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" /> : null}
      </li>
    );
  };

  const alertButton = <Button type="button" variant="secondary" className="h-9 w-full justify-center gap-2 text-xs" onClick={() => void alertAdmin()} disabled={!user || !room.data}><Bell className="size-4" /> <span>تنبيه الإدارة</span></Button>;

  return (
    <aside className="glass flex h-[calc(100dvh-190px)] w-[34vw] min-w-[145px] max-w-80 shrink-0 flex-col overflow-hidden rounded-2xl sm:rounded-3xl lg:h-[calc(100dvh-140px)]">
      <header className="flex items-center gap-1.5 border-b px-2.5 py-3 sm:gap-2 sm:px-4"><Users className="size-4 shrink-0 text-primary sm:size-5" aria-hidden /><div className="min-w-0 flex-1"><h2 className="truncate font-display text-xs font-bold sm:text-sm">الأعضاء</h2><p className="truncate text-[9px] text-muted-foreground sm:text-[10px]">{onlineCount} متصل الآن</p></div><Badge variant="secondary" className="shrink-0 text-[9px]">{rows.length}</Badge></header>
      <div className="border-b p-2 sm:px-3 sm:py-2">{alertButton}</div>
      {events.length ? <div className="border-b bg-secondary/20 px-2 py-2 sm:px-3"><p className="mb-1 text-[9px] font-semibold text-muted-foreground">آخر النشاط</p><div className="space-y-1">{events.slice(0, 3).map((event) => <p key={event.id} className="truncate text-[9px] text-muted-foreground">{event.text}</p>)}</div></div> : null}
      <div className="flex-1 overflow-y-auto scrollbar-slim p-1.5 sm:p-2.5">
        {staff.length ? <section className="mb-3"><p className="px-1 pb-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:px-2">المشرفون</p><ul className="space-y-1">{staff.map((row, index) => renderRow(row, index))}</ul></section> : null}
        {speakers.length ? <section className="mb-3"><p className="flex items-center gap-1 px-1 pb-1 text-[9px] font-bold uppercase tracking-wide text-emerald-400 sm:px-2"><Mic2 className="size-3" /> على المايك الآن</p><ul className="space-y-1">{speakers.map((row, index) => renderRow(row, index))}</ul></section> : null}
        <section><p className="px-1 pb-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:px-2">الأعضاء</p><ul className="space-y-1">{regular.slice(0, 48).map((row, index) => renderRow(row, index))}</ul></section>
      </div>
    </aside>
  );
}
