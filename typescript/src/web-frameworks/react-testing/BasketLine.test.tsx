import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BasketLine } from './BasketLine';

/* Props in, DOM and callbacks out. No state inspection, no instance
   methods. https://endtoendtester.com/web-frameworks/react-testing */

const quantityBox = () => screen.getByRole('spinbutton', { name: 'Quantity' });

describe('BasketLine', () => {
  it('shows the line total for the quantity it was given', () => {
    render(<BasketLine sku="book-1" unitCents={1_200} quantity={2} />);

    expect(screen.getByTestId('line-total')).toHaveTextContent('£24.00');
  });

  it('recalculates the line total when the quantity changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<BasketLine sku="book-1" unitCents={1_200} quantity={1} onChange={onChange} />);

    await user.clear(quantityBox());
    await user.type(quantityBox(), '3');

    expect(await screen.findByText('£36.00')).toBeVisible();
    expect(onChange).toHaveBeenLastCalledWith({ sku: 'book-1', quantity: 3 });
  });

  it('announces a stock limit through a role a screen reader will read', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<BasketLine sku="book-1" unitCents={1_200} quantity={1} maxQuantity={10} onChange={onChange} />);

    await user.clear(quantityBox());
    await user.type(quantityBox(), '11');

    expect(await screen.findByRole('alert')).toHaveTextContent('Only 10 in stock');
    // Typing "11" passes through a perfectly valid "1", so the useful
    // assertion is that nothing over the limit was ever committed — not
    // that the callback was never reached.
    expect(onChange).toHaveBeenCalledWith({ sku: 'book-1', quantity: 1 });
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ quantity: 11 }));
    expect(screen.getByTestId('line-total')).toHaveTextContent('£12.00');
  });

  it('disables the add button once the maximum is reached', async () => {
    const user = userEvent.setup();
    render(<BasketLine sku="book-1" unitCents={1_200} quantity={9} maxQuantity={10} />);

    await user.click(screen.getByRole('button', { name: 'Add one' }));

    expect(screen.getByRole('button', { name: 'Add one' })).toBeDisabled();
    expect(screen.getByTestId('line-total')).toHaveTextContent('£120.00');
  });

  /* queryBy, not getBy, is the only way to assert something is absent —
     getBy throws when nothing matches. */
  it('shows no alert at all while the input is valid', () => {
    render(<BasketLine sku="book-1" unitCents={1_200} quantity={2} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refuses a quantity below one without calling back', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<BasketLine sku="book-1" unitCents={1_200} quantity={2} onChange={onChange} />);

    await user.clear(quantityBox());
    await user.type(quantityBox(), '0');

    expect(await screen.findByRole('alert')).toHaveTextContent('at least 1');
    expect(onChange).not.toHaveBeenCalled();
  });

  /* A half-typed value must not be rejected in a way that eats the
     keystroke — the total simply keeps its last committed value. */
  it('keeps the previous total while the box is momentarily empty', async () => {
    const user = userEvent.setup();
    render(<BasketLine sku="book-1" unitCents={1_200} quantity={2} />);

    await user.clear(quantityBox());

    expect(screen.getByTestId('line-total')).toHaveTextContent('£24.00');
    expect(screen.getByRole('alert')).toBeVisible();
  });
});
