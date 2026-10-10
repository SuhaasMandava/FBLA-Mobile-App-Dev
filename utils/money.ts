/** Format integer cents as a currency string, e.g. 12345 → "$123.45". */
export function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}

/** Strip the "$", commas and spaces people naturally type: "$1,500.50" → "1500.50". */
export function normalizeDollarInput(raw: string): string {
  return raw.replace(/[$,\s]/g, '');
}

/**
 * Parse a normalized dollar string ("1500" or "1500.5") into integer cents,
 * or null if it isn't a plain amount with at most two decimals. Works on the
 * digits directly so there's no floating-point rounding (19.99 → 1999).
 */
export function parseDollarsToCents(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}
