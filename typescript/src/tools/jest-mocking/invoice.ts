import { convert, fetchGbpRate } from './rates-client';

export async function totalInGbp(invoice: { usdCents: number }): Promise<number> {
  return convert(invoice.usdCents, await fetchGbpRate());
}
