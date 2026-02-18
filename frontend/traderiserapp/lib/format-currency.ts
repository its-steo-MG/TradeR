// lib/format-currency.ts
export function formatCurrency(amount: string | number, decimals = 2): string {
  const num = typeof amount === "string" ? Number.parseFloat(amount) : amount

  if (isNaN(num)) return "0.00"

  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatCurrencyWithSymbol(amount: string | number, currency = "USD", decimals = 2): string {
  const formatted = formatCurrency(amount, decimals)
  const symbols: Record<string, string> = {
    USD: "$",
    KES: "KSh",
    EUR: "€",
    GBP: "£",
  }
  const symbol = symbols[currency] || currency
  return `${symbol}${formatted}`
}

// NEW: Safe price formatter for API strings
export const formatPrice = (price: string | number): string => {
  const num = typeof price === 'number' ? price : parseFloat(price);
  return isNaN(num) ? 'Price unavailable' : `$${num.toFixed(2)}`;
};

// NEW: Safe price parser
export const parsePrice = (price: string | number): number => {
  const num = typeof price === 'number' ? price : parseFloat(price);
  return isNaN(num) ? 0 : num;
};