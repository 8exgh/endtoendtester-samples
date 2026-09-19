import { MoneyError, format, parseMinorUnits, splitEvenly } from './money';

/* Every branch, because this is money. `npm run coverage:critical` gates
   this one file at 100% and gates nothing else — which is the article's
   argument in a script. https://endtoendtester.com/coverage/code-coverage */

describe('parseMinorUnits', () => {
  it.each([
    ['12', 1_200],
    ['12.3', 1_230],
    ['12.34', 1_234],
    ['0.05', 5],
    ['-3.50', -350],
    ['  7.25  ', 725]
  ])('parses %j as %i', (input, expected) => {
    expect(parseMinorUnits(input)).toBe(expected);
  });

  it.each(['', 'twelve', '12.345', '1,200', '£12'])('rejects %j as not a valid amount', (input) => {
    expect(() => parseMinorUnits(input)).toThrow(MoneyError);
  });
});

describe('format', () => {
  it.each([
    [1_234, 'GBP', '£12.34'],
    [5, 'GBP', '£0.05'],
    [-350, 'GBP', '-£3.50'],
    [1_234, 'USD', '$12.34'],
    [1_234, 'JPY', '12.34']
  ])('formats %i %s as %s', (cents, currency, expected) => {
    expect(format(cents, currency)).toBe(expected);
  });

  it('defaults to sterling when no currency is given', () => {
    expect(format(100)).toBe('£1.00');
  });
});

describe('splitEvenly', () => {
  it('divides a clean amount into equal shares', () => {
    expect(splitEvenly(900, 3)).toEqual([300, 300, 300]);
  });

  /* The assertion that matters: the parts sum back to the whole, whatever
     the remainder does. */
  it.each([
    [1_000, 3],
    [1, 3],
    [999_999, 7],
    [0, 4]
  ])('splits %i into %i shares that sum back to the whole', (cents, ways) => {
    const shares = splitEvenly(cents, ways);

    expect(shares).toHaveLength(ways);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(cents);
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
  });

  it('refuses to split fewer than one way', () => {
    expect(() => splitEvenly(100, 0)).toThrow(MoneyError);
  });
});
