import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Flag,
  Gavel,
  MessageSquare,
  Shield,
  ShieldCheck,
  Users,
  Crown,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/GlassCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/Loaders";
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
  const isAdmin = roles.data?.isAdmin === true;
  const isModerator = roles.data?.isModerator === true;
  const isStaff = isAdmin || isModerator;
  const rooms = useQuery({ ...roomsWithStatsQuery(), enabled: isStaff });
  const reports = useQuery(reportsQuery(isStaff));

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "resolved" | "dismissed" }) =>
      updateReportStatus(id, status),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === "resolved" ? t.moderation.resolved : t.moderation.dismissed,
      );
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (roles.isLoading) return <ListSkeleton rows={4} />;
  if (!isStaff)
    return (
      <EmptyState
        icon={Shield}
        title={t.nav.admin}
        description="هذه الصفحة مخصصة للإدارة والمشرفين فقط."
      />
    );

  const open = (reports.data ?? []).filter((report) => report.status === "open");
  const totalMembers = (rooms.data ?? []).reduce((sum, room) => sum + room.member_count, 0);

  return (
    <div className="space-y-6 pb-8">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-background p-6 shadow-xl">
        <div className="absolute -left-10 -top-10 size-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                <ShieldCheck className="size-6" />
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary">
                {isAdmin ? "ADMIN" : "MODERATOR"}
              </Badge>
            </div>
            <h1 className="font-display text-2xl font-black sm:text-3xl">مركز إدارة ديوان</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              إدارة المجتمع، البلاغات، الغرف وسلامة الأعضاء من مكان واحد.
            </p>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Settings2 className="size-4" /> صلاحيات الإدارة مفعّلة
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard>
          <MessageSquare className="size-5 text-primary" />
          <p className="mt-3 text-3xl font-black">{rooms.data?.length ?? 0}</p>
          <p className="text-sm text-muted-foreground">الغرف</p>
        </GlassCard>
        <GlassCard>
          <Users className="size-5 text-primary" />
          <p className="mt-3 text-3xl font-black">{totalMembers}</p>
          <p className="text-sm text-muted-foreground">الأعضاء داخل الغرف</p>
        </GlassCard>
        <GlassCard>
          <Flag className="size-5 text-primary" />
          <p className="mt-3 text-3xl font-black">{open.length}</p>
          <p className="text-sm text-muted-foreground">البلاغات المفتوحة</p>
        </GlassCard>
        <GlassCard>
          <BarChart3 className="size-5 text-primary" />
          <p className="mt-3 text-3xl font-black">{isAdmin ? "كامل" : "محدود"}</p>
          <p className="text-sm text-muted-foreground">مستوى الصلاحية</p>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard>
          <div className="flex items-center gap-3">
            <Gavel className="size-5 text-primary" />
            <div>
              <p className="font-bold">أدوات الإشراف</p>
              <p className="text-xs text-muted-foreground">
                حظر وكتم الأعضاء المسيئين من داخل الغرف.
              </p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-3">
            <Crown className="size-5 text-primary" />
            <div>
              <p className="font-bold">VIP</p>
              <p className="text-xs text-muted-foreground">الاشتراكات منفصلة عن صلاحيات الإدارة.</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-primary" />
            <div>
              <p className="font-bold">سلامة المجتمع</p>
              <p className="text-xs text-muted-foreground">راجع البلاغات واتخذ الإجراء المناسب.</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">البلاغات</h2>
          <Badge>{open.length} مفتوح</Badge>
        </div>
        {reports.isLoading ? (
          <ListSkeleton rows={3} />
        ) : (reports.data ?? []).length === 0 ? (
          <EmptyState icon={Flag} title={t.moderation.noReports} />
        ) : (
          <ul className="space-y-2">
            {(reports.data ?? []).map((report) => (
              <li
                key={report.id}
                className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{report.reason}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {report.details ?? "—"} · {relativeTime(report.created_at, locale)}
                  </p>
                </div>
                <Badge variant={report.status === "open" ? "default" : "secondary"}>
                  {report.status}
                </Badge>
                {report.status === "open" && (
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
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
