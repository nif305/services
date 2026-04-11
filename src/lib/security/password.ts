import crypto from 'crypto';

const HASH_PREFIX = 'pbkdf2_sha512';
const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${HASH_PREFIX}$${ITERATIONS}$${salt}$${hash}`;
}

export function isHashedPassword(value?: string | null) {
  return typeof value === 'string' && value.startsWith(`${HASH_PREFIX}$`);
}

export function verifyPassword(password: string, storedValue?: string | null) {
  if (!storedValue) return false;

  if (!isHashedPassword(storedValue)) {
    return safeEqual(password, String(storedValue));
  }

  const [, iterationsRaw, salt, expectedHash] = storedValue.split('$');
  const iterations = Number(iterationsRaw) || ITERATIONS;
  const actualHash = crypto
    .pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST)
    .toString('hex');

  return safeEqual(actualHash, expectedHash || '');
}
