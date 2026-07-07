/** Digits-only → Vietnamese-style thousands: 15000 → "15.000" */
export function formatAmountInput(value: string | number): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseAmountInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return NaN;
  return Number(digits);
}
