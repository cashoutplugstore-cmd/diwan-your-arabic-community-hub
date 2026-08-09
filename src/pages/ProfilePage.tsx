import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import { ListSkeleton } from "@/components/shared/Loaders";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery, updateProfile } from "@/services/profiles.service";

export function ProfilePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const profile = useQuery(profileQuery(user?.id));
  const identity = useQuery({
    queryKey: ["profile-identity", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [{ data: roles }, { data: vip }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
        supabase.from("premium_subscriptions").select("status,expires_at").eq("user_id", user!.id).eq("status", "active").maybeSingle(),
      ]);
      const role = roles?.some((r) => r.role === "admin") ? "admin" : roles?.some((r) => r.role === "moderator") ? "moderator" : null;
      const isVip = Boolean(vip && (!vip.expires_at || new Date(vip.expires_at).getTime() > Date.now()));
      return { role, isVip };
    },
    staleTime: 30_000,
  });

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (profile.data) { setDisplayName(profile.data.display_name ?? ""); setBio(profile.data.bio ?? ""); setAvatarUrl(profile.data.avatar_url ?? ""); }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => updateProfile(user!.id, { display_name: displayName, bio: bio || null, avatar_url: avatarUrl || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile", user?.id] }); toast.success(t.common.save); },
    onError: (error: Error) => toast.error(error.message),
  });

  if (profile.isLoading) return <ListSkeleton rows={3} />;
  const role = identity.data?.role;
  const avatarRole = role === "admin" ? "admin" : role === "moderator" ? "moderator" : identity.data?.isVip ? "vip" : null;

  return (
    <div className="space-y-6">
      <PageHeader title={t.nav.profile} description={profile.data?.username ?? ""} />
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 shadow-xl">
        {identity.data?.isVip ? <Sparkles className="absolute end-5 top-5 size-8 animate-pulse text-fuchsia-300" /> : null}
        <div className="flex items-center gap-4">
          <UserAvatar name={displayName || profile.data?.username} src={avatarUrl} size="lg" role={avatarRole} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={"truncate font-display text-lg font-bold " + (avatarRole === "vip" ? "text-fuchsia-300" : avatarRole === "admin" ? "text-amber-300" : avatarRole === "moderator" ? "text-sky-300" : "")}>{displayName || profile.data?.username}</p>
              {role === "admin" ? <Badge className="gap-1 border-amber-400/30 bg-amber-400/15 text-amber-300"><ShieldCheck className="size-3" /> ADMIN</Badge> : null}
              {role === "moderator" ? <Badge className="gap-1 border-sky-400/30 bg-sky-400/15 text-sky-300"><ShieldCheck className="size-3" /> MODERATOR</Badge> : null}
              {identity.data?.isVip ? <Badge className="gap-1 border-fuchsia-400/30 bg-fuchsia-400/15 text-fuchsia-300"><Crown className="size-3" /> VIP</Badge> : null}
            </div>
            <p className="truncate text-sm text-muted-foreground" dir="ltr">@{profile.data?.username}</p>
            <p className="mt-2 text-xs text-muted-foreground">{role === "admin" ? "إدارة ديوان" : role === "moderator" ? "فريق الإشراف" : identity.data?.isVip ? "عضوية VIP مفعّلة" : "عضو في ديوان"}</p>
          </div>
        </div>
      </div>

      <div className="glass-strong space-y-5 rounded-3xl p-6">
        <div className="space-y-2"><Label htmlFor="display-name">{t.auth.displayName}</Label><Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="avatar">Avatar URL</Label><Input id="avatar" dir="ltr" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="bio">Bio</Label><Textarea id="bio" value={bio} onChange={(event) => setBio(event.target.value)} /></div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !user}>{save.isPending ? t.common.loading : t.common.save}</Button>
      </div>
    </div>
  );
}
