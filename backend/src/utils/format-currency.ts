// Convert rupees to paise when saving (e.g., ₹10.50 → 1050)
export function convertToPaise(amount: number): number {
  return Math.round(amount * 100);
}

// Convert paise to rupees when retrieving (e.g., 1050 → ₹10.50)
export function convertToRupees(amount: number): number {
  return amount / 100;
}

// Format number as Indian currency (e.g., 1234567.89 → ₹12,34,567.89)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
