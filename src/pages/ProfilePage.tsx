import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import { ListSkeleton } from "@/components/shared/Loaders";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { profileQuery, updateProfile } from "@/services/profiles.service";
import { ProfileIdentityCard } from "@/components/profile/ProfileIdentityCard";

const STATUS_OPTIONS = ["متاح الآن 🟢", "مشغول 🔴", "على المايك 🎙️", "بعيد شوي 🟡"];

export function ProfilePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const profile = useQuery(profileQuery(user?.id));

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [status, setStatus] = useState("متاح الآن 🟢");

  useEffect(() => {
    if (profile.data) {
      setDisplayName(profile.data.display_name ?? "");
      setBio(profile.data.bio ?? "");
      setAvatarUrl(profile.data.avatar_url ?? "");
    }
    if (typeof window !== "undefined" && user?.id) {
      setStatus(localStorage.getItem(`diwan-status:${user.id}`) ?? "متاح الآن 🟢");
    }
  }, [profile.data, user?.id]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile(user!.id, {
        display_name: displayName,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      }),
    onSuccess: () => {
      if (user?.id) localStorage.setItem(`diwan-status:${user.id}`, status);
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success(t.common.save);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (profile.isLoading) return <ListSkeleton rows={3} />;

  return (
    <div className="space-y-6">
      <PageHeader title={t.nav.profile} description={profile.data?.username ?? ""} />

      <ProfileIdentityCard
        name={displayName || profile.data?.username || "عضو ديوان"}
        username={profile.data?.username}
        avatarUrl={avatarUrl}
        bio={bio}
        status={status}
      />

      <div className="glass-strong space-y-5 rounded-3xl p-6">
        <div className="space-y-2">
          <Label htmlFor="display-name">{t.auth.displayName}</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="avatar">Avatar URL</Label>
          <Input
            id="avatar"
            dir="ltr"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">الحالة</Label>
          <select
            id="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 w-full rounded-md border border-white/10 bg-background/50 px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(event) => setBio(event.target.value)} />
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending || !user}>
          {save.isPending ? t.common.loading : t.common.save}
        </Button>
      </div>
    </div>
  );
}
