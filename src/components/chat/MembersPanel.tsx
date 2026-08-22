import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Gem, Mic2, MoreVertical, Shield, Users, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { supabase } from "@/integrations/supabase/client";
import { looseDb } from "@/integrations/supabase/loose-db";
import { myRolesQuery } from "@/services/roles.service";
import { getAiMembersForRoom } from "@/data/aiMembers";
import type { PresenceActivity, PresenceEntry } from "@/hooks/use-presence";
import type { Profile } from "@/types";

type Props = { members: Profile[]; presence: PresenceEntry[]; activity?: PresenceActivity[]; roomId?: string };
type Role = "global_owner" | "global_admin" | "admin" | "moderator" | "vip" | "speaker" | "owner" | "member" | null;
type Row = { id: string; name: string; avatar: string | null; status: "online" | "away" | "offline"; role: Role; speaking: boolean; virtual?: boolean };

function virtualProfile(member: ReturnType<typeof getAiMembersForRoom>[number]): Profile {
  return { id: member.id, display_name: member.name, username: `${member.name}-${member.id.split("-").pop()}`, avatar_url: null, bio: `${member.personality}. يحب السوالف عن ${member.topics.join("، ")}.`, status: "online", created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Profile;
}

function PanelContent({ members, presence, activity = [], roomId }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const presenceById = useMemo(() => new Map(presence.filter((entry) => !entry.userId.startsWith("virtual-")).map((entry) => [entry.userId, entry])), [presence]);
  const virtualMembers = useMemo(() => roomId ? getAiMembersForRoom(roomId, 8).map(virtualProfile) : [], [roomId]);
  const realMemberIds = useMemo(() => members.map((member) => member.id).filter((id) => !id.startsWith("virtual-")), [members]);
  const roomMeta = useQuery({ queryKey: ["room-role-meta", roomId], enabled: Boolean(roomId), staleTime: 30000, queryFn: async () => {
    const [{ data: room, error: roomError }, { data: roomRoles, error: roleError }] = await Promise.all([
      supabase.from("rooms").select("owner_id").eq("id", roomId!).maybeSingle(),
      supabase.from("room_members").select("user_id,role").eq("room_id", roomId!),
    ]);
    if (roomError) throw roomError;
    if (roleError) throw roleError;
    return { ownerId: room?.owner_id ?? null, roomRoles: roomRoles ?? [] };
  } });
  const globalRoles = useQuery(myRolesQuery(user?.id));
  const platformOwnersQuery = useQuery({ queryKey: ["platform-owners", realMemberIds.join(",")], enabled: realMemberIds.length > 0, staleTime: 60000, queryFn: async () => {
    const { data, error } = await supabase.from("platform_owners").select("user_id").in("user_id", realMemberIds);
    if (error) throw error;
    return new Set((data ?? []).map((row) => row.user_id));
  } });
  const myRoomRole = useMemo(() => roomMeta.data?.roomRoles.find((row) => row.user_id === user?.id)?.role ?? null, [roomMeta.data, user?.id]);
  const canManageRoles = Boolean(user && (globalRoles.data?.isAdmin || globalRoles.data?.isGlobalOwner || roomMeta.data?.ownerId === user.id || myRoomRole === "admin"));
  const canAssignRoomAdmin = Boolean(user && (globalRoles.data?.isAdmin || globalRoles.data?.isGlobalOwner || roomMeta.data?.ownerId === user.id));

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.channel(`room-role-sync:${roomId}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, () => {
        void qc.invalidateQueries({ queryKey: ["room-role-meta", roomId] });
        void qc.invalidateQueries({ queryKey: ["room_members", "profiles", roomId] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [roomId, qc]);

  const rolesQuery = useQuery({ queryKey: ["member-roles", realMemberIds.join(",")], enabled: realMemberIds.length > 0, staleTime: 60000, queryFn: async () => {
    const [{ data: roles }, { data: vip }] = await Promise.all([
      supabase.from("user_roles").select("user_id,role").in("user_id", realMemberIds),
      looseDb.from("premium_subscriptions").select("user_id,status,expires_at").in("user_id", realMemberIds).eq("status", "active"),
    ]);
    return { roles: roles ?? [], vip: ((vip ?? []) as any[]).filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now()) };
  } });
  const voiceQuery = useQuery({ queryKey: ["room-speakers", roomId], enabled: Boolean(roomId), staleTime: 4000, refetchInterval: 5000, queryFn: async () => {
    const { data, error } = await supabase.from("room_voice_participants").select("user_id,is_speaker,is_muted").eq("room_id", roomId!).eq("is_speaker", true);
    if (error) throw error;
    return data ?? [];
  } });
  const roleById = useMemo(() => {
    const map = new Map<string, Role>();
    for (const id of platformOwnersQuery.data ?? []) map.set(id, "global_owner");
    for (const row of roomMeta.data?.roomRoles ?? []) {
      if (map.has(row.user_id)) continue;
      if (row.role === "owner") map.set(row.user_id, "owner");
      else if (row.role === "admin") map.set(row.user_id, "admin");
      else if (row.role === "moderator" && map.get(row.user_id) !== "owner" && map.get(row.user_id) !== "admin") map.set(row.user_id, "moderator");
      else if (!map.has(row.user_id)) map.set(row.user_id, "member");
    }
    for (const row of rolesQuery.data?.roles ?? []) {
      if (map.get(row.user_id) === "global_owner") continue;
      if (row.role === "admin") map.set(row.user_id, "global_admin");
      else if (row.role === "moderator" && !map.has(row.user_id)) map.set(row.user_id, "moderator");
    }
    for (const row of (rolesQuery.data?.vip ?? []) as any[]) if (!map.has(row.user_id)) map.set(row.user_id, "vip");
    return map;
  }, [platformOwnersQuery.data, roomMeta.data, rolesQuery.data]);
  const speakerById = useMemo(() => new Map((voiceQuery.data ?? []).filter((row) => !String(row.user_id).startsWith("virtual-")).map((row) => [row.user_id, row])), [voiceQuery.data]);
  const rows = useMemo<Row[]>(() => {
    const realRows = members.filter((member) => !member.id.startsWith("virtual-")).map((member) => {
      const p = presenceById.get(member.id);
      const resolvedRole = roleById.get(member.id) ?? "member";
      return { id: member.id, name: member.display_name || member.username || "—", avatar: member.avatar_url, status: (p?.status === "online" || p?.status === "away" || p?.status === "offline" ? p.status : "offline") as Row["status"], role: resolvedRole === "global_owner" ? "global_owner" : speakerById.has(member.id) ? "speaker" : resolvedRole, speaking: speakerById.has(member.id) };
    });
    const realIds = new Set(realRows.map((row) => row.id));
    const liveOnlyRows = presence.filter((entry) => !entry.userId.startsWith("virtual-") && !realIds.has(entry.userId)).map((entry) => ({ id: entry.userId, name: entry.displayName || "عضو", avatar: entry.avatarUrl, status: entry.status as Row["status"], role: "member" as const, speaking: false }));
    const merged = [...realRows, ...liveOnlyRows];
    const mergedIds = new Set(merged.map((row) => row.id));
    const aiRows = virtualMembers.filter((member) => !mergedIds.has(member.id)).map((member, index) => ({ id: member.id, name: member.display_name || member.username || "عضو", avatar: member.avatar_url, status: "online" as const, role: index === 2 || index === 6 ? "vip" as const : "member" as const, speaking: false, virtual: true }));
    return [...merged, ...aiRows];
  }, [members, presence, presenceById, roleById, speakerById, virtualMembers]);
  const staff = rows.filter((row) => row.role === "global_owner" || row.role === "global_admin" || row.role === "admin" || row.role === "owner" || row.role === "moderator");
  const speakers = rows.filter((row) => row.speaking && !staff.some((x) => x.id === row.id));
  const vip = rows.filter((row) => row.role === "vip");
  const online = rows.filter((row) => row.role === "member" && row.status !== "offline");

  const changeRole = useMutation({ mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "member" | "moderator" }) => {
    if (!roomId || !user || !canManageRoles) throw new Error("غير مصرح");
    if (userId.startsWith("virtual-") || userId === user.id || userId === roomMeta.data?.ownerId || platformOwnersQuery.data?.has(userId)) throw new Error("لا يمكن تعديل هذا العضو");
    if (role === "admin" && !canAssignRoomAdmin) throw new Error("فقط مالك الغرفة يستطيع تعيين أدمن");
    const { error } = await supabase.from("room_members").update({ role }).eq("room_id", roomId).eq("user_id", userId);
    if (error) throw error;
  }, onSuccess: async (_, input) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["room-role-meta", roomId] }),
      qc.invalidateQueries({ queryKey: ["room_members", "profiles", roomId] }),
      qc.invalidateQueries({ queryKey: ["platform-owners", realMemberIds.join(",")] }),
    ]);
    toast.success(input.role === "admin" ? "تم تعيين أدمن الغرفة بنجاح" : input.role === "moderator" ? "تم تعيين العضو مشرفاً" : "تم إرجاع العضو إلى عضو");
  }, onError: (error) => toast.error((error as Error).message) });

  const renderRoleActions = (row: Row) => {
    if (!canManageRoles || !roomId || row.virtual || row.id === user?.id || row.id === roomMeta.data?.ownerId || row.role === "speaker" || row.role === "global_owner" || row.role === "global_admin") return null;
    const isModerator = row.role === "moderator";
    const isAdmin = row.role === "admin";
    return <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`تعديل رتبة ${row.name}`}><MoreVertical className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-48">
      {canAssignRoomAdmin && !isAdmin ? <DropdownMenuItem onClick={() => changeRole.mutate({ userId: row.id, role: "admin" })} disabled={changeRole.isPending}><Crown className="size-4" />تعيين كأدمن الغرفة</DropdownMenuItem> : null}
      {canAssignRoomAdmin && isAdmin ? <DropdownMenuItem onClick={() => changeRole.mutate({ userId: row.id, role: "member" })} disabled={changeRole.isPending}><Shield className="size-4" />سحب رتبة الأدمن</DropdownMenuItem> : null}
      {canAssignRoomAdmin && (isAdmin || !isModerator) ? <DropdownMenuSeparator /> : null}
      {!isAdmin ? <DropdownMenuItem onClick={() => changeRole.mutate({ userId: row.id, role: isModerator ? "member" : "moderator" })} disabled={changeRole.isPending}><Shield className="size-4" />{isModerator ? "إزالة رتبة المشرف" : "تعيين كمشرف"}</DropdownMenuItem> : null}
    </DropdownMenuContent></DropdownMenu>;
  };
  const renderRow = (row: Row) => <li key={row.id} className={`group relative flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-secondary/60 ${row.role === "global_owner" ? "border border-amber-300/50 bg-amber-500/[0.12]" : row.role === "global_admin" ? "border border-rose-500/40 bg-rose-500/[0.10]" : row.role === "admin" ? "border border-rose-400/30 bg-rose-500/[0.08]" : row.role === "owner" ? "border border-amber-400/20 bg-amber-500/[0.05]" : row.role === "moderator" ? "border border-sky-400/15 bg-sky-500/[0.04]" : row.role === "vip" ? "border border-fuchsia-400/15 bg-fuchsia-500/[0.04]" : ""}`}>
    <Link to="/profile/$userId" params={{ userId: row.id }} className="flex min-w-0 flex-1 items-center gap-2"><UserAvatar name={row.name} src={row.avatar} size="sm" status={row.status} role={row.role === "global_owner" || row.role === "global_admin" || row.role === "owner" || row.role === "admin" || row.role === "moderator" || row.role === "vip" || row.role === "speaker" ? row.role : null} showMemberBadge={row.role === "member"} autoCurrentRole={false} /><span className={`min-w-0 flex-1 truncate text-xs sm:text-sm ${row.role === "global_owner" ? "font-black text-amber-200" : row.role === "global_admin" ? "font-black text-rose-200" : row.role === "admin" ? "font-black text-rose-300" : row.role === "owner" ? "font-black text-amber-300" : row.role === "vip" ? "font-bold text-fuchsia-300" : row.role === "moderator" ? "font-bold text-sky-300" : "font-semibold"}`}>{row.role === "global_owner" ? "👑👑 " : row.role === "global_admin" ? "👑👑 " : row.role === "admin" ? "🌹 👑 " : row.role === "owner" ? "👑 " : ""}{row.name}</span></Link>
    {row.role === "global_owner" ? <Badge className="order-first shrink-0 border-amber-200 bg-amber-400/20 px-1.5 py-0 text-[8px] font-black text-amber-100">GLOBAL OWNER</Badge> : null}{row.role === "global_admin" ? <Badge className="order-first shrink-0 border-rose-400/50 bg-rose-500/20 px-1.5 py-0 text-[8px] font-black text-rose-200">GLOBAL ADMIN</Badge> : null}{row.role === "admin" ? <Badge className="order-first shrink-0 border-rose-400/40 bg-rose-500/15 px-1.5 py-0 text-[8px] font-black text-rose-300">ADMIN</Badge> : null}{row.role === "owner" ? <Badge className="order-first shrink-0 border-amber-400/30 bg-amber-500/10 px-1.5 py-0 text-[8px] font-black text-amber-300">مالك</Badge> : null}{row.role === "moderator" ? <Badge className="order-first shrink-0 border-sky-400/30 bg-sky-500/10 px-1.5 py-0 text-[8px] font-bold text-sky-300">MOD</Badge> : null}{row.role === "vip" ? <Crown className="size-3 shrink-0 text-fuchsia-300" aria-label="VIP" /> : null}{row.speaking ? <Mic2 className="size-3 shrink-0 animate-pulse text-emerald-400" aria-label="على المايك" /> : null}{renderRoleActions(row)}
  </li>;
  const section = (title: string, list: Row[]) => list.length ? <section className="px-2.5 pt-2.5"><p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title} · {list.length}</p><ul className="space-y-1">{list.slice(0, 48).map(renderRow)}</ul></section> : null;
  const onlineCount = rows.filter((row) => row.status !== "offline").length;
  return <><header className="flex shrink-0 items-center gap-2 border-b px-3 py-3 sm:px-4 sm:py-4"><Users className="size-4 shrink-0 text-primary sm:size-5" /><h2 className="min-w-0 truncate font-display text-xs font-bold sm:text-sm">{t.chat.members}</h2><Badge variant="secondary" className="ms-auto shrink-0 px-1.5 text-[10px] sm:px-2 sm:text-xs">{onlineCount} متصل</Badge></header><div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim pb-3">{section("🌹 👑 الإدارة والمشرفون", staff)}{section("🎙️ على المايك", speakers)}{section("💎 VIP", vip)}{section("المتواجدون الآن", online)}{rows.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground">لا يوجد أعضاء في الغرفة حالياً.</p> : null}</div><section className="shrink-0 border-t bg-secondary/25 p-2.5"><div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">نشاط الغرفة</div><div className="space-y-1">{activity.length === 0 ? <p className="text-[11px] leading-4 text-muted-foreground">الأعضاء يدخلون ويخرجون بشكل طبيعي…</p> : activity.slice(0, 4).map((event) => <div key={event.id} className="flex min-w-0 items-center gap-2 text-[11px]"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-background">{event.type === "join" ? <LogIn className="size-3 text-emerald-400" /> : <LogOut className="size-3 text-muted-foreground" />}</span><span className="truncate">{event.displayName}</span></div>)}</div></section></>;
}

export function MembersPanel(props: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    const onRoomNameClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const heading = target?.closest("header h1");
      if (heading) setOpen(true);
    };
    document.addEventListener("click", onRoomNameClick);
    return () => { media.removeEventListener("change", sync); document.removeEventListener("click", onRoomNameClick); };
  }, []);
  if (isMobile) return <>{open ? <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setOpen(false)}><div className="absolute inset-y-0 end-0 flex w-[min(92vw,390px)] flex-col border-s bg-background/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-end duration-300" onClick={(event) => event.stopPropagation()}><Button type="button" variant="secondary" size="icon" className="absolute start-3 top-3 z-10 size-9 rounded-full shadow-sm" onClick={() => setOpen(false)} aria-label="إغلاق أعضاء الغرفة">×</Button><PanelContent {...props} /></div></div> : null}</>;
  return <PanelContent {...props} />;
}