const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatUsd(value: number | null | undefined) {
  return usdFormatter.format(value ?? 0);
}

export function formatYear(value: string | null | undefined) {
  if (!value) return String(new Date().getFullYear());
  return String(new Date(value).getFullYear());
}
