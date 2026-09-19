import { expect, test } from '@playwright/test';
import { newSession, seedCart } from '../../../support/api';

/* The journeys that would end the business if they broke — and nothing
   else. https://endtoendtester.com/testing-levels/end-to-end-testing */

test('a customer can buy a product and sees a confirmation @critical', async ({ page, request }, testInfo) => {
  const session = newSession(testInfo.workerIndex);

  // Arrange through the API: fast, reliable, and not what is under test.
  await page.goto('/');
  await page.evaluate((id) => sessionStorage.setItem('session', id), session);
  await seedCart(request, session, [{ slug: 'field-notes', quantity: 2 }]);

  // Act as a user, addressing things the way a user does.
  await page.goto('/checkout');
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay' }).click();

  // Assert the outcome the customer cares about...
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
  await expect(page.getByText(/we have emailed/i)).toBeVisible();

  // ...and the one the business cares about.
  const orderId = await page.getByTestId('order-id').innerText();
  const order = await request.get(`/api/orders/${orderId}`);
  expect(order.ok()).toBe(true);
  expect(await order.json()).toMatchObject({ subtotalCents: 2_400, shippingCents: 395, totalCents: 2_795 });
});

test('a large basket ships free @critical', async ({ page, request }, testInfo) => {
  const session = newSession(testInfo.workerIndex);
  await page.goto('/');
  await page.evaluate((id) => sessionStorage.setItem('session', id), session);
  await seedCart(request, session, [{ slug: 'standing-desk', quantity: 1 }]);

  await page.goto('/checkout');
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay' }).click();

  await expect(page.getByTestId('order-total')).toHaveText('£400.00');
});

test('a declined card is reported and leaves the basket intact', async ({ page, request }, testInfo) => {
  const session = newSession(testInfo.workerIndex);
  await page.goto('/');
  await page.evaluate((id) => sessionStorage.setItem('session', id), session);
  await seedCart(request, session, [{ slug: 'field-notes', quantity: 1 }]);

  await page.goto('/checkout');
  await page.getByLabel('Card number').fill('4000000000000002');
  await page.getByRole('button', { name: 'Pay' }).click();

  await expect(page.getByRole('alert')).toHaveText('Your card was declined.');
  // The basket survived, so the customer can try another card.
  const cart = await request.get(`/api/cart?session=${session}`);
  expect((await cart.json()).items).toBe(1);
});

test('an empty basket cannot be paid for', async ({ page }, testInfo) => {
  await page.goto('/checkout');
  await page.evaluate((id) => sessionStorage.setItem('session', id), newSession(testInfo.workerIndex));
  await page.reload();

  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay' }).click();

  await expect(page.getByRole('alert')).toContainText('empty');
});
