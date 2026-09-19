/* The three dependencies people forget: the clock, randomness, and the
   environment. Each is one line to inject and untestable without it.
   https://endtoendtester.com/practices/dependency-injection */

export type Clock = () => number;
export type IdSource = () => string;

export const systemClock: Clock = () => Date.now();

export interface Token {
  id: string;
  subject: string;
  issuedAt: number;
  expiresAt: number;
}

export interface TokenOptions {
  ttlMs: number;
  clock?: Clock;
  newId?: IdSource;
}

export function issueToken(subject: string, options: TokenOptions): Token {
  const clock = options.clock ?? systemClock;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const issuedAt = clock();

  return { id: newId(), subject, issuedAt, expiresAt: issuedAt + options.ttlMs };
}

/** Expiry is inclusive: a token is dead at the instant it expires. */
export function isExpired(token: Token, now: Clock = systemClock): boolean {
  return token.expiresAt <= now();
}
