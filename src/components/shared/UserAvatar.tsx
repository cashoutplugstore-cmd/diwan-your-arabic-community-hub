import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Mic2, Shield, ShieldCheck, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { myRolesQuery } from "@/services/roles.service";
import { cn } from "@/lib/utils";

type Role = "admin" | "moderator" | "vip" | "speaker";
type Props = {
  name?: string | null | undefined;
  src?: string | null | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  status?: string | null | undefined;
  role?: Role | null;
  className?: string | undefined;
};

const sizes = { sm: "size-8", md: "size-10", lg: "size-16" };
const roleStyles: Record<Role, string> = {
  admin: "ring-2 ring-amber-400 shadow-[0_0_16px_rgba(251,191,36,.45)]",
  moderator: "ring-2 ring-sky-400 shadow-[0_0_14px_rgba(56,189,248,.35)]",
  vip: "ring-2 ring-fuchsia-400 shadow-[0_0_16px_rgba(232,121,249,.42)]",
  speaker: "ring-2 ring-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.4)]",
};
const roleLabel: Record<Role, string> = { admin: "ADMIN", moderator: "MOD", vip: "VIP", speaker: "MIC" };

export function UserAvatar({ name, src, size = "md", status, role, className }: Props) {
  const { user } = useAuth();
  const roles = useQuery(myRolesQuery(user?.id));
  const vip = useQuery({
    queryKey: ["avatar-vip", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase.from("premium_subscriptions").select("status,expires_at").eq("user_id", user!.id).eq("status", "active").maybeSingle();
      return Boolean(data && (!data.expires_at || new Date(data.expires_at).getTime() > Date.now()));
    },
    staleTime: 30_000,
  });
  const isCurrentUser = useMemo(() => {
    if (!user || !name) return false;
    const metadataName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "";
    const metadataUsername = typeof user.user_metadata?.username === "string" ? user.user_metadata.username : "";
    return [metadataName, metadataUsername, user.email?.split("@")[0] ?? ""].some((value) => value && value.toLowerCase() === name.toLowerCase());
  }, [user, name]);
  const effectiveRole: Role | null = role ?? (isCurrentUser
    ? (roles.data?.isAdmin ? "admin" : roles.data?.isModerator ? "moderator" : vip.data ? "vip" : null)
    : null);
  const initials = (name ?? "?").trim().slice(0, 2).toUpperCase();
  const Icon = effectiveRole === "admin" ? ShieldCheck : effectiveRole === "moderator" ? Shield : effectiveRole === "vip" ? Crown : Mic2;
  return (
    <div className={cn("relative shrink-0", className)}>
      <Avatar className={cn(sizes[size], "ring-2 ring-border transition-all duration-300", effectiveRole ? roleStyles[effectiveRole] : "")}>
        {src ? <AvatarImage src={src} alt={name ?? ""} /> : null}
        <AvatarFallback className={cn("font-display text-xs", effectiveRole === "vip" ? "bg-fuchsia-500/15 text-fuchsia-300" : effectiveRole === "admin" ? "bg-amber-500/15 text-amber-300" : effectiveRole === "moderator" ? "bg-sky-500/15 text-sky-300" : "bg-secondary text-secondary-foreground")}>
          {initials}
        </AvatarFallback>
      </Avatar>
      {status ? <span aria-label={status} className={cn("absolute -bottom-0.5 -end-0.5 size-3 rounded-full border-2 border-background", status === "online" ? "bg-success" : "bg-muted-foreground")} /> : null}
      {effectiveRole ? (
        <span className={cn("absolute -start-1 -top-2 flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[8px] font-black shadow-sm", effectiveRole === "admin" && "border-amber-400/40 bg-amber-400/15 text-amber-300", effectiveRole === "moderator" && "border-sky-400/40 bg-sky-400/15 text-sky-300", effectiveRole === "vip" && "border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-300", effectiveRole === "speaker" && "border-emerald-400/40 bg-emerald-400/15 text-emerald-300")}>
          <Icon className="size-2.5" /> {roleLabel[effectiveRole]}
        </span>
      ) : null}
      {effectiveRole === "vip" ? <Sparkles className="absolute -end-1 -top-1 size-3 animate-pulse text-fuchsia-300" /> : null}
      {effectiveRole === "speaker" ? <span className="absolute -bottom-1 -start-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-white"><Mic2 className="size-2.5" /></span> : null}
    </div>
  );
}
