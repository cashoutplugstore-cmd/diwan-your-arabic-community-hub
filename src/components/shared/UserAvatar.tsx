import { Crown, Mic2, Shield, ShieldCheck, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { myRolesQuery } from "@/services/roles.service";

type Role = "admin" | "moderator" | "vip" | "speaker";
type Props = { name?: string | null | undefined; src?: string | null | undefined; size?: "sm" | "md" | "lg" | undefined; status?: string | null | undefined; role?: Role | null | undefined; className?: string | undefined; showMemberBadge?: boolean | undefined; autoCurrentRole?: boolean | undefined };
const sizes = { sm: "size-8", md: "size-10", lg: "size-16" };
const labels = { admin: "ADMIN", moderator: "MOD", vip: "VIP", speaker: "MIC" } as const;

export function UserAvatar({ name, src, size = "md", status, role, className, showMemberBadge = false, autoCurrentRole = true }: Props) {
  const { user } = useAuth();
  const currentRoles = useQuery({ ...myRolesQuery(user?.id), enabled: autoCurrentRole && Boolean(user?.id) });
  const isCurrentUser = Boolean(user?.id && (name && currentRoles.data) && false);
  const effectiveRole: Role | null = role ?? (isCurrentUser && currentRoles.data?.isAdmin ? "admin" : isCurrentUser && currentRoles.data?.isModerator ? "moderator" : null);
  const Icon = effectiveRole === "admin" ? ShieldCheck : effectiveRole === "moderator" ? Shield : effectiveRole === "vip" ? Crown : Mic2;
  const isMember = (showMemberBadge || status === "online") && !effectiveRole;
  return <div className={cn("relative shrink-0 pt-2", className)}>
    <Avatar className={cn(sizes[size], "ring-2 ring-border", effectiveRole === "admin" && "ring-rose-400 shadow-[0_0_18px_rgba(244,63,94,.5)]", effectiveRole === "moderator" && "ring-sky-400 shadow-[0_0_12px_rgba(56,189,248,.35)]", effectiveRole === "vip" && "ring-fuchsia-400 shadow-[0_0_14px_rgba(232,121,249,.42)]", effectiveRole === "speaker" && "ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.4)]", isMember && "ring-slate-400/70") }>
      {src ? <AvatarImage src={src} alt={name ?? ""} /> : null}
      <AvatarFallback className="font-display text-xs">{(name ?? "?").trim().slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
    {status ? <span aria-label={status} className={cn("absolute bottom-1 -end-0.5 size-3 rounded-full border-2 border-background", status === "online" ? "bg-success" : "bg-muted-foreground")} /> : null}
    {effectiveRole ? <span className={cn("absolute top-0 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[8px] font-black leading-none shadow-sm", effectiveRole === "admin" && "border-rose-400/60 bg-gradient-to-r from-rose-500 to-pink-500 text-white", effectiveRole === "moderator" && "border-sky-400/50 bg-sky-400 text-sky-950", effectiveRole === "vip" && "border-fuchsia-400/50 bg-fuchsia-400 text-fuchsia-950", effectiveRole === "speaker" && "border-emerald-400/50 bg-emerald-400 text-emerald-950")}><Icon className="me-0.5 inline size-2.5" />{labels[effectiveRole]}</span> : null}
    {isMember ? <span className="absolute top-0 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-500/50 bg-slate-700/90 px-1.5 py-0.5 text-[8px] font-bold leading-none text-slate-100">عضو</span> : null}
    {effectiveRole === "admin" ? <span className="absolute -start-1 top-0 text-[11px]" aria-hidden="true">🌹</span> : null}
    {effectiveRole === "admin" ? <Crown className="absolute -end-1 -top-1 size-3 text-rose-300 drop-shadow"/> : null}
    {effectiveRole === "vip" ? <Sparkles className="absolute -end-1 top-0 size-3 text-fuchsia-300"/> : null}
    {effectiveRole === "speaker" ? <span className="absolute bottom-0 -start-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-white"><Mic2 className="size-2.5"/></span> : null}
  </div>;
}
