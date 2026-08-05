import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Compass, Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GlassCard } from "@/components/shared/GlassCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardGridSkeleton } from "@/components/shared/Loaders";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { createRoom, joinRoom, myMembershipsQuery, roomsQuery } from "@/services/rooms.service";

export function RoomsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const rooms = useQuery(roomsQuery());
  const memberships = useQuery(myMembershipsQuery(user?.id));
  const memberRoomIds = new Set((memberships.data ?? []).map((m) => m.room_id));

  const create = useMutation({
    mutationFn: () => createRoom({ name, description, isPrivate, ownerId: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room_members"] });
      setOpen(false);
      setName("");
      setDescription("");
      setIsPrivate(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const join = useMutation({
    mutationFn: (roomId: string) => joinRoom(roomId, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["room_members"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.nav.rooms}
        description={t.tagline}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> {t.common.create}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.common.create}</DialogTitle>
                <DialogDescription>{t.tagline}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name">{t.nav.rooms}</Label>
                  <Input
                    id="room-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-desc">{t.common.searchPlaceholder}</Label>
                  <Textarea
                    id="room-desc"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <Label htmlFor="room-private" className="flex items-center gap-2">
                    <Lock className="size-4" /> {t.nav.settings}
                  </Label>
                  <Switch id="room-private" checked={isPrivate} onCheckedChange={setIsPrivate} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => create.mutate()}
                  disabled={!name.trim() || create.isPending || !user}
                >
                  {create.isPending ? t.common.loading : t.common.create}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {rooms.isLoading ? (
        <CardGridSkeleton />
      ) : (rooms.data ?? []).length === 0 ? (
        <EmptyState icon={Compass} title={t.common.empty} description={t.home.heroSubtitle} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(rooms.data ?? []).map((room) => (
            <GlassCard key={room.id} className="flex flex-col gap-3">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <h2 className="truncate font-display text-lg font-bold">{room.name}</h2>
                {room.is_private ? (
                  <Badge variant="secondary" className="shrink-0">
                    <Lock className="size-3" />
                  </Badge>
                ) : null}
              </div>
              <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                {room.description ?? "—"}
              </p>
              <div className="flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link to="/chat/$slug" params={{ slug: room.slug }}>
                    {t.nav.chat}
                  </Link>
                </Button>
                {!memberRoomIds.has(room.id) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => join.mutate(room.id)}
                    disabled={!user || join.isPending}
                  >
                    {t.common.join}
                  </Button>
                ) : null}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}