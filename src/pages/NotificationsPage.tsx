import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/Loaders";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { markNotificationRead, notificationsQuery } from "@/services/notifications.service";
import { supabase } from "@/integrations/supabase/client";

export function NotificationsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const notifications = useQuery(notificationsQuery(user?.id));

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t.nav.notifications} />
      {notifications.isLoading ? (
        <ListSkeleton rows={4} />
      ) : (notifications.data ?? []).length === 0 ? (
        <EmptyState icon={Bell} title={t.common.empty} description={t.tagline} />
      ) : (
        <ul className="space-y-2">
          {(notifications.data ?? []).map((item) => (
            <li key={item.id} className="glass flex items-center gap-3 rounded-2xl p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <Bell className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.title}</p>
                <p className="truncate text-sm text-muted-foreground">{item.body ?? "—"}</p>
              </div>
              {!item.is_read ? (
                <Button size="sm" variant="ghost" onClick={() => markRead.mutate(item.id)} disabled={markRead.isPending}>
                  ✓
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}