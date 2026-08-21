import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Mic2, MoreVertical, Shield, Users, LogIn, LogOut } from "lucide-react";
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
type Role = "admin" | "moderator" | "vip" | "speaker" | "owner" | "member" | null;
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
  });
  const globalRoles = useQuery(myRolesQuery(user?.id));
  const canManageRoles = Boolean(user && (globalRoles.data?.isAdmin || roomMeta.data?.ownerId === user.id));
  const rolesQuery = useQuery({ queryKey: ["member-roles", realMemberIds.join(",")], enabled: realMemberIds.length > 0, staleTime: 60000, queryFn: async () => {
    const [{ data: roles }, { data: vip }] = await Promise.all([
      supabase.from("user_roles").select("user_id,role").in("user_id", realMemberIds),
      looseDb.from("premium_subscriptions").select("user_id,status,expires_at").in("user_id", realMemberIds).eq("status", "active"),
    ]);
    return { roles: roles ?? [], vip: ((vip ?? []) as any[]).filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now()) };
  });
  const voiceQuery = useQuery({ queryKey: ["room-speakers", roomId], enabled: Boolean(roomId), staleTime: 4000, refetchInterval: 5000, queryFn: async () => {
    const { data, error } = await supabase.from("room_voice_participants").select("user_id,is_speaker,is_muted").eq("room_id", roomId!).eq("is_speaker", true);
    if (error) throw error;
    return data ?? [];
  });
  const roleById = useMemo(() => {
    const map = new Map<string, Role>();
    for (const row of roomMeta.data?.roomRoles ?? []) {
      if (row.role === "owner") map.set(row.user_id, "owner");
      else if (row.role === "moderator" && map.get(row.user_id) !== "owner") map.set(row.user_id, "moderator");
      else if (!map.has(row.user_id)) map.set(row.user_id, "member");
    }
    for (const row of rolesQuery.data?.roles ?? []) {
      if (row.role === "admin") map.set(row.user_id, "admin");
      else if (row.role === "moderator" && !map.has(row.user_id)) map.set(row.user_id, "moderator");
    }
    for (const row of (rolesQuery.data?.vip ?? []) as any[]) if (!map.has(row.user_id)) map.set(row.user_id, "vip");
    return map;
  }, [roomMeta.data, rolesQuery.data]);
  const speakerById = useMemo(() => new Map((voiceQuery.data ?? []).filter((row) => !String(row.user_id).startsWith("virtual-")).map((row) => [row.user_id, row])), [voiceQuery.data]);
  const rows = useMemo<Row[]>(() => {
    const realRows = members.filter((member) => !member.id.startsWith("virtual-")).map((member) => {
      const p = presenceById.get(member.id);
      return { id: member.id, name: member.display_name || member.username || "—", avatar: member.avatar_url, status: (p?.status === "online" || p?.status === "away" || p?.status === "offline" ? p.status : "offline") as Row["status"], role: speakerById.has(member.id) ? "speaker" : (roleById.get(member.id) ?? "member"), speaking: speakerById.has(member.id) };
    });
    const realIds = new Set(realRows.map((row) => row.id));
    const liveOnlyRows = presence.filter((entry) => !entry.userId.startsWith("virtual-") && !realIds.has(entry.userId)).map((entry) => ({ id: entry.userId, name: entry.displayName || "عضو", avatar: entry.avatarUrl, status: entry.status as Row["status"], role: "member" as const, speaking: false }));
    const merged = [...realRows, ...liveOnlyRows];
    const mergedIds = new Set(merged.map((row) => row.id));
    const aiRows = virtualMembers.filter((member) => !mergedIds.has(member.id)).map((member, index) => ({ id: member.id, name: member.display_name || member.username || "عضو", avatar: member.avatar_url, status: "online" as const, role: index === 2 || index === 6 ? "vip" as const : "member" as const, speaking: false, virtual: true }));
    return [...merged, ...aiRows];
  }, [members, presence, presenceById, roleById, speakerById, virtualMembers]);
  const staff = rows.filter((row) => row.role === "admin" || row.role === "owner" || row.role === "moderator");
  const speakers = rows.filter((row) => row.speaking && !staff.some((x) => x.id === row.id));
  const vip = rows.filter((row) => row.role === "vip");
  const online = rows.filter((row) => row.role === "member" && row.status !== "offline");
  const changeRole = useMutation({ mutationFn: async ({ userId, role }: { userId: string; role: "member" | "moderator" }) => {
    if (!roomId || !user || !canManageRoles) throw new Error("غير مصرح");
    if (userId.startsWith("virtual-") || userId === user.id || userId === roomMeta.data?.ownerId) throw new Error("لا يمكن تعديل هذا العضو");
    const { error } = await supabase.from("room_members").update({ role }).eq("room_id", roomId).eq("user_id", userId);
    if (error) throw error;
  }, onSuccess: async (_, input) => { await qc.invalidateQueries({ queryKey: ["room-role-meta", roomId] }); await qc.invalidateQueries({ queryKey: ["room_members", "profiles", roomId] }); toast.success(input.role === "moderator" ? "تم تعيين العضو مشرفاً في الغرفة" : "تم إرجاع العضو إلى رتبة عضو"); }, onError: (error) => toast.error((error as Error).message) });
  const renderRoleActions = (row: Row) => {
    if (!canManageRoles || !roomId || row.virtual || row.id === user?.id || row.id === roomMeta.data?.ownerId || row.role === "admin" || row.role === "speaker") return null;
    const isModerator = row.role === "moderator";
    return <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`تعديل رتبة ${row.name}`}><MoreVertical className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-44"><DropdownMenuItem onClick={() => changeRole.mutate({ userId: row.id, role: isModerator ? "member" : "moderator" })} disabled={changeRole.isPending}><Shield className="size-4" />{isModerator ? "إزالة رتبة المشرف" : "تعيين كمشرف"}</DropdownMenuItem>{isModerator ? <DropdownMenuSeparator /> : null}{isModerator ? <DropdownMenuItem onClick={() => changeRole.mutate({ userId: row.id, role: "member" })} disabled={changeRole.isPending}>إرجاع إلى عضو</DropdownMenuItem> : null}</DropdownMenuContent></DropdownMenu>;
  };
  const renderRow = (row: Row) => <li key={row.id} className={`group relative flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-secondary/60 ${row.role === "admin" ? "border border-rose-400/30 bg-rose-500/[0.08]" : row.role === "owner" ? "border border-amber-400/20 bg-amber-500/[0.05]" : row.role === "moderator" ? "border border-sky-400/15 bg-sky-500/[0.04]" : row.role === "vip" ? "border border-fuchsia-400/15 bg-fuchsia-500/[0.04]" : ""}`}>
    <Link to="/profile/$userId" params={{ userId: row.id }} className="flex min-w-0 flex-1 items-center gap-2"><UserAvatar name={row.name} src={row.avatar} size="sm" status={row.status} role={row.role === "owner" ? "admin" : row.role === "moderator" || row.role === "admin" || row.role === "vip" ? row.role : null} showMemberBadge={row.role === "member"} autoCurrentRole={false} /><span className={`min-w-0 flex-1 truncate text-xs sm:text-sm ${row.role === "admin" ? "font-black text-rose-300" : row.role === "owner" ? "font-black text-amber-300" : row.role === "vip" ? "font-bold text-fuchsia-300" : row.role === "moderator" ? "font-bold text-sky-300" : "font-semibold"}`}>{row.role === "admin" ? "🌹 👑 " : row.role === "owner" ? "👑 " : ""}{row.name}</span></Link>
    {row.role === "admin" ? <Badge className="order-first shrink-0 border-rose-400/40 bg-rose-500/15 px-1.5 py-0 text-[8px] font-black text-rose-300">ADMIN</Badge> : null}{row.role === "owner" ? <Badge className="order-first shrink-0 border-amber-400/30 bg-amber-500/10 px-1.5 py-0 text-[8px] font-black text-amber-300">مالك</Badge> : null}{row.role === "moderator" ? <Badge className="order-first shrink-0 border-sky-400/30 bg-sky-500/10 px-1.5 py-0 text-[8px] font-bold text-sky-300">MOD</Badge> : null}{row.role === "vip" ? <Crown className="size-3 shrink-0 text-fuchsia-300" aria-label="VIP" /> : null}{row.speaking ? <Mic2 className="size-3 shrink-0 animate-pulse text-emerald-400" aria-label="على المايك" /> : null}{renderRoleActions(row)}
  </li>;
  const section = (title: string, list: Row[]) => list.length ? <section className="px-2.5 pt-2.5"><p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title} · {list.length}</p><ul className="space-y-1">{list.slice(0, 48).map(renderRow)}</ul></section> : null;
  const onlineCount = rows.filter((row) => row.status !== "offline").length;
  return <><header className="flex shrink-0 items-center gap-2 border-b px-3 py-3 sm:px-4 sm:py-4"><Users className="size-4 shrink-0 text-primary sm:size-5" /><h2 className="min-w-0 truncate font-display text-xs font-bold sm:text-sm">{t.chat.members}</h2><Badge variant="secondary" className="ms-auto shrink-0 px-1.5 text-[10px] sm:px-2 sm:text-xs">{onlineCount} متصل</Badge></header><div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim pb-3">{section("🌹 👑 الإدارة والمشرفون", staff)}{section("🎙️ على المايك", speakers)}{section("💎 VIP", vip)}{section("المتواجدون الآن", online)}{rows.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground">لا يوجد أعضاء في الغرفة حالياً.</p> : null}</div><section className="shrink-0 border-t bg-secondary/25 p-2.5"><div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">نشاط الغرفة</div><div className="space-y-1">{activity.length === 0 ? <p className="text-[11px] leading-4 text-muted-foreground">الأعضاء يدخلون ويخرجون بشكل طبيعي…</p> : activity.slice(0, 4).map((event) => <div key={event.id} className="flex min-w-0 items-center gap-2 text-[11px]"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-background">{event.type === "join" ? <LogIn className="size-3 text-emerald-400" /> : <LogOut className="size-3 text-muted-foreground" />}</span><span className="truncate">{event.displayName}</span></div>)}</div></section></>;
}

export function MembersPanel(props: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  useEffect(() => { const media = window.matchMedia("(max-width: 1023px)"); const sync = () => setIsMobile(media.matches); sync(); media.addEventListener("change", sync); return () => media.removeEventListener("change", sync); }, []);
  if (isMobile) return <><Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Users className="size-4" />{t.chat.members}</Button>{open ? <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)}><div className="absolute inset-y-0 end-0 flex w-[min(92vw,380px)] flex-col bg-background shadow-2xl" onClick={(event) => event.stopPropagation()}><Button type="button" variant="ghost" size="icon" className="absolute start-2 top-2 z-10" onClick={() => setOpen(false)} aria-label="إغلاق">×</Button><PanelContent {...props} /></div></div> : null}</>;
  return <PanelContent {...props} />;
}
