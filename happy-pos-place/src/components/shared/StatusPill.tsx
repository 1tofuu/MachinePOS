import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const variants = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  destructive: "bg-destructive/15 text-destructive",
  info: "bg-primary/10 text-primary",
  muted: "bg-muted text-muted-foreground",
} as const;

export function StatusPill({
  variant = "muted",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
