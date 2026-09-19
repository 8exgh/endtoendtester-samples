/* https://endtoendtester.com/tools/vitest */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function shippingCents(subtotalCents: number, tier: 'standard' | 'gold' = 'standard'): number {
  if (tier === 'gold' || subtotalCents >= 5_000) return 0;
  return 395;
}

/* In-source testing: charming for a small pure utility, and stripped from
   the production bundle by the `define` in vite.config.ts. Do not build a
   whole suite this way. */
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it('slugifies a title into a url-safe fragment', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('collapses runs of punctuation rather than leaving empty segments', () => {
    expect(slugify('C# and .NET  —  testing')).toBe('c-and-net-testing');
  });
}
