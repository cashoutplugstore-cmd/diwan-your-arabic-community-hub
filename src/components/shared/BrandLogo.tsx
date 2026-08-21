import { MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, label = "ديوان" }: { className?: string; label?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
        <MessagesSquare className="size-5" aria-hidden />
      </span>
      <span className="truncate font-display text-lg font-extrabold tracking-tight">{label}</span>
    </span>
  );
}
