import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { useI18n } from "@/contexts/i18n-context";
import { useTheme } from "@/contexts/theme-context";

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();

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
    </div>
  );
}