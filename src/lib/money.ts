export function formatSmallestUnit(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return "—";
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
  const major = isZeroDecimal ? amount : amount / 100;
  const fractionDigits = isZeroDecimal ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(major);
}

export function parseToSmallestUnit(input: string | number, currency: string): number {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Invalid amount");
  }
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
  const smallest = isZeroDecimal ? Math.round(n) : Math.round(n * 100);
  if (!Number.isInteger(smallest)) {
    throw new Error("Amount must be a whole number in the selected currency's smallest unit");
  }
  return smallest;
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);
