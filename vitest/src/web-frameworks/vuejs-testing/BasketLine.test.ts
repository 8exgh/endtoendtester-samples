import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import BasketLine from './BasketLine.vue';

/* The same component and the same assertions as the React sample, which is
   the point: a test written against roles and accessible names does not
   know which framework produced the DOM.
   https://endtoendtester.com/web-frameworks/vuejs-testing */

const quantityBox = () => screen.getByRole('spinbutton', { name: 'Quantity' });

describe('BasketLine', () => {
  it('shows the line total for the quantity it was given', () => {
    render(BasketLine, { props: { sku: 'book-1', unitCents: 1_200, quantity: 2 } });

    expect(screen.getByTestId('line-total')).toHaveTextContent('£24.00');
  });

  it('recalculates the line total when the quantity changes', async () => {
    const user = userEvent.setup();
    render(BasketLine, { props: { sku: 'book-1', unitCents: 1_200, quantity: 1 } });

    await user.clear(quantityBox());
    await user.type(quantityBox(), '3');

    expect(await screen.findByText('£36.00')).toBeVisible();
  });

  it('emits change with the committed quantity', async () => {
    const user = userEvent.setup();
    const { emitted } = render(BasketLine, { props: { sku: 'book-1', unitCents: 1_200, quantity: 1 } });

    await user.clear(quantityBox());
    await user.type(quantityBox(), '3');

    // Vue Test Utils' emitted() is the framework-specific surface worth
    // reaching for; everything else is the shared query API.
    expect(emitted().change.at(-1)).toEqual([{ sku: 'book-1', quantity: 3 }]);
  });

  it('announces a stock limit through a role a screen reader will read', async () => {
    const user = userEvent.setup();
    render(BasketLine, { props: { sku: 'book-1', unitCents: 1_200, quantity: 1, maxQuantity: 10 } });

    await user.clear(quantityBox());
    await user.type(quantityBox(), '11');

    expect(await screen.findByRole('alert')).toHaveTextContent('Only 10 in stock');
    expect(screen.getByTestId('line-total')).toHaveTextContent('£12.00');
  });

  it('disables the add button once the maximum is reached', async () => {
    const user = userEvent.setup();
    render(BasketLine, { props: { sku: 'book-1', unitCents: 1_200, quantity: 9, maxQuantity: 10 } });

    await user.click(screen.getByRole('button', { name: 'Add one' }));

    expect(screen.getByRole('button', { name: 'Add one' })).toBeDisabled();
  });

  it('shows no alert at all while the input is valid', () => {
    render(BasketLine, { props: { sku: 'book-1', unitCents: 1_200, quantity: 2 } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the previous total while the box is momentarily empty', async () => {
    const user = userEvent.setup();
    render(BasketLine, { props: { sku: 'book-1', unitCents: 1_200, quantity: 2 } });

    await user.clear(quantityBox());

    expect(screen.getByTestId('line-total')).toHaveTextContent('£24.00');
    expect(screen.getByRole('alert')).toBeVisible();
  });
});
