/* Money handling: the kind of module where a coverage gate is worth having,
   as opposed to a project-wide percentage that produces tests written to
   move a number. https://endtoendtester.com/coverage/code-coverage */

export class MoneyError extends Error {}

export function parseMinorUnits(input: string): number {
  const match = /^-?\d+(\.\d{1,2})?$/.exec(input.trim());
  if (!match) throw new MoneyError(`not an amount: ${input}`);

  const [whole, fraction = ''] = input.trim().split('.');
  const sign = whole.startsWith('-') ? -1 : 1;
  const major = Math.abs(Number(whole));
  const minor = Number(fraction.padEnd(2, '0'));

  return sign * (major * 100 + minor);
}

export function format(cents: number, currency = 'GBP'): string {
  const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '';
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${symbol}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export function splitEvenly(cents: number, ways: number): number[] {
  if (ways < 1) throw new MoneyError('cannot split fewer than one way');
  const base = Math.floor(cents / ways);
  const remainder = cents - base * ways;
  // The remainder goes to the earliest shares, so the parts always sum back
  // to the whole. Losing a penny here is the classic money bug.
  return Array.from({ length: ways }, (_, i) => base + (i < remainder ? 1 : 0));
}
