import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Props = {
  name?: string | null | undefined;
  src?: string | null | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  status?: string | null | undefined;
  className?: string | undefined;
};

const sizes = { sm: "size-8", md: "size-10", lg: "size-16" };

export function UserAvatar({ name, src, size = "md", status, className }: Props) {
  const initials = (name ?? "?").trim().slice(0, 2).toUpperCase();
  return (
    <div className={cn("relative shrink-0", className)}>
      <Avatar className={cn(sizes[size], "ring-2 ring-border")}>
        {src ? <AvatarImage src={src} alt={name ?? ""} /> : null}
        <AvatarFallback className="bg-secondary text-secondary-foreground font-display text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      {status ? (
        <span
          aria-label={status}
          className={cn(
            "absolute -bottom-0.5 -end-0.5 size-3 rounded-full border-2 border-background",
            status === "online" ? "bg-success" : "bg-muted-foreground",
          )}
        />
      ) : null}
    </div>
  );
}