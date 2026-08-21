import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 shadow-elegant transition-all duration-300 hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
}
