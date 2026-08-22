import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { count?: number; onClick: () => void };

export function RoomHeaderMembersButton({ count, onClick }: Props) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold" aria-label="عرض أعضاء الغرفة">
      <Users className="size-4" />
      <span>الأعضاء</span>
      {typeof count === "number" ? <span className="rounded-full bg-secondary px-1.5 text-[10px] leading-4">{count}</span> : null}
    </Button>
  );
}
