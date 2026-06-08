// Password hashing (argon2id) + token generation/hashing primitives.
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export const hashPassword = (plain: string): Promise<string> => argonHash(plain);

export async function verifyPassword(stored: string, plain: string): Promise<boolean> {
  try {
    return await argonVerify(stored, plain);
  } catch {
    return false;
  }
}

/** URL-safe random secret token (the raw value handed to the user once). */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

/** Deterministic hash we store instead of the raw token. */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
