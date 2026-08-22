import { Crown, Gem, Mic2, Shield, ShieldCheck, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { myRolesQuery } from "@/services/roles.service";
import { looseDb } from "@/integrations/supabase/loose-db";
import { ROLE_DESIGN } from "@/config/role-design";

type Role = "global_owner" | "global_admin" | "owner" | "admin" | "moderator" | "vip" | "speaker";
type Props = { name?: string | null; src?: string | null; size?: "sm" | "md" | "lg"; status?: string | null | undefined; role?: Role | null; className?: string; showMemberBadge?: boolean; autoCurrentRole?: boolean };
const sizes = { sm: "size-8", md: "size-10", lg: "size-16" };
const icons = { global_owner: Crown, global_admin: Gem, owner: Crown, admin: ShieldCheck, moderator: Shield, vip: Crown, speaker: Mic2 } as const;

export function UserAvatar({ name, src, size = "md", status, role, className, showMemberBadge = false, autoCurrentRole = true }: Props) {
  const { user } = useAuth();
  // Keep the current user's global-owner status visible even when a parent
  // intentionally disables the broader automatic-role lookup (the chat does).
  const currentRoles = useQuery({ ...myRolesQuery(user?.id), enabled: Boolean(user?.id) && (autoCurrentRole || !role) });
  const premium = useQuery({ queryKey: ["avatar-premium", user?.id], enabled: autoCurrentRole && Boolean(user?.id), staleTime: 60000, queryFn: async () => { if (!user?.id) return false; const { data } = await looseDb.from("premium_subscriptions").select("status,expires_at").eq("user_id", user.id).eq("status", "active").limit(1); const row = (data as any[] | null)?.[0]; return Boolean(row && (!row.expires_at || new Date(row.expires_at).getTime() > Date.now())); } });
  const isCurrentUser = Boolean(user?.id && user?.id === (user?.id));
  const globalOwnerWins = Boolean(isCurrentUser && currentRoles.data?.isGlobalOwner);
  const effectiveRole: Role | null = globalOwnerWins ? "global_owner" : role ?? (autoCurrentRole && isCurrentUser && currentRoles.data?.isAdmin ? "global_admin" : autoCurrentRole && isCurrentUser && currentRoles.data?.isModerator ? "moderator" : autoCurrentRole && isCurrentUser && premium.data ? "vip" : null);
  const showCompactRoleBadge = size !== "sm" || effectiveRole === "global_owner";
  const isMember = showCompactRoleBadge && (showMemberBadge || status === "online" || isCurrentUser) && !effectiveRole;
  const design = effectiveRole ? ROLE_DESIGN[effectiveRole] : null;
  const Icon = effectiveRole ? icons[effectiveRole] : null;

  return <div className={cn("relative shrink-0", showCompactRoleBadge && "pt-2", className)}>
    <Avatar className={cn(sizes[size], "ring-2 ring-border", effectiveRole === "global_owner" && "ring-amber-300 shadow-[0_0_30px_rgba(251,191,36,.8)]", effectiveRole === "global_admin" && "ring-rose-500 shadow-[0_0_24px_rgba(244,63,94,.65)]", effectiveRole === "owner" && "ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,.5)]", effectiveRole === "admin" && "ring-rose-400 shadow-[0_0_20px_rgba(251,113,133,.5)]", effectiveRole === "moderator" && "ring-sky-400 shadow-[0_0_16px_rgba(56,189,248,.4)]", effectiveRole === "vip" && "ring-fuchsia-400 shadow-[0_0_14px_rgba(232,121,249,.42)]", effectiveRole === "speaker" && "ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.4)]", isMember && "ring-slate-400/70")}>
      {src ? <AvatarImage src={src} alt={name ?? ""} /> : null}
      <AvatarFallback className="font-display text-xs">{(name ?? "?").trim().slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
    {status ? <span aria-label={status} className={cn("absolute bottom-1 -end-0.5 size-3 rounded-full border-2 border-background", status === "online" ? "bg-success" : "bg-muted-foreground")} /> : null}
    {showCompactRoleBadge && design && Icon ? <span className={cn("absolute top-0 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[8px] font-black leading-none shadow-sm transition-all duration-300", effectiveRole === "global_owner" && "border-amber-200 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 text-amber-950 shadow-[0_0_18px_rgba(251,191,36,.7)]", effectiveRole === "global_admin" && "border-rose-200 bg-gradient-to-r from-rose-600 via-pink-500 to-rose-600 text-white shadow-[0_0_14px_rgba(244,63,94,.55)]", effectiveRole === "owner" && "border-amber-200/80 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 shadow-[0_0_12px_rgba(251,191,36,.45)]", effectiveRole === "admin" && "border-rose-200/80 bg-gradient-to-r from-rose-500 via-pink-400 to-rose-500 text-white shadow-[0_0_12px_rgba(251,113,133,.45)]", effectiveRole === "moderator" && "border-sky-200/70 bg-gradient-to-r from-sky-600 to-cyan-500 text-white", effectiveRole === "vip" && "border-fuchsia-400/50 bg-fuchsia-400 text-fuchsia-950", effectiveRole === "speaker" && "border-emerald-400/50 bg-emerald-500 text-white")}><Icon className="me-0.5 inline size-2.5" />{design.label}</span> : null}
    {effectiveRole === "global_owner" ? <span className="absolute -start-1 top-0 text-[12px]" aria-hidden="true">👑👑</span> : null}
    {effectiveRole === "global_owner" ? <Crown className="absolute -end-1 -top-1 size-3.5 text-yellow-200 drop-shadow-[0_0_7px_rgba(251,191,36,.95)]" /> : null}
    {effectiveRole === "global_admin" ? <Gem className="absolute -end-1 -top-1 size-3 text-rose-300" /> : null}
    {effectiveRole === "owner" ? <Crown className="absolute -end-1 -top-1 size-3 text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,.9)]" /> : null}
    {effectiveRole === "admin" ? <Crown className="absolute -end-1 -top-1 size-3 text-rose-300 drop-shadow-[0_0_5px_rgba(251,113,133,.8)]" /> : null}
    {effectiveRole === "vip" ? <Sparkles className="absolute -end-1 top-0 size-3 text-fuchsia-300" /> : null}
    {effectiveRole === "speaker" ? <span className="absolute bottom-0 -start-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-white"><Mic2 className="size-2.5" /></span> : null}
  </div>;
}
