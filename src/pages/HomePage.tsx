import { Link } from "@tanstack/react-router";
import { ArrowLeft, Mic, MessagesSquare, Shield, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/GlassCard";
import { MarketingLayout } from "@/layouts/MarketingLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { CommunityBrowser } from "@/components/communities/CommunityBrowser";
import { PageHeader } from "@/components/shared/PageHeader";
import { useI18n } from "@/contexts/i18n-context";
import { useAuth } from "@/contexts/auth-context";

const featureIcons = [MessagesSquare, Users, Shield, Mic];

export function HomePage() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <PageHeader title={t.homeDash.welcome} description={t.homeDash.subtitle} />
          <CommunityBrowser />
        </div>
      </AppLayout>
    );
  }

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            {t.tagline}
          </span>
          <h1 className="mt-6 font-display text-4xl font-black leading-tight sm:text-6xl">
            <span className="gradient-text">{t.home.heroTitle}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t.home.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild className="shadow-glow">
              <Link to={isAuthenticated ? "/rooms" : "/register"}>
                {t.home.cta}
                <ArrowLeft className="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/rooms">{t.home.ctaSecondary}</Link>
            </Button>
          </div>
        </div>

        <div className="mt-20">
          <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
            {t.home.featuresTitle}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.home.features.map((feature, index) => {
              const Icon = featureIcons[index] ?? Sparkles;
              return (
                <GlassCard key={feature.title}>
                  <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.desc}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}