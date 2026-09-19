import { expect, test } from '@playwright/test';
import { CheckoutPage } from '../../support/pages/checkout-page';
import { ProductPage } from '../../support/pages/product-page';

/* The test talks about what the user is doing; one file knows where the
   buttons are. https://endtoendtester.com/practices/page-object-model */

test('a customer adds two items and pays for them', async ({ page }) => {
  const product = new ProductPage(page);
  const checkout = new CheckoutPage(page);

  // No session juggling: every test gets its own browser context, so the
  // app's own sessionStorage is already isolated from every other test.
  await product.goto('field-notes');
  await product.addToBasket(2);

  await expect(product.cartStatus).toHaveText('2 items in cart');

  await checkout.goto();
  await checkout.payWith('4242424242424242');

  await expect(checkout.confirmation).toBeVisible();
  await expect(checkout.orderTotal).toHaveText('£27.95');
});

test('a declined card surfaces through the page object too', async ({ page }) => {
  const product = new ProductPage(page);
  const checkout = new CheckoutPage(page);

  await product.goto('blackwing');
  await product.addToBasket(1);
  await checkout.goto();

  await checkout.payWith('4000000000000002');

  await expect(checkout.error).toHaveText('Your card was declined.');
});

test('the page object exposes the price without the test knowing the markup', async ({ page }) => {
  const product = new ProductPage(page);

  await product.goto('standing-desk');

  await expect(product.price).toHaveText('£400.00');
});
