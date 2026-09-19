/* One small system, exercised five ways — once per kind of double in
   Meszaros's taxonomy. https://endtoendtester.com/testing-levels/test-doubles */

export interface Message {
  to: string;
  subject: string;
  body: string;
}

export interface Mailer {
  send(message: Message): Promise<void>;
}

export interface Logger {
  info(message: string): void;
}

export interface Clock {
  now(): number;
}

export interface OrderRepository {
  find(reference: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

export interface Order {
  reference: string;
  email: string;
  amountCents: number;
  status: 'reserved' | 'shipped';
  shippedAt?: number;
}

export class Shipping {
  constructor(
    private readonly orders: OrderRepository,
    private readonly mailer: Mailer,
    private readonly clock: Clock,
    // Never used on this path. It exists because the constructor demands it,
    // which is exactly what a dummy is for.
    private readonly logger: Logger
  ) {}

  async ship(reference: string): Promise<Order> {
    const order = await this.orders.find(reference);
    if (!order) throw new Error(`no such order: ${reference}`);
    if (order.status === 'shipped') return order; // idempotent

    const shipped: Order = { ...order, status: 'shipped', shippedAt: this.clock.now() };
    await this.orders.save(shipped);
    await this.mailer.send({
      to: shipped.email,
      subject: `${shipped.reference} is on its way`,
      body: 'Your order has shipped.'
    });

    return shipped;
  }
}
