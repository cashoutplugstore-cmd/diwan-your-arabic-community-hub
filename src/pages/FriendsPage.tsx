import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, UserPlus, UserX, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/Loaders";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import {
  friendshipsQuery,
  removeFriendship,
  respondToRequest,
  type FriendshipWithProfile,
} from "@/services/friends.service";

export function FriendsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const friendships = useQuery(friendshipsQuery(user?.id));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["friendships", user?.id] });

  const accept = useMutation({
    mutationFn: (id: string) => respondToRequest(id, "accepted"),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeFriendship(id),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = friendships.data ?? [];
  const accepted = rows.filter((r) => r.status === "accepted");
  const incoming = rows.filter((r) => r.status === "pending" && r.addressee_id === user?.id);
  const outgoing = rows.filter((r) => r.status === "pending" && r.requester_id === user?.id);

  function Row({ item, actions }: { item: FriendshipWithProfile; actions?: React.ReactNode }) {
    return (
      <li className="glass flex items-center gap-3 rounded-2xl p-4">
        <UserAvatar
          name={item.other?.display_name || item.other?.username}
          src={item.other?.avatar_url}
          status={item.other?.status}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {item.other?.display_name || item.other?.username || "—"}
          </p>
          <p className="truncate text-xs text-muted-foreground" dir="ltr">
            @{item.other?.username}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">{actions}</div>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t.nav.friends} description={t.tagline} />

      {friendships.isLoading ? (
        <ListSkeleton />
      ) : (
        <Tabs defaultValue="friends">
          <TabsList>
            <TabsTrigger value="friends">
              {t.nav.friends} <Badge variant="secondary">{accepted.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="incoming">
              <UserPlus className="size-4" /> {incoming.length}
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              <Users className="size-4" /> {outgoing.length}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4">
            {accepted.length === 0 ? (
              <EmptyState icon={Users} title={t.common.empty} description={t.home.heroSubtitle} />
            ) : (
              <ul className="space-y-2">
                {accepted.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    actions={
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate(item.id)}>
                        <UserX className="size-4" />
                      </Button>
                    }
                  />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="incoming" className="mt-4">
            {incoming.length === 0 ? (
              <EmptyState icon={UserPlus} title={t.common.empty} />
            ) : (
              <ul className="space-y-2">
                {incoming.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    actions={
                      <>
                        <Button size="icon" onClick={() => accept.mutate(item.id)}>
                          <Check className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove.mutate(item.id)}>
                          <UserX className="size-4" />
                        </Button>
                      </>
                    }
                  />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="mt-4">
            {outgoing.length === 0 ? (
              <EmptyState icon={Users} title={t.common.empty} />
            ) : (
              <ul className="space-y-2">
                {outgoing.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    actions={
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate(item.id)}>
                        <UserX className="size-4" />
                      </Button>
                    }
                  />
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}