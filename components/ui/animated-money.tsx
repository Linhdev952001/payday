"use client";

import { useEffect, useState } from "react";
import { useSpring, useMotionValueEvent } from "framer-motion";
import { useT } from "@/contexts/i18n-context";
import { formatMoneyAmount, getMoneyUnit } from "@/lib/pay/format-money";
import type { Currency } from "@/types";
import { cn } from "@/lib/utils";

const ANIM_STEPS = 10;

/** ponytail: animate only the last ~10 ticks, not 0 → value */
function animFrom(value: number): number {
  if (value <= ANIM_STEPS) return 0;
  const step = Math.max(
    1,
    Math.pow(10, Math.max(0, Math.floor(Math.log10(value)) - 2))
  );
  return Math.max(0, value - step * (ANIM_STEPS - 1));
}

type AnimatedMoneyProps = {
  value: number;
  currency: Currency;
  className?: string;
  amountClassName?: string;
  unitClassName?: string;
  compact?: boolean;
};

export function AnimatedMoney({
  value,
  currency,
  className,
  amountClassName,
  unitClassName,
  compact = false,
}: AnimatedMoneyProps) {
  const t = useT();
  const spring = useSpring(animFrom(value), { stiffness: 220, damping: 32, mass: 0.5 });
  const [display, setDisplay] = useState(() => animFrom(value));

  useEffect(() => {
    spring.jump(animFrom(value));
    spring.set(value);
  }, [value, spring]);

  useMotionValueEvent(spring, "change", (v) => {
    setDisplay(Math.round(v));
  });

  const unit = getMoneyUnit(currency, t);

  return (
    <span className={cn("inline-flex items-baseline gap-0.5 tabular-nums", className)}>
      <span className={cn("money-count-up", amountClassName)}>
        {formatMoneyAmount(display, currency)}
      </span>
      <span
        className={cn(
          "font-semibold text-primary/75",
          compact ? "text-[8px]" : "text-[0.72em]",
          unitClassName
        )}
      >
        {unit}
      </span>
    </span>
  );
}

export function MoneyText({
  value,
  currency,
  className,
  amountClassName,
  unitClassName,
  compact = false,
}: Omit<AnimatedMoneyProps, "value"> & { value: number }) {
  const t = useT();
  const unit = getMoneyUnit(currency, t);

  return (
    <span className={cn("inline-flex items-baseline gap-0.5 tabular-nums", className)}>
      <span className={amountClassName}>{formatMoneyAmount(value, currency)}</span>
      <span
        className={cn(
          "font-semibold text-primary/75",
          compact ? "text-[8px]" : "text-[0.72em]",
          unitClassName
        )}
      >
        {unit}
      </span>
    </span>
  );
}
