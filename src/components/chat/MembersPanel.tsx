import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Crown, Mic2, Shield, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useI18n } from "@/contexts/i18n-context";
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

type Row = {
  id: string;
  name: string;
  avatar: string | null;
  status: "online" | "away" | "offline";
  role: string;
  demo: boolean;
};

function roomSlugFromUrl() {
  return decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() ?? "");
}

export function MembersPanel({ members, presence }: { members: RoomMemberWithProfile[]; presence: PresenceEntry[] }) {
  const { t } = useI18n();
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
    const realRows: Row[] = members.map((member) => ({
      id: member.id,
      name: member.display_name || member.username,
      avatar: member.avatar_url,
      status: presenceById.get(member.id)?.status ?? "offline",
      role: member.room_role || "member",
      demo: false,
    }));
    const presenceExtras: Row[] = presence
      .filter((entry) => !realIds.has(entry.userId))
      .map((entry) => ({
        id: entry.userId,
        name: entry.displayName,
        avatar: entry.avatarUrl,
        status: entry.status,
        role: "member",
        demo: false,
      }));
    const demoRows: Row[] = demoMembers
      .filter((member) => !realIds.has(member.id))
      .slice(0, 48)
      .map((member, index) => ({
        id: member.id,
        name: member.display_name || member.username,
        avatar: member.avatar_url,
        status: "online",
        role: index === 0 ? "owner" : index < 3 ? "moderator" : "member",
        demo: true,
      }));
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
      const next = [
        ...joined.map(([id, name]) => ({ id: `join-${id}-${now}`, text: `🟢 ${name} دخل الغرفة` })),
        ...left.map(([id, name]) => ({ id: `leave-${id}-${now}`, text: `⚪ ${name} غادر الغرفة` })),
      ];
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
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      room_id: room.data.id,
      reason: "member_alert",
      details: `تنبيه من عضو داخل غرفة ${room.data.name}`,
      status: "open",
    });
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
    return (
      <li key={row.id} className="group flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-secondary/60">
        <div className="relative">
          <UserAvatar name={row.name} src={row.avatar} size="sm" status={row.status === "offline" ? undefined : row.status} />
          {isOwner ? <span className="absolute -start-1 -top-1 grid size-4 place-items-center rounded-full bg-amber-400 text-black"><Crown className="size-2.5" /></span> : null}
          {isModerator || isAdmin ? <span className="absolute -start-1 -bottom-1 grid size-4 place-items-center rounded-full bg-violet-500 text-white"><Shield className="size-2.5" /></span> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className={`truncate text-sm font-semibold ${colorFor(row.id)}`}>{row.name || "—"}</span>
            {isSpeaker ? <Mic2 className="size-3 shrink-0 text-emerald-400" aria-label="صاعد المايك" /> : null}
            {isOwner ? <Star className="size-3 shrink-0 text-amber-400" aria-label="مالك الغرفة" /> : null}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {isOwner ? "مالك الغرفة" : isAdmin ? "إدارة" : isModerator ? "مشرف" : isSpeaker ? "صاعد المايك" : row.status === "online" ? "نشط الآن" : row.status === "away" ? "خامل" : "غير متصل"}
          </div>
        </div>
        {index === 0 && !isOwner && !isModerator && !isAdmin ? <span className="size-1.5 rounded-full bg-emerald-400" /> : null}
      </li>
    );
  };

  const alertButton = (
    <Button type="button" variant="secondary" className="h-9 justify-center gap-2 text-xs" onClick={() => void alertAdmin()} disabled={!user || !room.data}>
      <Bell className="size-4" /> تنبيه الإدارة
    </Button>
  );

  return (
    <>
      <aside className="glass hidden w-80 shrink-0 flex-col overflow-hidden rounded-3xl xl:flex">
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <Users className="size-5 text-primary" aria-hidden />
          <div className="min-w-0 flex-1"><h2 className="font-display text-sm font-bold">الأعضاء</h2><p className="text-[10px] text-muted-foreground">{onlineCount} متصل الآن</p></div>
          <Badge variant="secondary">{rows.length}</Badge>
        </header>
        <div className="border-b px-3 py-2">{alertButton}</div>
        {events.length ? <div className="border-b bg-secondary/20 px-3 py-2"><p className="mb-1 text-[10px] font-semibold text-muted-foreground">آخر النشاط</p><div className="space-y-1">{events.slice(0, 3).map((event) => <p key={event.id} className="truncate text-[10px] text-muted-foreground">{event.text}</p>)}</div></div> : null}
        <div className="flex-1 overflow-y-auto scrollbar-slim p-2.5">
          {staff.length ? <section className="mb-3"><p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">المشرفون</p><ul className="space-y-1">{staff.map((row, index) => renderRow(row, index))}</ul></section> : null}
          {speakers.length ? <section className="mb-3"><p className="flex items-center gap-1 px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400"><Mic2 className="size-3" /> على المايك الآن</p><ul className="space-y-1">{speakers.map((row, index) => renderRow(row, index))}</ul></section> : null}
          <section><p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">الأعضاء</p><ul className="space-y-1">{regular.slice(0, 48).map((row, index) => renderRow(row, index))}</ul></section>
        </div>
      </aside>
      <div className="fixed bottom-20 end-3 z-30 xl:hidden">{alertButton}</div>
    </>
  );
}
