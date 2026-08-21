import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Search, Shield, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ListSkeleton } from "@/components/shared/Loaders";
import {
  roomMemberRolesQuery,
  setRoomMemberRole,
  type RoomPermissions,
  type RoomRole,
} from "@/services/room-roles.service";

type Props = {
  roomId: string | undefined;
  roomName: string;
  permissions: RoomPermissions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ROLE_LABEL: Record<RoomRole, string> = {
  owner: "مالك الغرفة",
  moderator: "مشرف",
  member: "عضو",
};

const PERMISSION_MATRIX: { role: RoomRole; items: string[] }[] = [
  {
    role: "owner",
    items: ["تعديل الرتب والصلاحيات", "كتم وطرد وحظر", "حذف الرسائل", "إدارة الغرفة"],
  },
  { role: "moderator", items: ["كتم الأعضاء", "حظر وطرد من الغرفة", "حذف الرسائل"] },
  { role: "member", items: ["إرسال الرسائل", "صعود المايك", "الإبلاغ والحظر الشخصي"] },
];

/** Real room rank management backed by Supabase (room_members.role) with RLS enforcement. */
export function RoomRolesDialog({ roomId, roomName, permissions, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const members = useQuery({ ...roomMemberRolesQuery(roomId), enabled: Boolean(roomId) && open });

  const rows = useMemo(() => {
    const list = members.data ?? [];
    const q = term.trim().toLowerCase();
    const filtered = q
      ? list.filter((row) =>
          `${row.profile?.display_name ?? ""} ${row.profile?.username ?? ""}`
            .toLowerCase()
            .includes(q),
        )
      : list;
    const weight: Record<RoomRole, number> = { owner: 0, moderator: 1, member: 2 };
    return [...filtered].sort((a, b) => weight[a.role] - weight[b.role]);
  }, [members.data, term]);

  const change = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Exclude<RoomRole, "owner"> }) => {
      if (!roomId) throw new Error("الغرفة غير متاحة");
      if (!permissions.canManageRoles) throw new Error("لا تملك صلاحية تعديل الرتب");
      return setRoomMemberRole(roomId, userId, role);
    },
    onSuccess: async (_data, input) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["room-member-roles", roomId] }),
        qc.invalidateQueries({ queryKey: ["room-permissions", roomId] }),
        qc.invalidateQueries({ queryKey: ["room-role-meta", roomId] }),
      ]);
      toast.success(
        input.role === "moderator"
          ? "تم تعيين العضو مشرفاً في الغرفة ✅"
          : "تم إرجاع العضو إلى رتبة عضو",
      );
    },
    onError: (error: Error) => toast.error(error.message || "تعذر حفظ الرتبة"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[min(96vw,40rem)] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="text-start">
          <DialogTitle className="font-display text-base sm:text-lg">
            تعديل الرتب والصلاحيات · {roomName}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            اختر عضواً وغيّر رتبته داخل الغرفة. يُحفظ التغيير مباشرة.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-3">
          {PERMISSION_MATRIX.map((entry) => (
            <div key={entry.role} className="rounded-2xl border bg-secondary/30 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black">
                {entry.role === "owner" ? (
                  <Crown className="size-3.5 text-amber-300" />
                ) : entry.role === "moderator" ? (
                  <Shield className="size-3.5 text-sky-300" />
                ) : (
                  <User className="size-3.5 text-muted-foreground" />
                )}
                {ROLE_LABEL[entry.role]}
              </p>
              <ul className="space-y-0.5 text-[11px] leading-4 text-muted-foreground">
                {entry.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="ابحث عن عضو…"
            className="h-11 ps-9"
            aria-label="بحث عن عضو"
          />
        </div>

        {members.isLoading ? (
          <ListSkeleton rows={4} />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            لا يوجد أعضاء مسجّلون في هذه الغرفة بعد.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const name = row.profile?.display_name || row.profile?.username || "عضو";
              const isOwnerRow = row.role === "owner";
              return (
                <li
                  key={row.userId}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border bg-background/50 p-2.5"
                >
                  <UserAvatar
                    name={name}
                    src={row.profile?.avatar_url ?? null}
                    size="sm"
                    role={isOwnerRow ? "admin" : row.role === "moderator" ? "moderator" : null}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {ROLE_LABEL[row.role]}
                  </Badge>
                  {isOwnerRow || !permissions.canManageRoles ? null : (
                    <div className="flex w-full gap-2 sm:w-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant={row.role === "moderator" ? "default" : "outline"}
                        className="h-10 flex-1 rounded-xl text-xs sm:flex-none"
                        disabled={change.isPending || row.role === "moderator"}
                        onClick={() => change.mutate({ userId: row.userId, role: "moderator" })}
                      >
                        <ShieldCheck className="size-3.5" />
                        تعيين مشرف
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={row.role === "member" ? "default" : "outline"}
                        className="h-10 flex-1 rounded-xl text-xs sm:flex-none"
                        disabled={change.isPending || row.role === "member"}
                        onClick={() => change.mutate({ userId: row.userId, role: "member" })}
                      >
                        <User className="size-3.5" />
                        عضو
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
