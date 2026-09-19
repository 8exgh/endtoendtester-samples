import { remote, type Browser } from 'webdriverio';

/* Appium, driving the same checkout journey the Playwright samples drive.
 * NOT run in CI: it needs a device or emulator and a running Appium server.
 * https://endtoendtester.com/tools/appium
 *
 *   npm i -D webdriverio appium appium-uiautomator2-driver appium-xcuitest-driver
 *   npx appium
 *   npx tsx reference/tools/appium/checkout.e2e.ts
 */

const ios = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:deviceName': 'iPhone 16',
  'appium:platformVersion': '18.0',
  'appium:app': process.env.IOS_APP ?? '/build/Shop.app'
};

const android = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': process.env.ANDROID_DEVICE ?? 'Pixel_8_API_35',
  'appium:app': process.env.ANDROID_APK ?? '/build/app-debug.apk',
  'appium:appWaitActivity': '*'
};

async function checkout(driver: Browser) {
  /* Accessibility ids are the whole game. `~pay` resolves to
     accessibilityIdentifier on iOS and content-desc on Android, so one
     locator covers both platforms — and adding them improves the app's
     actual accessibility, which is a rare case of a testability change
     with an independent user benefit. */
  await driver.$('~product-field-notes').click();
  await driver.$('~add-to-basket').click();

  await driver.$('~cart-badge').waitForDisplayed({ timeout: 10_000 });
  await driver.waitUntil(async () => (await driver.$('~cart-badge').getText()) === '1', {
    timeout: 5_000,
    timeoutMsg: 'the cart badge never reached 1'
  });

  await driver.$('~checkout').click();
  await driver.$('~card-number').setValue('4242424242424242');
  await driver.$('~pay').click();

  // Wait for a condition, never for a duration. The rule does not change
  // because the platform did.
  await driver.$('~order-confirmation').waitForDisplayed({ timeout: 15_000 });
}

async function main() {
  const platform = process.env.PLATFORM === 'ios' ? ios : android;
  const driver = await remote({ hostname: '127.0.0.1', port: 4723, capabilities: platform });

  try {
    await checkout(driver);
    console.log('checkout completed');
  } finally {
    await driver.deleteSession();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
