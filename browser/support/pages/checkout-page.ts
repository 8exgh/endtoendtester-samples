import { type Locator, type Page } from '@playwright/test';

export class CheckoutPage {
  readonly summary: Locator;
  readonly card: Locator;
  readonly pay: Locator;
  readonly confirmation: Locator;
  readonly orderId: Locator;
  readonly orderTotal: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.summary = page.getByTestId('summary');
    this.card = page.getByLabel('Card number');
    this.pay = page.getByRole('button', { name: 'Pay' });
    this.confirmation = page.getByRole('heading', { name: 'Order confirmed' });
    this.orderId = page.getByTestId('order-id');
    this.orderTotal = page.getByTestId('order-total');
    this.error = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/checkout');
  }

  async payWith(card: string) {
    await this.card.fill(card);
    await this.pay.click();
  }
}
