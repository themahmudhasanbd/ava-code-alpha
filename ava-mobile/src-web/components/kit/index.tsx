import { forwardRef, type ComponentProps, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/core/types";

/** Round glass icon button used in headers and toolbars. */
export const GlassIconButton = forwardRef<HTMLButtonElement, ComponentProps<typeof Button> & { label: string }>(
  ({ label, className, children, ...props }, ref) => (
    <Button ref={ref} variant="ghost" size="icon" aria-label={label} className={cn("glass rounded-xl", className)} {...props}>
      {children}
    </Button>
  ),
);
GlassIconButton.displayName = "GlassIconButton";

const statusStyle: Record<ConnectionStatus, string> = {
  online: "bg-success",
  connecting: "bg-warning animate-pulse",
  offline: "bg-destructive",
};

export function StatusDot({ status, className }: { status: ConnectionStatus; className?: string }) {
  return <span aria-label={status} className={cn("inline-block size-2 rounded-full", statusStyle[status], className)} />;
}

export function Surface({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("glass rounded-2xl", className)} {...props} />;
}

export function PageIntro({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <Surface className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 font-medium">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Surface>
  );
}

export function ListRow({ icon: Icon, title, subtitle, trailing, onClick }: { icon?: LucideIcon; title: string; subtitle?: string; trailing?: ReactNode; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent/60">
      {Icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="size-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {trailing}
    </Comp>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
