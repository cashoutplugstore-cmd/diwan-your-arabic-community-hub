import { Crown, Mic2, Shield, ShieldCheck, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { myRolesQuery } from "@/services/roles.service";
import { profileQuery } from "@/services/profiles.service";
import { looseDb } from "@/integrations/supabase/loose-db";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "moderator" | "vip" | "speaker";
type Props = { name?: string | null; src?: string | null; size?: "sm" | "md" | "lg"; status?: string | null | undefined; role?: Role | null; className?: string; showMemberBadge?: boolean; autoCurrentRole?: boolean };
type PublicRole = { user_id: string; role: string };
type PublicProfile = { id: string; username: string; display_name: string; avatar_url: string | null };

const sizes = { sm: "size-8", md: "size-10", lg: "size-16" };
const labels = { admin: "ADMIN", moderator: "MOD", vip: "VIP", speaker: "MIC" } as const;

export function UserAvatar({ name, src, size = "md", status, role, className, showMemberBadge = false, autoCurrentRole = true }: Props) {
  const { user } = useAuth();
  const profile = useQuery({ ...profileQuery(user?.id), enabled: autoCurrentRole && Boolean(user?.id) });
  const currentRoles = useQuery({ ...myRolesQuery(user?.id), enabled: autoCurrentRole && Boolean(user?.id) });
  const premium = useQuery({ queryKey: ["avatar-premium", user?.id], enabled: autoCurrentRole && Boolean(user?.id), staleTime: 60000, queryFn: async () => { if (!user?.id) return false; const { data } = await looseDb.from("premium_subscriptions").select("status,expires_at").eq("user_id", user.id).eq("status", "active").limit(1); const row = (data as any[] | null)?.[0]; return Boolean(row && (!row.expires_at || new Date(row.expires_at).getTime() > Date.now())); } });
  const publicStaff = useQuery({ queryKey: ["public-avatar-staff"], enabled: Boolean(name && !role), staleTime: 30000, queryFn: async () => { const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([supabase.from("profiles").select("id,username,display_name,avatar_url"), supabase.from("user_roles").select("user_id,role")]); if (profilesError) throw profilesError; if (rolesError) throw rolesError; return { profiles: (profiles ?? []) as PublicProfile[], roles: (roles ?? []) as PublicRole[] }; } });
  const publicRole = (() => { if (!name || role || !publicStaff.data) return null; const candidates = publicStaff.data.profiles.filter((p) => p.username === name || p.display_name === name); const matched = candidates.length === 1 ? candidates[0] : candidates.find((p) => Boolean(src && p.avatar_url === src)); if (!matched) return null; const roles = publicStaff.data.roles.filter((r) => r.user_id === matched.id).map((r) => r.role); if (roles.includes("admin")) return "admin" as const; if (roles.includes("moderator")) return "moderator" as const; return null; })();
  const currentName = profile.data?.display_name || profile.data?.username || user?.email?.split("@")[0] || "";
  const isCurrentUser = Boolean(autoCurrentRole && user?.id && name && currentName && name === currentName);
  const effectiveRole: Role | null = role ?? publicRole ?? (isCurrentUser && currentRoles.data?.isAdmin ? "admin" : isCurrentUser && currentRoles.data?.isModerator ? "moderator" : isCurrentUser && premium.data ? "vip" : null);
  const Icon = effectiveRole === "admin" ? ShieldCheck : effectiveRole === "moderator" ? Shield : effectiveRole === "vip" ? Crown : Mic2;
  const showCompactRoleBadge = size !== "sm";
  const isMember = showCompactRoleBadge && (showMemberBadge || status === "online" || isCurrentUser) && !effectiveRole;
  return <div className={cn("relative shrink-0", showCompactRoleBadge && "pt-2", className)}><Avatar className={cn(sizes[size], "ring-2 ring-border", effectiveRole === "admin" && "ring-sky-400 shadow-[0_0_18px_rgba(56,189,248,.42)]", effectiveRole === "moderator" && "ring-blue-400 shadow-[0_0_14px_rgba(96,165,250,.34)]", effectiveRole === "vip" && "ring-fuchsia-400 shadow-[0_0_14px_rgba(232,121,249,.42)]", effectiveRole === "speaker" && "ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.4)]", isMember && "ring-slate-400/70")}>
    {src ? <AvatarImage src={src} alt={name ?? ""} /> : null}<AvatarFallback className="font-display text-xs">{(name ?? "?").trim().slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
    {status ? <span aria-label={status} className={cn("absolute bottom-1 -end-0.5 size-3 rounded-full border-2 border-background", status === "online" ? "bg-success" : "bg-muted-foreground")} /> : null}
    {showCompactRoleBadge && effectiveRole ? <span className={cn("absolute top-0 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[8px] font-black leading-none shadow-sm", effectiveRole === "admin" && "border-sky-300/70 bg-sky-500 text-white", effectiveRole === "moderator" && "border-blue-300/60 bg-blue-500 text-white", effectiveRole === "vip" && "border-fuchsia-400/50 bg-fuchsia-400 text-fuchsia-950", effectiveRole === "speaker" && "border-emerald-400/50 bg-emerald-400 text-emerald-950")}><Icon className="me-0.5 inline size-2.5" />{labels[effectiveRole]}</span> : null}
    {isMember ? <span className="absolute top-0 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-500/50 bg-slate-700/90 px-1.5 py-0.5 text-[8px] font-bold leading-none text-slate-100">عضو</span> : null}{effectiveRole === "admin" ? <span className="absolute -start-1 top-0 text-[11px]" aria-hidden="true">🌹</span> : null}{effectiveRole === "admin" ? <Crown className="absolute -end-1 -top-1 size-3 text-sky-300 drop-shadow" /> : null}{effectiveRole === "vip" ? <Sparkles className="absolute -end-1 top-0 size-3 text-fuchsia-300" /> : null}{effectiveRole === "speaker" ? <span className="absolute bottom-0 -start-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-white"><Mic2 className="size-2.5" /></span> : null}
  </div>;
}
