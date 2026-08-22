export function money(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return `$0.00`;
  return `$${amount.toFixed(2)}`;
}

export function calcStorePrice(vendorPrice: number): number {
  return Math.round(vendorPrice * 1.4 * 100) / 100;
}
