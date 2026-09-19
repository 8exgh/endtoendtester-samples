import { type Locator, type Page } from '@playwright/test';

/* A page object in 2026: locators, not element handles. They are lazy and
   re-resolved on every use, so there is nothing to go stale and no waiting
   code to write. https://endtoendtester.com/practices/page-object-model */
export class ProductPage {
  readonly quantity: Locator;
  readonly addToCart: Locator;
  readonly cartStatus: Locator;
  readonly price: Locator;

  constructor(private readonly page: Page) {
    this.quantity = page.getByRole('spinbutton', { name: 'Quantity' });
    this.addToCart = page.getByRole('button', { name: 'Add to cart' });
    this.cartStatus = page.getByRole('status');
    this.price = page.getByTestId('price');
  }

  async goto(slug: string) {
    await this.page.goto(`/products/${slug}`);
  }

  /** One method per thing a user does, named in the user's words. */
  async addToBasket(quantity = 1) {
    await this.quantity.fill(String(quantity));
    await this.addToCart.click();
  }
}
