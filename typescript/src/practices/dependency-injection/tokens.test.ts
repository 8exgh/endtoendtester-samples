import { isExpired, issueToken, type Clock } from './tokens';

/* https://endtoendtester.com/practices/dependency-injection */

const AT = Date.parse('2026-01-01T12:00:00Z');
const at = (iso: string): Clock => () => Date.parse(iso);

describe('issueToken', () => {
  it('is completely deterministic once the clock and ids are injected', () => {
    const token = issueToken('alice', {
      ttlMs: 3_600_000,
      clock: () => AT,
      newId: () => 'token-1'
    });

    expect(token).toEqual({
      id: 'token-1',
      subject: 'alice',
      issuedAt: AT,
      expiresAt: AT + 3_600_000
    });
  });
});

describe('isExpired', () => {
  const token = issueToken('alice', { ttlMs: 3_600_000, clock: () => AT, newId: () => 't' });

  /* The instant of expiry is the case that decides whether the comparison
     is `<` or `<=`, and it is unreachable without an injected clock. */
  it('is expired at exactly the expiry instant', () => {
    expect(isExpired(token, at('2026-01-01T13:00:00Z'))).toBe(true);
  });

  it('is alive one millisecond earlier', () => {
    expect(isExpired(token, () => AT + 3_599_999)).toBe(false);
  });

  /* The tests that quietly break at midnight, on a month end, or twice a
     year — none of which a real clock lets you write. */
  it.each([
    ['midnight', '2026-01-02T00:00:00Z', true],
    ['a month end', '2026-01-31T23:59:59Z', true],
    ['a leap day', '2028-02-29T12:00:00Z', true],
    ['a DST transition', '2026-03-29T01:30:00Z', true]
  ])('is still decidable at %s', (_name, iso, expected) => {
    expect(isExpired(token, at(iso))).toBe(expected);
  });
});
