import XCTest

/// XCUITest against the iOS app.
///
/// NOT run in CI here: it needs macOS and Xcode, and a macOS runner costs
/// roughly ten times a Linux minute. That cost is the main constraint on
/// how much UI testing an iOS project can afford, and it is the strongest
/// argument for pushing logic down into unit tests.
///
/// https://endtoendtester.com/platforms/ios-app-testing
final class CheckoutUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        /* Launch arguments are how you inject state: the app reads them at
           startup and swaps in stubs. This is the iOS equivalent of
           arranging through the API rather than through the UI. */
        app.launchArguments = ["-uiTesting", "-seedBasket", "field-notes:2"]
        app.launch()
    }

    func test_paying_shows_a_confirmation() {
        app.textFields["card-number"].tap()
        app.textFields["card-number"].typeText("4242424242424242")

        app.buttons["pay"].tap()

        // XCUITest queries wait automatically up to the given timeout.
        XCTAssertTrue(app.staticTexts["order-confirmed"].waitForExistence(timeout: 10))
    }

    func test_a_declined_card_is_reported() {
        app.textFields["card-number"].tap()
        app.textFields["card-number"].typeText("4000000000000002")

        app.buttons["pay"].tap()

        XCTAssertTrue(app.staticTexts["card-declined"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["pay"].isEnabled, "the customer must be able to try another card")
    }

    /// Accessibility identifiers are what make this stable, and they make
    /// the same locators work through Appium:
    ///   view.accessibilityIdentifier = "pay"   // -> `~pay`
    func test_every_control_the_suite_drives_has_an_identifier() {
        for identifier in ["card-number", "pay", "basket-count"] {
            XCTAssertTrue(
                app.descendants(matching: .any)[identifier].exists,
                "\(identifier) has no accessibility identifier — neither a test nor VoiceOver can find it"
            )
        }
    }
}
