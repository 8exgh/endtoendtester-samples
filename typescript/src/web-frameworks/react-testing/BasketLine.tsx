import { useState } from 'react';

/* https://endtoendtester.com/web-frameworks/react-testing

   The raw input is held as a string and the committed quantity separately,
   which is how a controlled numeric input actually has to work: a half-typed
   value is not a number, and rejecting it must not fight the user's cursor. */

export interface BasketLineProps {
  sku: string;
  unitCents: number;
  quantity: number;
  maxQuantity?: number;
  onChange?: (change: { sku: string; quantity: number }) => void;
}

const money = (cents: number) => `£${(cents / 100).toFixed(2)}`;

function validate(raw: string, maxQuantity: number): string | null {
  const parsed = Number(raw);
  if (raw.trim() === '' || !Number.isInteger(parsed) || parsed < 1) {
    return 'Quantity must be at least 1';
  }
  if (parsed > maxQuantity) return `Only ${maxQuantity} in stock`;
  return null;
}

export function BasketLine({ sku, unitCents, quantity, maxQuantity = 10, onChange }: BasketLineProps) {
  const [raw, setRaw] = useState(String(quantity));
  const [committed, setCommitted] = useState(quantity);

  const error = validate(raw, maxQuantity);

  function enter(next: string) {
    setRaw(next);
    if (validate(next, maxQuantity) === null) {
      const parsed = Number(next);
      setCommitted(parsed);
      onChange?.({ sku, quantity: parsed });
    }
  }

  return (
    <div>
      <h3>{sku}</h3>
      <label htmlFor={`qty-${sku}`}>Quantity</label>
      <input
        id={`qty-${sku}`}
        type="number"
        value={raw}
        onChange={(event) => enter(event.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      <p data-testid="line-total">{money(unitCents * committed)}</p>
      <button type="button" onClick={() => enter(String(committed + 1))} disabled={committed >= maxQuantity}>
        Add one
      </button>
    </div>
  );
}
