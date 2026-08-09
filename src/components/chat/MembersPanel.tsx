import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Mic2, MoreVertical, Shield, Users, LogIn, LogOut, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { supabase } from "@/integrations/supabase/client";
import { myRolesQuery } from "@/services/roles.service";
import type { PresenceActivity, PresenceEntry } from "@/hooks/use-presence";
import type { Profile } from "@/types";

type Props = { members: Profile[]; presence: PresenceEntry[]; activity?: PresenceActivity[]; roomId?: string };
type Role = "admin" | "moderator" | "vip" | "speaker" | "owner" | "member" | null;
type Row = { id: string; name: string; avatar: string | null; status: "online" | "away" | "offline"; role: Role; speaking: boolean };

function PanelContent({ members, presence, activity = [], roomId }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const presenceById = new Map(presence.map((entry) => [entry.userId, entry]));
  const memberIds = members.map((member) => member.id);
  const roomMeta = useQuery({ queryKey: ["room-role-meta", roomId], enabled: Boolean(roomId), queryFn: async () => {
    const [{ data: room, error: roomError }, { data: roomRoles, error: roleError }] = await Promise.all([
      supabase.from("rooms").select("owner_id").eq("id", roomId!).maybeSingle(),
      supabase.from("room_members").select("user_id,role").eq("room_id", roomId!),
    ]);
    if (roomError) throw roomError;
    if (roleError) throw roleError;
    return { ownerId: room?.owner_id ?? null, roomRoles: roomRoles ?? [] };
  }, staleTime: 10000 });
  const globalRoles = useQuery(myRolesQuery(user?.id));
  const canManageRoles = Boolean(user && (globalRoles.data?.isAdmin || roomMeta.data?.ownerId === user.id));
  const rolesQuery = useQuery({ queryKey: ["member-roles", memberIds.join(",")], enabled: memberIds.length > 0, queryFn: async () => {
    const [{ data: roles }, { data: vip }] = await Promise.all([
      supabase.from("user_roles").select("user_id,role").in("user_id", memberIds),
      supabase.from("premium_subscriptions").select("user_id,status,expires_at").in("user_id", memberIds).eq("status", "active"),
    ]);
    return { roles: roles ?? [], vip: (vip ?? []).filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now()) };
  }, staleTime: 30000 });
  const voiceQuery = useQuery({ queryKey: ["room-speakers", roomId], enabled: Boolean(roomId), queryFn: async () => {
    const { data, error } = await supabase.from("room_voice_participants").select("user_id,is_speaker,is_muted").eq("room_id", roomId!).eq("is_speaker", true);
    if (error) throw error;
    return data ?? [];
  }, staleTime: 0, refetchInterval: 3000 });
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
    for (const row of rolesQuery.data?.vip ?? []) if (!map.has(row.user_id)) map.set(row.user_id, "vip");
    return map;
  }, [roomMeta.data, rolesQuery.data]);
  const speakerById = useMemo(() => new Map((voiceQuery.data ?? []).map((row) => [row.user_id, row])), [voiceQuery.data]);
  const rows = useMemo<Row[]>(() => members.map((member) => {
    const p = presenceById.get(member.id);
    return { id: member.id, name: member.display_name || member.username || "—", avatar: member.avatar_url, status: p?.status ?? "offline", role: speakerById.has(member.id) ? "speaker" : (roleById.get(member.id) ?? null), speaking: speakerById.has(member.id) };
  }), [members, presence, roleById, speakerById]);
  const staff = rows.filter((row) => row.role === "admin" || row.role === "owner" || row.role === "moderator");
  const speakers = rows.filter((row) => row.speaking && !staff.some((staffRow) => staffRow.id === row.id));
  const vip = rows.filter((row) => row.role === "vip");
  const online = rows.filter((row) => row.status !== "offline" && !speakers.some((speaker) => speaker.id === row.id) && !staff.some((staffRow) => staffRow.id === row.id) && !vip.some((vipRow) => vipRow.id === row.id));
  const changeRole = useMutation({ mutationFn: async ({ userId, role }: { userId: string; role: "member" | "moderator" }) => {
    if (!roomId || !user || !canManageRoles) throw new Error("غير مصرح");
    if (userId === user.id || userId === roomMeta.data?.ownerId) throw new Error("لا يمكن تعديل هذا العضو");
    const { error } = await supabase.from("room_members").update({ role }).eq("room_id", roomId).eq("user_id", userId);
    if (error) throw error;
  }, onSuccess: async (_, input) => {
    await qc.invalidateQueries({ queryKey: ["room-role-meta", roomId] });
    await qc.invalidateQueries({ queryKey: ["room_members", "profiles", roomId] });
    toast.success(input.role === "moderator" ? "تم تعيين العضو مشرفاً في الغرفة" : "تم إرجاع العضو إلى رتبة عضو");
  }, onError: (error) => toast.error((error as Error).message) });
  const renderRoleActions = (row: Row) => {
    if (!canManageRoles || !roomId || row.id === user?.id || row.id === roomMeta.data?.ownerId || row.role === "admin" || row.role === "speaker") return null;
    const isModerator = row.role === "moderator";
    return <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label={`تعديل رتبة ${row.name}`}><MoreVertical className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-44"><DropdownMenuItem onClick={() => changeRole.mutate({ userId: row.id, role: isModerator ? "member" : "moderator" })} disabled={changeRole.isPending}><Shield className="size-4" />{isModerator ? "إزالة رتبة المشرف" : "تعيين كمشرف"}</DropdownMenuItem>{isModerator ? <DropdownMenuSeparator /> : null}{isModerator ? <DropdownMenuItem onClick={() => changeRole.mutate({ userId: row.id, role: "member" })} disabled={changeRole.isPending}>إرجاع إلى عضو</DropdownMenuItem> : null}</DropdownMenuContent></DropdownMenu>;
  };
  const renderRow = (row: Row) => <li key={row.id} className={`group relative flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 transition-all hover:bg-secondary/60 ${row.role === "admin" ? "border border-rose-400/30 bg-rose-500/[0.08]" : row.role === "owner" ? "border border-amber-400/20 bg-amber-500/[0.05]" : row.role === "moderator" ? "border border-sky-400/15 bg-sky-500/[0.04]" : ""}`}>
    <UserAvatar name={row.name} src={row.avatar} size="sm" status={row.status} role={row.role === "owner" ? "admin" : row.role} />
    <span className={`min-w-0 flex-1 truncate text-xs sm:text-sm ${row.role === "admin" ? "font-black text-rose-300" : row.role === "owner" ? "font-black text-amber-300" : row.role === "vip" ? "font-bold text-fuchsia-300" : row.role === "moderator" ? "font-bold text-sky-300" : "font-semibold"}`}>{row.role === "admin" ? "🌹 👑 " : row.role === "owner" ? "👑 " : ""}{row.name}</span>
    {row.role === "admin" ? <Badge className="shrink-0 border-rose-400/40 bg-rose-500/15 px-1.5 py-0 text-[8px] font-black text-rose-300">ADMIN</Badge> : null}
    {row.role === "owner" ? <Badge className="shrink-0 border-amber-400/30 bg-amber-500/10 px-1.5 py-0 text-[8px] font-black text-amber-300">مالك</Badge> : null}
    {row.role === "moderator" ? <Badge className="shrink-0 border-sky-400/30 bg-sky-500/10 px-1.5 py-0 text-[8px] font-bold text-sky-300">MOD</Badge> : null}
    {row.role === "vip" ? <Crown className="size-3 shrink-0 text-fuchsia-300" aria-label="VIP" /> : null}
    {row.speaking ? <Mic2 className="size-3 shrink-0 animate-pulse text-emerald-400" aria-label="على المايك" /> : null}
    {renderRoleActions(row)}
  </li>;
  const section = (title: string, list: Row[]) => list.length ? <section className="px-2.5 pt-2.5"><p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title} · {list.length}</p><ul className="space-y-1">{list.slice(0, 48).map(renderRow)}</ul></section> : null;
  const onlineCount = rows.filter((row) => row.status !== "offline").length;
  return <><header className="flex shrink-0 items-center gap-2 border-b px-3 py-3 sm:px-4 sm:py-4"><Users className="size-4 shrink-0 text-primary sm:size-5" /><h2 className="min-w-0 truncate font-display text-xs font-bold sm:text-sm">{t.chat.members}</h2><Badge variant="secondary" className="ms-auto shrink-0 px-1.5 text-[10px] sm:px-2 sm:text-xs">{onlineCount} متصل</Badge></header><div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim pb-3">{section("🌹 👑 الإدارة والمشرفون", staff)}{section("🎙️ على المايك", speakers)}{section("💎 VIP", vip)}{section("المتواجدون", online)}{rows.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground">لا يوجد أعضاء حقيقيون في الغرفة حالياً.</p> : null}</div><section className="shrink-0 border-t bg-secondary/25 p-2.5"><div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">نشاط الغرفة</div><div className="space-y-1">{activity.length === 0 ? <p className="text-[11px] leading-4 text-muted-foreground">بانتظار دخول أو مغادرة…</p> : activity.slice(0, 4).map((event) => <div key={event.id} className="flex min-w-0 items-center gap-2 text-[11px]"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-background">{event.type === "join" ? <LogIn className="size-3 text-emerald-400" /> : <LogOut className="size-3 text-muted-foreground" />}</span><span className="truncate">{event.displayName} {event.type === "join" ? "دخل الغرفة" : "غادر الغرفة"}</span></div>)}</div></section></>;
}

