import { Checkout, type ChargeRequest, type ChargeResult, type Clock, type InventoryRepository, type Order, type PaymentGateway } from './checkout';

/* https://endtoendtester.com/testing-levels/unit-testing-with-mocks
   Every collaborator is a double. The tests are precise and fast, and they
   know more about the implementation than the sociable versions do. */

const anOrder = (overrides: Partial<Order> = {}): Order => ({
  reference: 'ORD-1',
  sku: 'book-1',
  quantity: 2,
  cents: 4_000,
  ...overrides
});

const fixedClock: Clock = { now: () => Date.parse('2026-01-01T12:00:00Z') };

function gatewayReturning(result: ChargeResult) {
  return { charge: jest.fn<Promise<ChargeResult>, [ChargeRequest]>().mockResolvedValue(result) };
}

function inventoryThatReserves(ok: boolean): jest.Mocked<InventoryRepository> {
  return {
    reserve: jest.fn<Promise<boolean>, [string, number]>().mockResolvedValue(ok),
    release: jest.fn<Promise<void>, [string, number]>().mockResolvedValue(undefined)
  };
}

describe('Checkout', () => {
  it('charges once the stock is reserved', async () => {
    const gateway = gatewayReturning({ ok: true, paymentIntentId: 'pi_1' });
    const inventory = inventoryThatReserves(true);

    const outcome = await new Checkout(gateway, inventory, fixedClock).place(anOrder());

    expect(outcome).toEqual({ ok: true, paymentIntentId: 'pi_1' });
    expect(inventory.reserve).toHaveBeenCalledWith('book-1', 2);
  });

  /* Capture the argument and assert on it with ordinary matchers: the
     failure then names the field that was wrong, rather than saying
     "expected a call that never happened". */
  it('builds an idempotency key that is stable for the day', async () => {
    const gateway = gatewayReturning({ ok: true, paymentIntentId: 'pi_1' });

    await new Checkout(gateway, inventoryThatReserves(true), fixedClock).place(anOrder());

    const [request] = gateway.charge.mock.calls[0];
    expect(request.idempotencyKey).toBe('ORD-1-2026-01-01');
    expect(request.cents).toBe(4_000);
  });

  it('does not touch the gateway at all when stock cannot be reserved', async () => {
    const gateway = gatewayReturning({ ok: true, paymentIntentId: 'pi_1' });
    const inventory = inventoryThatReserves(false);

    const outcome = await new Checkout(gateway, inventory, fixedClock).place(anOrder());

    expect(outcome).toEqual({ ok: false, reason: 'out-of-stock' });
    expect(gateway.charge).not.toHaveBeenCalled();
    expect(inventory.release).not.toHaveBeenCalled();
  });

  /* The compensating action is the behaviour here, and it has no return
     value — so verifying the interaction is legitimate rather than lazy. */
  it('releases the reservation when the card is declined', async () => {
    const gateway = gatewayReturning({ ok: false, reason: 'card_declined' });
    const inventory = inventoryThatReserves(true);

    const outcome = await new Checkout(gateway, inventory, fixedClock).place(anOrder());

    expect(outcome).toEqual({ ok: false, reason: 'declined' });
    expect(inventory.release).toHaveBeenCalledWith('book-1', 2);
  });

  it('retries on the same day reuse the same key, the next day does not', async () => {
    const gateway = gatewayReturning({ ok: true, paymentIntentId: 'pi_1' });
    let day = Date.parse('2026-01-01T23:59:00Z');
    const movingClock: Clock = { now: () => day };
    const checkout = new Checkout(gateway, inventoryThatReserves(true), movingClock);

    await checkout.place(anOrder());
    day = Date.parse('2026-01-02T00:01:00Z');
    await checkout.place(anOrder());

    const keys = gateway.charge.mock.calls.map(([request]) => request.idempotencyKey);
    expect(keys).toEqual(['ORD-1-2026-01-01', 'ORD-1-2026-01-02']);
  });
});
