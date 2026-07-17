import * as React from "react";
import { cn } from "@/lib/utils";
type BadgeVariant = "default" | "secondary" | "outline";
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> { variant?: BadgeVariant }

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn("m3-badge", `m3-badge--${variant ?? "secondary"}`, className)} {...props} />;
}

const badgeVariants = ({ className }: { className?: string } = {}) => cn("m3-badge", className);
export { Badge, badgeVariants };
