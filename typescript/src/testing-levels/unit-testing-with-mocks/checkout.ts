/* The solitarist setup: every collaborator is an interface, so every one of
   them can be replaced. https://endtoendtester.com/testing-levels/unit-testing-with-mocks */

export interface ChargeRequest {
  cents: number;
  reference: string;
  idempotencyKey: string;
}

export interface ChargeResult {
  ok: boolean;
  paymentIntentId?: string;
  reason?: string;
}

export interface PaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

export interface InventoryRepository {
  reserve(sku: string, quantity: number): Promise<boolean>;
  release(sku: string, quantity: number): Promise<void>;
}

export interface Clock {
  now(): number;
}

export interface Order {
  reference: string;
  sku: string;
  quantity: number;
  cents: number;
}

export type Outcome =
  | { ok: true; paymentIntentId: string }
  | { ok: false; reason: 'out-of-stock' | 'declined' };

export class Checkout {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly inventory: InventoryRepository,
    private readonly clock: Clock
  ) {}

  async place(order: Order): Promise<Outcome> {
    const reserved = await this.inventory.reserve(order.sku, order.quantity);
    if (!reserved) return { ok: false, reason: 'out-of-stock' };

    const charge = await this.gateway.charge({
      cents: order.cents,
      reference: order.reference,
      // Deterministic per order per day: a retry on the same day must not
      // charge twice, which is why the clock is injected rather than read.
      idempotencyKey: `${order.reference}-${new Date(this.clock.now()).toISOString().slice(0, 10)}`
    });

    if (!charge.ok) {
      // The compensating action. Nothing else in the system will do it.
      await this.inventory.release(order.sku, order.quantity);
      return { ok: false, reason: 'declined' };
    }

    return { ok: true, paymentIntentId: charge.paymentIntentId! };
  }
}