export function MembersPanel(props: Props) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches);
  const { t } = useI18n();
  useEffect(() => { const media = window.matchMedia("(max-width: 1023px)"); const sync = () => setIsMobile(media.matches); sync(); media.addEventListener("change", sync); return () => media.removeEventListener("change", sync); }, []);
  useEffect(() => { if (!isMobile || typeof document === "undefined") return; const title = document.querySelector<HTMLElement>("main header h1"); if (!title) return; const previousRole = title.getAttribute("role"); const previousTabIndex = title.getAttribute("tabindex"); const previousLabel = title.getAttribute("aria-label"); title.setAttribute("role", "button"); title.setAttribute("tabindex", "0"); title.setAttribute("aria-label", `${title.textContent?.trim() || "الغرفة"} — ${t.chat.members}`); title.classList.add("cursor-pointer", "select-none"); const openFromTitle = () => setOpen(true); const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen(true); } }; title.addEventListener("click", openFromTitle); title.addEventListener("keydown", onKeyDown); return () => { title.removeEventListener("click", openFromTitle); title.removeEventListener("keydown", onKeyDown); if (previousRole === null) title.removeAttribute("role"); else title.setAttribute("role", previousRole); if (previousTabIndex === null) title.removeAttribute("tabindex"); else title.setAttribute("tabindex", previousTabIndex); if (previousLabel === null) title.removeAttribute("aria-label"); else title.setAttribute("aria-label", previousLabel); title.classList.remove("cursor-pointer", "select-none"); }; }, [isMobile, t.chat.members]);
  useEffect(() => { if (!open) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, [open]);
  useEffect(() => { if (!open) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [open]);
  if (isMobile) return <>{open ? <div className="fixed inset-0 z-[70]" role="presentation"><button type="button" className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="إغلاق الأعضاء" /><aside className="absolute inset-y-0 end-0 flex w-[min(88vw,22rem)] flex-col overflow-hidden border-s bg-background shadow-2xl" role="dialog" aria-modal="true" aria-label={t.chat.members}><div className="flex shrink-0 items-center justify-between border-b p-2"><span className="px-2 text-xs font-semibold text-muted-foreground">{t.chat.members}</span><Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="إغلاق"><X className="size-4" /></Button></div><PanelContent {...props} /></aside></div> : null}</>;
  return <aside className="glass flex w-full min-w-0 flex-col overflow-hidden rounded-2xl"><PanelContent {...props} /></aside>;
}
