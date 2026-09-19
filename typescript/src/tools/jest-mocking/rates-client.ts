export async function fetchGbpRate(): Promise<number> {
  const response = await fetch('https://api.example.com/v1/rates?base=USD');
  if (!response.ok) throw new Error(`rates unavailable: ${response.status}`);
  const body = (await response.json()) as { rates: { GBP: number } };
  return body.rates.GBP;
}

export function convert(usdCents: number, rate: number): number {
  return Math.round(usdCents * rate);
}
