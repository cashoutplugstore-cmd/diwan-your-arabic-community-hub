import { useQuery } from "@tanstack/react-query";
import { MessagesSquare, ShieldAlert, Users } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/Loaders";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { isAdminQuery } from "@/services/profiles.service";
import { roomsQuery } from "@/services/rooms.service";

export function AdminPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = useQuery(isAdminQuery(user?.id));
  const rooms = useQuery({ ...roomsQuery(), enabled: isAdmin.data === true });

  if (isAdmin.isLoading) return <ListSkeleton rows={3} />;

  if (!isAdmin.data) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t.nav.admin}
        description={t.common.error}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t.nav.admin} description={t.tagline} />
      <div className="grid gap-4 sm:grid-cols-2">
        <GlassCard>
          <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
            <MessagesSquare className="size-5" aria-hidden />
          </span>
          <p className="mt-3 font-display text-3xl font-black">{rooms.data?.length ?? 0}</p>
          <p className="text-sm text-muted-foreground">{t.nav.rooms}</p>
        </GlassCard>
        <GlassCard>
          <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
            <Users className="size-5" aria-hidden />
          </span>
          <p className="mt-3 font-display text-3xl font-black">
            {rooms.data?.filter((room) => room.is_private).length ?? 0}
          </p>
          <p className="text-sm text-muted-foreground">{t.nav.settings}</p>
        </GlassCard>
      </div>
    </div>
  );
}