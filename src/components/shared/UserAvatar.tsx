import { Crown, Mic2, Shield, ShieldCheck, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { myRolesQuery } from "@/services/roles.service";
import { looseDb } from "@/integrations/supabase/loose-db";

type Role = "admin" | "moderator" | "vip" | "speaker";
type Props = { name?: string | null; src?: string | null; size?: "sm" | "md" | "lg"; status?: string | null | undefined; role?: Role | null; className?: string; showMemberBadge?: boolean; autoCurrentRole?: boolean };
const sizes = { sm: "size-8", md: "size-10", lg: "size-16" };
const labels = { admin: "ADMIN", moderator: "MOD", vip: "VIP", speaker: "MIC" } as const;

export function UserAvatar({ name, src, size = "md", status, role, className, showMemberBadge = false, autoCurrentRole = true }: Props) {
  const { user } = useAuth();
  const currentRoles = useQuery({ ...myRolesQuery(user?.id), enabled: autoCurrentRole && Boolean(user?.id) });
  const premium = useQuery({
    queryKey: ["avatar-premium", user?.id],
    enabled: autoCurrentRole && Boolean(user?.id),
    staleTime: 60000,
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await looseDb.from("premium_subscriptions").select("status,expires_at").eq("user_id", user.id).eq("status", "active").limit(1);
      const row = (data as any[] | null)?.[0];
      return Boolean(row && (!row.expires_at || new Date(row.expires_at).getTime() > Date.now()));
    },
  });
  const isCurrentUser = Boolean(autoCurrentRole && user?.id && name && (name === user.email?.split("@")[0]));
  const effectiveRole: Role | null = role ?? (isCurrentUser && currentRoles.data?.isAdmin ? "admin" : isCurrentUser && currentRoles.data?.isModerator ? "moderator" : isCurrentUser && premium.data ? "vip" : null);
  const showCompactRoleBadge = size !== "sm";
  const isMember = showCompactRoleBadge && (showMemberBadge || status === "online" || isCurrentUser) && !effectiveRole;
  const Icon = effectiveRole === "admin" ? ShieldCheck : effectiveRole === "moderator" ? Shield : effectiveRole === "vip" ? Crown : Mic2;

  return <div className={cn("relative shrink-0", showCompactRoleBadge && "pt-2", className)}>
    <Avatar className={cn(sizes[size], "ring-2 ring-border", effectiveRole === "admin" && "ring-sky-400 shadow-[0_0_20px_rgba(56,189,233,.5)]", effectiveRole === "moderator" && "ring-blue-400 shadow-[0_0_16px_rgba(96,165,250,.4)]", effectiveRole === "vip" && "ring-fuchsia-400 shadow-[0_0_14px_rgba(232,121,249,.42)]", effectiveRole === "speaker" && "ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.4)]", isMember && "ring-slate-400/70")}>
      {src ? <AvatarImage src={src} alt={name ?? ""} /> : null}
      <AvatarFallback className="font-display text-xs">{(name ?? "?").trim().slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
    {status ? <span aria-label={status} className={cn("absolute bottom-1 -end-0.5 size-3 rounded-full border-2 border-background", status === "online" ? "bg-success" : "bg-muted-foreground")} /> : null}
    {showCompactRoleBadge && effectiveRole ? <span className={cn("absolute top-0 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[8px] font-black leading-none shadow-sm transition-all duration-300", effectiveRole === "admin" && "border-sky-200/80 bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500 text-white shadow-[0_0_12px_rgba(34,211,238,.45)]", effectiveRole === "moderator" && "border-blue-200/70 bg-gradient-to-r from-blue-600 to-indigo-500 text-white", effectiveRole === "vip" && "border-fuchsia-400/50 bg-fuchsia-400 text-fuchsia-950", effectiveRole === "speaker" && "border-emerald-400/50 bg-emerald-500 text-white")}><Icon className="me-0.5 inline size-2.5" />{labels[effectiveRole]}</span> : null}
    {effectiveRole === "admin" ? <span className="absolute -start-1 top-0 text-[11px]" aria-hidden="true">👑</span> : null}
    {effectiveRole === "admin" ? <Crown className="absolute -end-1 -top-1 size-3 text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,.8)]" /> : null}
    {effectiveRole === "vip" ? <Sparkles className="absolute -end-1 top-0 size-3 text-fuchsia-300" /> : null}
    {effectiveRole === "speaker" ? <span className="absolute bottom-0 -start-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-white"><Mic2 className="size-2.5" /></span> : null}
  </div>;
}
