/** Format integer cents as a currency string, e.g. 12345 → "$123.45". */
export function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}
