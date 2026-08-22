import { X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MembersPanel } from "./MembersPanel";
import type { PresenceActivity, PresenceEntry } from "@/hooks/use-presence";
import type { Profile } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  members: Profile[];
  presence: PresenceEntry[];
  activity?: PresenceActivity[];
  roomId?: string;
};

export function MemberDrawer({ open, onClose, ...props }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="أعضاء الغرفة">
      <button className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-label="إغلاق الأعضاء" onClick={onClose} />
      <aside className="absolute inset-y-0 end-0 flex w-[min(88vw,360px)] flex-col border-s bg-background shadow-2xl">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
          <Users className="size-4 text-primary" />
          <span className="font-display text-sm font-bold">الأعضاء</span>
          <Button variant="ghost" size="icon" className="ms-auto size-9" onClick={onClose} aria-label="إغلاق">
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <MembersPanel {...props} />
        </div>
      </aside>
    </div>
  );
}
