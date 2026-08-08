import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { useI18n } from "@/contexts/i18n-context";
import { useTheme } from "@/contexts/theme-context";
import { useSounds } from "@/contexts/sound-context";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { blockedProfilesQuery, unblockUser } from "@/services/moderation.service";

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { settings, setSetting } = useSounds();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const blocked = useQuery(blockedProfilesQuery(user?.id));
  const unblock = useMutation({
    mutationFn: (id: string) => unblockUser(user!.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_blocks"] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t.nav.settings} description={t.tagline} />

      <GlassCard className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="theme-switch">
            {t.common.theme} — {theme === "dark" ? t.common.dark : t.common.light}
          </Label>
          <Switch id="theme-switch" checked={theme === "dark"} onCheckedChange={toggleTheme} />
        </div>

        <div className="flex items-center justify-between gap-4 border-t pt-5">
          <Label>{t.common.language}</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={locale === "ar" ? "default" : "outline"}
              onClick={() => setLocale("ar")}
            >
              العربية
            </Button>
            <Button
              size="sm"
              variant={locale === "en" ? "default" : "outline"}
              onClick={() => setLocale("en")}
            >
              English
            </Button>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="space-y-5">
        <div>
          <h2 className="font-display text-lg font-bold">{t.sounds.title}</h2>
          <p className="text-sm text-muted-foreground">{t.sounds.description}</p>
        </div>
        {([
          ["master", t.sounds.master],
          ["message", t.sounds.message],
          ["notification", t.sounds.notification],
          ["mention", t.sounds.mention],
        ] as const).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-4 border-t pt-4 first:border-0 first:pt-0">
            <Label htmlFor={`sound-${key}`}>{label}</Label>
            <Switch
              id={`sound-${key}`}
              checked={settings[key]}
              disabled={key !== "master" && !settings.master}
              onCheckedChange={(value) => setSetting(key, value)}
            />
          </div>
        ))}
      </GlassCard>

      <GlassCard className="space-y-4">
        <h2 className="font-display text-lg font-bold">{t.moderation.blockedUsers}</h2>
        {(blocked.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.common.empty}</p>
        ) : (
          <ul className="space-y-2">
            {(blocked.data ?? []).map((profile) => (
              <li key={profile.id} className="flex items-center gap-3 rounded-xl border p-2">
                <UserAvatar name={profile.display_name || profile.username} src={profile.avatar_url} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {profile.display_name || profile.username}
                </span>
                <Button size="sm" variant="outline" onClick={() => unblock.mutate(profile.id)}>
                  {t.moderation.unblock}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}