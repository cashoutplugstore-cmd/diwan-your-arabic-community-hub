import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/Loaders";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { searchProfiles } from "@/services/profiles.service";
import { sendFriendRequest } from "@/services/friends.service";

export function SearchPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [term, setTerm] = useState("");

  const results = useQuery({
    queryKey: ["search-profiles", term],
    queryFn: () => searchProfiles(term),
    enabled: term.trim().length > 1,
  });

  const addFriend = useMutation({
    mutationFn: (targetId: string) => sendFriendRequest(user!.id, targetId),
    onSuccess: () => toast.success(t.nav.friends),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t.nav.search} />

      <div className="glass flex items-center gap-2 rounded-2xl p-2">
        <Search className="ms-2 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={t.common.searchPlaceholder}
          aria-label={t.common.searchPlaceholder}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
      </div>

      {term.trim().length < 2 ? (
        <EmptyState icon={Search} title={t.common.searchPlaceholder} />
      ) : results.isLoading ? (
        <ListSkeleton rows={4} />
      ) : (results.data ?? []).length === 0 ? (
        <EmptyState icon={Search} title={t.common.empty} />
      ) : (
        <ul className="space-y-2">
          {(results.data ?? [])
            .filter((profile) => profile.id !== user?.id)
            .map((profile) => (
              <li key={profile.id} className="glass flex items-center gap-3 rounded-2xl p-4">
                <UserAvatar
                  name={profile.display_name || profile.username}
                  src={profile.avatar_url}
                  status={profile.status}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{profile.display_name || profile.username}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    @{profile.username}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => addFriend.mutate(profile.id)}
                  disabled={!user || addFriend.isPending}
                  aria-label={t.nav.friends}
                >
                  <UserPlus className="size-4" />
                </Button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}