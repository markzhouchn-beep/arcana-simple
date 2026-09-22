export function nanoid(size = 12) {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let id = ''; const bytes = crypto.getRandomValues(new Uint8Array(size));
  for (let i = 0; i < size; i++) id += alphabet[bytes[i] % 62];
  return id;
}
import crypto from 'crypto';