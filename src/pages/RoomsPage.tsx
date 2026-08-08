import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { CommunityBrowser } from "@/components/communities/CommunityBrowser";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { createRoom } from "@/services/rooms.service";

export function RoomsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const create = useMutation({
    mutationFn: () => createRoom({ name, description, isPrivate, ownerId: user!.id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["room_members"] });
      setOpen(false);
      setName("");
      setDescription("");
      setIsPrivate(false);
      toast.success(t.common.create);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.communities.title}
        description={t.communities.subtitle}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="min-h-11">
                <Plus className="size-4" aria-hidden /> {t.common.create}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.common.create}</DialogTitle>
                <DialogDescription>{t.communities.subtitle}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name">{t.nav.rooms}</Label>
                  <Input id="room-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-desc">{t.moderation.details}</Label>
                  <Textarea
                    id="room-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <Label htmlFor="room-private" className="flex items-center gap-2">
                    <Lock className="size-4" aria-hidden /> {t.nav.settings}
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
      <CommunityBrowser />
    </div>
  );
}
