/** No 0/O, 1/I/L — codes get read aloud and typed by hand. 31 characters. */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 6;

// Bytes at or above this would make some characters likelier than others (256 isn't a multiple of 31).
const REJECT_AT_OR_ABOVE = 256 - (256 % INVITE_CODE_ALPHABET.length);

/**
 * Build a code from a source of random bytes. The caller supplies the bytes
 * (the service passes a cryptographically secure source) so this stays pure
 * and testable.
 */
export function generateInviteCode(
  randomBytes: (count: number) => Uint8Array,
  length: number = INVITE_CODE_LENGTH,
): string {
  let code = '';
  while (code.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte >= REJECT_AT_OR_ABOVE) continue;
      code += INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length];
      if (code.length === length) break;
    }
  }
  return code;
}

/** Forgive how people type codes: "abc-234" / "abc 234" → "ABC234". */
export function normalizeInviteCode(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}
