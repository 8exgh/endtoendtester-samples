package reference.android

import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import org.junit.Rule
import org.junit.Test

/**
 * Compose UI tests against the Android app.
 *
 * NOT run in CI here: it needs the Android SDK and an emulator, which is a
 * ten-minute job on a hosted runner. The local half of an Android suite —
 * view models, coroutines, Robolectric — runs on the JVM with no emulator
 * at all, and that is where most of the tests should be.
 *
 * https://endtoendtester.com/platforms/android-app-testing
 */
class CheckoutTest {

    @get:Rule
    val compose = createComposeRule()

    @Test
    fun `pay is disabled until a card is entered`() {
        compose.setContent { CheckoutScreen(state = CheckoutState.Empty) }

        compose.onNodeWithText("Pay").assertIsNotEnabled()

        /* The semantics tree is the same tree that drives accessibility, so
           onNodeWithContentDescription is testing what a TalkBack user
           experiences — the same argument as querying by role on the web. */
        compose.onNodeWithContentDescription("Card number").performTextInput("4242424242424242")

        compose.onNodeWithText("Pay").assertIsEnabled()
    }

    @Test
    fun `paying shows a confirmation`() {
        compose.setContent { CheckoutScreen(state = CheckoutState.Ready) }

        compose.onNodeWithContentDescription("Card number").performTextInput("4242424242424242")
        compose.onNodeWithText("Pay").performClick()

        // The rule synchronises with recomposition automatically; waitUntil
        // is for work it cannot see, such as a background coroutine.
        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithTag("confirmation").fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithTag("confirmation").assertTextEquals("Order confirmed")
    }
}
