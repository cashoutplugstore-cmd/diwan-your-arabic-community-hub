import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, MessagesSquare, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/GlassCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/Loaders";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { relativeTime } from "@/lib/time";
import { myRolesQuery } from "@/services/roles.service";
import { reportsQuery, updateReportStatus } from "@/services/moderation.service";
import { roomsWithStatsQuery } from "@/services/rooms.service";

export function AdminPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const roles = useQuery(myRolesQuery(user?.id));
  const isStaff = roles.data?.isStaff === true;
  const rooms = useQuery({ ...roomsWithStatsQuery(), enabled: isStaff });
  const reports = useQuery(reportsQuery(isStaff));

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "resolved" | "dismissed" }) =>
      updateReportStatus(id, status),
    onSuccess: (_data, variables) => {
      toast.success(variables.status === "resolved" ? t.moderation.resolved : t.moderation.dismissed);
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (roles.isLoading) return <ListSkeleton rows={3} />;
  if (!isStaff) {
    return <EmptyState icon={ShieldAlert} title={t.nav.admin} description={t.common.error} />;
  }

  const open = (reports.data ?? []).filter((report) => report.status === "open");
  const totalMembers = (rooms.data ?? []).reduce((sum, room) => sum + room.member_count, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t.moderation.dashboard} description={t.tagline} />
      <div className="grid gap-4 sm:grid-cols-3">
        <GlassCard>
          <MessagesSquare className="size-5 text-primary" aria-hidden />
          <p className="mt-3 font-display text-3xl font-black">{rooms.data?.length ?? 0}</p>
          <p className="text-sm text-muted-foreground">{t.nav.rooms}</p>
        </GlassCard>
        <GlassCard>
          <Users className="size-5 text-primary" aria-hidden />
          <p className="mt-3 font-display text-3xl font-black">{totalMembers}</p>
          <p className="text-sm text-muted-foreground">{t.communities.members}</p>
        </GlassCard>
        <GlassCard>
          <Flag className="size-5 text-primary" aria-hidden />
          <p className="mt-3 font-display text-3xl font-black">{open.length}</p>
          <p className="text-sm text-muted-foreground">{t.moderation.openReports}</p>
        </GlassCard>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">{t.moderation.openReports}</h2>
        {reports.isLoading ? (
          <ListSkeleton rows={3} />
        ) : (reports.data ?? []).length === 0 ? (
          <EmptyState icon={Flag} title={t.moderation.noReports} />
        ) : (
          <ul className="space-y-2">
            {(reports.data ?? []).map((report) => (
              <li key={report.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{report.reason}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {report.details ?? "—"} · {relativeTime(report.created_at, locale)}
                  </p>
                </div>
                <Badge variant={report.status === "open" ? "default" : "secondary"}>
                  {report.status}
                </Badge>
                {report.status === "open" ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setStatus.mutate({ id: report.id, status: "resolved" })}
                    >
                      {t.moderation.resolve}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus.mutate({ id: report.id, status: "dismissed" })}
                    >
                      {t.moderation.dismiss}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
