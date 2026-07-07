"use client";

import { Input } from "@/components/ui/input";
import { formatAmountInput } from "@/lib/pay/amount-input";
import { cn } from "@/lib/utils";

type MoneyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function MoneyInput({ value, onChange, className, ...props }: MoneyInputProps) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(formatAmountInput(e.target.value))}
      className={cn(className)}
      {...props}
    />
  );
}
