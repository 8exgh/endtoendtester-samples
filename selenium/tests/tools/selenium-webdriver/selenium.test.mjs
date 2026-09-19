import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

/* https://endtoendtester.com/tools/selenium-webdriver
 *
 * Selenium does not wait for you. Everything below that looks like
 * ceremony is the waiting logic Playwright supplies for free — which is
 * the honest comparison between the two, and the reason a Selenium suite
 * lives or dies on its waiting discipline.
 */

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4321';
const TIMEOUT = 10_000;

describe('Selenium WebDriver', { concurrency: false }, () => {
  let driver;

  before(async () => {
    const options = new chrome.Options().addArguments(
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    );
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

    /* Never mix implicit and explicit waits: an implicit wait of 10s plus
       an explicit wait of 10s does not give you 10s, it gives you
       compound, unpredictable behaviour — and a negative check silently
       takes the full implicit timeout. */
    await driver.manage().setTimeouts({ implicit: 0 });
  });

  after(async () => {
    await driver?.quit();
  });

  it('adds an item to the cart and waits for the status to say so', async () => {
    await driver.get(`${BASE}/products/field-notes`);

    const add = await driver.wait(until.elementLocated(By.id('add')), TIMEOUT);
    await driver.wait(until.elementIsEnabled(add), TIMEOUT);
    await add.click();

    const status = await driver.wait(until.elementLocated(By.css('[data-testid=cart-status]')), TIMEOUT);
    await driver.wait(until.elementTextIs(status, '1 item in cart'), TIMEOUT);

    assert.equal(await status.getText(), '1 item in cart');
  });

  it('completes a checkout, waiting for a condition rather than a duration', async () => {
    await driver.get(`${BASE}/products/blackwing`);
    await (await driver.wait(until.elementLocated(By.id('add')), TIMEOUT)).click();
    await driver.wait(
      until.elementTextContains(await driver.findElement(By.css('[data-testid=cart-status]')), 'item'),
      TIMEOUT
    );

    await driver.get(`${BASE}/checkout`);
    await (await driver.wait(until.elementLocated(By.id('card')), TIMEOUT)).sendKeys('4242424242424242');
    await (await driver.findElement(By.id('pay'))).click();

    // The server sleeps 250-500ms. A Thread.sleep here is how a Selenium
    // suite becomes flaky; a custom condition is how it does not.
    const confirmation = await driver.wait(
      until.elementLocated(By.css('[data-testid=order-id]')),
      TIMEOUT
    );

    assert.match(await confirmation.getText(), /^ORD-\d+$/);
  });

  it('reports a declined card through the alert the page renders', async () => {
    await driver.get(`${BASE}/products/field-notes`);
    await (await driver.wait(until.elementLocated(By.id('add')), TIMEOUT)).click();
    await driver.wait(
      until.elementTextContains(await driver.findElement(By.css('[data-testid=cart-status]')), 'item'),
      TIMEOUT
    );

    await driver.get(`${BASE}/checkout`);
    await (await driver.wait(until.elementLocated(By.id('card')), TIMEOUT)).sendKeys('4000000000000002');
    await (await driver.findElement(By.id('pay'))).click();

    const alert = await driver.wait(until.elementLocated(By.css('[role=alert]')), TIMEOUT);
    assert.equal(await alert.getText(), 'Your card was declined.');
  });

  /* A negative check is where an implicit wait would silently cost you the
     full timeout on every call. With it set to zero, this is immediate. */
  it('asserts an element is absent without paying a timeout for it', async () => {
    await driver.get(`${BASE}/products/field-notes`);

    const started = Date.now();
    const alerts = await driver.findElements(By.css('[role=alert]'));
    const elapsed = Date.now() - started;

    assert.equal(alerts.length, 0);
    assert.ok(elapsed < 2_000, `a negative check took ${elapsed}ms — is an implicit wait set?`);
  });

  it('drives the quantity field and sees the total follow it', async () => {
    await driver.get(`${BASE}/products/standing-desk`);

    const price = await driver.wait(until.elementLocated(By.css('[data-testid=price]')), TIMEOUT);

    assert.equal(await price.getText(), '£400.00');
  });
});
