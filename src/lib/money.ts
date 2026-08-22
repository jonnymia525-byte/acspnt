export function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function calcStorePrice(vendorPrice: number): number {
  return Math.round(vendorPrice * 1.4 * 100) / 100;
}
