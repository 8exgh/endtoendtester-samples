import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BasketLineComponent } from './basket-line.component';

/* @testing-library/angular handles change detection, so the
   `fixture.detectChanges()` ceremony disappears and the test looks like
   its React and Vue equivalents — which is the point of a shared query
   API. https://endtoendtester.com/web-frameworks/angular-testing */

const quantityBox = () => screen.getByRole('spinbutton', { name: 'Quantity' });

describe('BasketLineComponent', () => {
  it('shows the line total for the quantity it starts with', async () => {
    await render(BasketLineComponent, { inputs: { sku: 'book-1', unitCents: 1_200 } });

    expect(screen.getByTestId('line-total')).toHaveTextContent('£12.00');
  });

  it('recalculates the line total when the quantity changes', async () => {
    const user = userEvent.setup();
    await render(BasketLineComponent, { inputs: { sku: 'book-1', unitCents: 1_200 } });

    await user.clear(quantityBox());
    await user.type(quantityBox(), '3');

    expect(await screen.findByText('£36.00')).toBeVisible();
  });

  it('announces a stock limit through a role a screen reader will read', async () => {
    const user = userEvent.setup();
    await render(BasketLineComponent, {
      inputs: { sku: 'book-1', unitCents: 1_200, maxQuantity: 10 }
    });

    await user.clear(quantityBox());
    await user.type(quantityBox(), '11');

    expect(await screen.findByRole('alert')).toHaveTextContent('Only 10 in stock');
  });

  it('emits change with the committed quantity', async () => {
    const user = userEvent.setup();
    const change = jest.fn();
    await render(BasketLineComponent, {
      inputs: { sku: 'book-1', unitCents: 1_200 },
      on: { change }
    });

    await user.clear(quantityBox());
    await user.type(quantityBox(), '4');

    expect(change).toHaveBeenLastCalledWith({ sku: 'book-1', quantity: 4 });
  });

  it('shows no alert at all while the input is valid', async () => {
    await render(BasketLineComponent, { inputs: { sku: 'book-1', unitCents: 1_200 } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the previous total while the box is momentarily empty', async () => {
    const user = userEvent.setup();
    await render(BasketLineComponent, { inputs: { sku: 'book-1', unitCents: 1_200 } });

    await user.clear(quantityBox());

    expect(screen.getByTestId('line-total')).toHaveTextContent('£12.00');
    expect(screen.getByRole('alert')).toBeVisible();
  });
});
