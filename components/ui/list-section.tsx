import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="toss-label">{eyebrow}</p> : null}
        <h1 className="toss-page-title mt-0.5">{title}</h1>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ListSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title ? (
        <h2 className="px-1 text-[13px] font-semibold text-muted-foreground">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

export function ListGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-card divide-y divide-border",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ListField({
  label,
  description,
  children,
  className,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2 px-4 py-3.5", className)}>
      <div>
        <p className="text-[15px] font-medium">{label}</p>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function ListRow({
  icon: Icon,
  iconClassName,
  iconColor,
  title,
  subtitle,
  href,
  onClick,
  trailing,
  destructive,
  className,
}: {
  icon?: LucideIcon;
  iconClassName?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      {Icon ? (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            !iconColor && "bg-secondary"
          )}
          style={
            iconColor
              ? {
                  backgroundColor: `color-mix(in srgb, ${iconColor} 16%, transparent)`,
                }
              : undefined
          }
        >
          <Icon
            className={cn("size-[18px]", !iconColor && "text-primary", iconClassName)}
            style={iconColor ? { color: iconColor } : undefined}
            strokeWidth={2}
          />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px] font-medium",
            destructive && "text-destructive"
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
        {trailing}
        {href || onClick ? (
          <ChevronRight className="size-4 opacity-60" aria-hidden />
        ) : null}
      </span>
    </>
  );

  const rowClass = cn(
    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
    (href || onClick) && "active:bg-secondary/60",
    className
  );

  if (onClick && trailing) {
    return (
      <div className={rowClass}>
        <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {Icon ? (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                !iconColor && "bg-secondary"
              )}
              style={
                iconColor
                  ? {
                      backgroundColor: `color-mix(in srgb, ${iconColor} 16%, transparent)`,
                    }
                  : undefined
              }
            >
              <Icon
                className={cn("size-[18px]", !iconColor && "text-primary", iconClassName)}
                style={iconColor ? { color: iconColor } : undefined}
                strokeWidth={2}
              />
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-[15px] font-medium",
                destructive && "text-destructive"
              )}
            >
              {title}
            </span>
            {subtitle ? (
              <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                {subtitle}
              </span>
            ) : null}
          </span>
        </button>
        <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
          {trailing}
          <ChevronRight className="size-4 opacity-60" aria-hidden />
        </span>
      </div>
    );
  }

  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {inner}
      </button>
    );
  }

  return <div className={rowClass}>{inner}</div>;
}

export function IconBox({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary",
        className
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-card px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
        <Icon className="size-6 text-muted-foreground" />
      </span>
      <p className="mt-4 text-[15px] font-semibold">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card px-4 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums tracking-tight",
          highlight && "text-primary"
        )}
      >
        {value}
      </p>
    </div>
  );
}
