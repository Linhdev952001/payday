"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker";

import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/time/format";
import { getJobBadgeStyle } from "@/lib/color/job-colors";
import { formatShiftBadgeLabel, type CalendarDayStats } from "@/components/calendar/calendar-utils";
import { MoneyText } from "@/components/ui/animated-money";
import { useT } from "@/contexts/i18n-context";
import type { Currency, PayConfigType, Shift } from "@/types";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  locale,
  formatters,
  components,
  dayStats,
  dayShifts,
  jobColors,
  jobPayTypes,
  currency = "KRW",
  variant = "default",
  weekStartsOn,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  dayStats?: Map<string, CalendarDayStats>
  dayShifts?: Map<string, Shift[]>
  jobColors?: Map<string, string>
  jobPayTypes?: Map<string, PayConfigType>
  currency?: Currency
  variant?: "default" | "work"
}) {
  const defaultClassNames = getDefaultClassNames();
  const isWork = variant === "work";

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar w-full max-w-full bg-background [--cell-radius:0] [--cell-size:3rem]",
        isWork ? "calendar-fill-height p-0" : "p-2",
        "in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-full max-w-full", isWork && "flex min-h-0 flex-1 flex-col", defaultClassNames.root),
        months: cn(
          "relative flex w-full max-w-none flex-col",
          isWork && "min-h-0 flex-1",
          defaultClassNames.months
        ),
        month: cn(
          "flex w-full max-w-none flex-col",
          isWork ? "min-h-0 flex-1 gap-0" : "gap-4",
          defaultClassNames.month
        ),
        nav: cn("hidden", defaultClassNames.nav),
        month_caption: cn("hidden", defaultClassNames.month_caption),
        month_grid: cn("w-full max-w-none", defaultClassNames.month_grid),
        weekdays: cn(
          "flex shrink-0",
          isWork && "bg-muted/20",
          isWork &&
            (weekStartsOn === 0
              ? "[&>th:first-child]:text-red-500 [&>th:last-child]:text-blue-600"
              : "[&>th:nth-child(6)]:text-blue-600 [&>th:last-child]:text-red-500"),
          defaultClassNames.weekdays
        ),
        weekday: cn(
          "flex-1 py-2 text-center text-[11px] font-medium text-muted-foreground select-none",
          defaultClassNames.weekday
        ),
        week: cn(
          "border-b border-border/50 last:border-b-0",
          defaultClassNames.week
        ),
        day: cn(
          "group/day relative min-w-0 p-0 text-center select-none",
          isWork && "w-auto flex-1 border-r border-border/50 last:border-r-0",
          defaultClassNames.day
        ),
        day_button: cn(
          isWork && "h-full min-h-0 w-full max-w-none rounded-none",
          defaultClassNames.day_button
        ),
        today: cn(
          isWork ? "" : "rounded-(--cell-radius) ",
          defaultClassNames.today
        ),
        outside: cn("text-muted-foreground/50", defaultClassNames.outside),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...rootProps }) => (
          <div
            data-slot="calendar"
            ref={rootRef}
            className={cn(isWork && "flex min-h-0 flex-1 flex-col", className)}
            {...rootProps}
          />
        ),
        Chevron: ({ className, orientation, ...chevronProps }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("size-4", className)} {...chevronProps} />;
          }
          if (orientation === "right") {
            return <ChevronRightIcon className={cn("size-4", className)} {...chevronProps} />;
          }
          return <ChevronDownIcon className={cn("size-4", className)} {...chevronProps} />;
        },
        DayButton: (dayProps) => (
          <CalendarDayButton
            locale={locale}
            dayStats={dayStats}
            dayShifts={dayShifts}
            jobColors={jobColors}
            jobPayTypes={jobPayTypes}
            currency={currency}
            variant={variant}
            {...dayProps}
          />
        ),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  dayStats,
  dayShifts,
  jobColors,
  jobPayTypes,
  currency = "KRW",
  variant = "default",
  ...props
}: React.ComponentProps<typeof DayButton> & {
  locale?: Partial<Locale>
  dayStats?: Map<string, CalendarDayStats>
  dayShifts?: Map<string, Shift[]>
  jobColors?: Map<string, string>
  jobPayTypes?: Map<string, PayConfigType>
  currency?: Currency
  variant?: "default" | "work"
}) {
  const defaultClassNames = getDefaultClassNames();
  const t = useT();
  const dateKey = format(day.date, "yyyy-MM-dd");
  const stats = dayStats?.get(dateKey);
  const shifts = dayShifts?.get(dateKey) ?? [];
  const hasWork = shifts.length > 0;
  const isWork = variant === "work";
  const isSelected =
    modifiers.selected &&
    !modifiers.range_start &&
    !modifiers.range_end &&
    !modifiers.range_middle;

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  if (isWork) {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        data-day={day.date.toLocaleDateString(locale?.code)}
        data-selected-single={isSelected}
        className={cn(
          "relative flex h-full min-h-0 w-full min-w-0 flex-col items-stretch justify-start gap-0 rounded-none border-0 px-0.5 py-1 text-left font-normal hover:bg-muted/30",
          modifiers.outside && "opacity-50",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "text-xs leading-none",
            modifiers.outside ? "text-muted-foreground" : "text-foreground",
            modifiers.today && "font-bold text-primary"
          )}
        >
          {day.date.getDate()}
        </span>

        {hasWork && (
          <div className="mt-1 flex w-full flex-col gap-0.5">
            {shifts.map((shift) => (
              <span
                key={shift.id}
                className="w-full truncate rounded-full px-1 py-0.5 text-center text-[9px] leading-tight font-semibold"
                style={getJobBadgeStyle(jobColors?.get(shift.jobId) ?? "")}
                title={formatShiftBadgeLabel(shift, jobPayTypes?.get(shift.jobId), t)}
              >
                {formatShiftBadgeLabel(shift, jobPayTypes?.get(shift.jobId), t)}
              </span>
            ))}
          </div>
        )}

        {stats && stats.earned > 0 && (
          <span className="mt-auto pt-1 text-right leading-none text-muted-foreground/75">
            <MoneyText
              value={stats.earned}
              currency={currency}
              compact
              amountClassName="text-[9px] font-medium text-muted-foreground/90"
              unitClassName="text-[7px] text-muted-foreground/60"
            />
          </span>
        )}
      </Button>
    );
  }

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-selected-single={isSelected}
      className={cn(
        "relative flex h-auto w-full min-w-0 flex-col items-center justify-center gap-0.5 border-0 px-0 py-1 leading-none font-normal",
        isSelected && "bg-primary text-primary-foreground",
        defaultClassNames.day,
        className
      )}
      {...props}
    >
      <span className="text-xs font-medium leading-none sm:text-sm">{day.date.getDate()}</span>
      {hasWork && stats && (
        <span className="text-[9px] text-muted-foreground">
          {formatDuration(stats.minutes)}
        </span>
      )}
    </Button>
  );
}

export { Calendar, CalendarDayButton };
